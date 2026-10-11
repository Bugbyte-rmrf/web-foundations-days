const API_URL = "https://jsonplaceholder.typicode.com/users";

const loadButton = document.querySelector("#load-users");
const filterInput = document.querySelector("#filter-input");
const statusText = document.querySelector("#status");
const usersList = document.querySelector("#users-list");

// Store all fetched users here so filtering does not need another request.
let allUsers = [];

// Create and display one user's information.
function displayUser(user) {
  const li = document.createElement("li");

  const name = document.createElement("h2");
  name.textContent = user.name;

  const email = document.createElement("p");
  email.textContent = `Email: ${user.email}`;

  const city = document.createElement("p");
  city.textContent = `City: ${user.address.city}`;

  const company = document.createElement("p");
  company.textContent = `Company: ${user.company.name}`;

  li.appendChild(name);
  li.appendChild(email);
  li.appendChild(city);
  li.appendChild(company);

  usersList.appendChild(li);
}

// Display users whose names match the current filter.
function renderUsers() {
  const searchText = filterInput.value.trim().toLowerCase();

  const filteredUsers = allUsers.filter((user) =>
    user.name.toLowerCase().includes(searchText)
  );

  usersList.replaceChildren();

  filteredUsers.forEach(displayUser);

  if (allUsers.length > 0) {
    if (filteredUsers.length === 0) {
      statusText.textContent = "No users match your search.";
    } else {
      statusText.textContent =
        `Showing ${filteredUsers.length} of ${allUsers.length} users.`;
    }
  }
}

// Fetch users from the API.
async function loadUsers() {
  loadButton.disabled = true;
  statusText.textContent = "Loading users...";
  usersList.replaceChildren();
  allUsers = [];

  try {
    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const users = await response.json();

    allUsers = users;
    renderUsers();

    if (allUsers.length === 0) {
      statusText.textContent = "No users were found.";
    } else {
      statusText.textContent = `Loaded ${allUsers.length} users.`;
    }
  } catch (error) {
    statusText.textContent =
      "Could not load users. Please check your connection and try again.";

    console.error("Error loading users:", error);
  } finally {
    loadButton.disabled = false;
  }
}

// Load users when the button is clicked.
loadButton.addEventListener("click", loadUsers);

// Filter the already-loaded users whenever the input changes.
filterInput.addEventListener("input", () => {
  if (allUsers.length > 0) {
    renderUsers();
  }
});
