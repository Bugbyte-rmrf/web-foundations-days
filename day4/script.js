console.log("Day 4 JavaScript is running!");
console.log("Textarea:", document.querySelector("#note-text"));
console.log("Character counter:", document.querySelector("#char-count"));
console.log("Word counter:", document.querySelector("#word-count"));
console.log("Clear button:", document.querySelector("#clear-btn"));
console.log("Theme button:", document.querySelector("#theme-toggle"));

// 1. Select the HTML elements
const noteText = document.querySelector("#note-text");
const charCount = document.querySelector("#char-count");
const wordCount = document.querySelector("#word-count");
const clearBtn = document.querySelector("#clear-btn");
const themeToggle = document.querySelector("#theme-toggle");

// 2. Define the localStorage keys
const DRAFT_KEY = "day4-draft";
const THEME_KEY = "day4-theme";

// 3. Update the character and word counters
function updateCounts() {
  const text = noteText.value;
  const characters = text.length;

  // Count words, ignoring extra spaces and empty text
  const trimmedText = text.trim();
  const words = trimmedText === ""
    ? 0
    : trimmedText.split(/\s+/).length;

  // Update the displayed counters
  charCount.textContent = `${characters} / 200 characters`;
  wordCount.textContent = `${words} words`;

  // Remove old warning classes
  charCount.classList.remove("warning", "over");

  // Apply the appropriate warning class
  if (characters > 200) {
    charCount.classList.add("over");
  } else if (characters > 180) {
    charCount.classList.add("warning");
  }
}

// 4. Save the draft to localStorage
function saveDraft() {
  localStorage.setItem(DRAFT_KEY, noteText.value);
}

// 5. Clear the text, counters and saved draft
function clearNote() {
  noteText.value = "";

  updateCounts();

  localStorage.removeItem(DRAFT_KEY);

  noteText.focus();
}

// 6. Update counters and save whenever the user types
noteText.addEventListener("input", () => {
  updateCounts();
  saveDraft();
});

// 7. Clear the note when the Clear button is clicked
clearBtn.addEventListener("click", clearNote);

// 8. Clear the note when Escape is pressed
noteText.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    clearNote();
  }
});

// 9. Apply the theme and update the button label
function applyTheme(isDark) {
  document.body.classList.toggle("dark", isDark);

  themeToggle.textContent = isDark
    ? "Light mode"
    : "Dark mode";
}

// 10. Toggle the theme and save the choice
themeToggle.addEventListener("click", () => {
  const isDark = !document.body.classList.contains("dark");

  applyTheme(isDark);

  localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
});

// 11. Restore the saved draft and theme on page load
const savedDraft = localStorage.getItem(DRAFT_KEY);

if (savedDraft !== null) {
  noteText.value = savedDraft;
}

const savedTheme = localStorage.getItem(THEME_KEY);
const isDark = savedTheme === "dark";

applyTheme(isDark);

// 12. Set the correct counters for the restored text
updateCounts();

