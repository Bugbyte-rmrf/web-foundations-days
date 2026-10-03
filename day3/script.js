let notes = [
  { id: 1, text: "Buy milk and bread", category: "personal" },
  { id: 2, text: "Finish the Day 3 assignment", category: "study" },
  { id: 3, text: "Email the project report to Grace", category: "work" },
  { id: 4, text: "Revise JavaScript arrays", category: "study" },
  { id: 5, text: "Call mum", category: "personal" },
];

// 1. searchNotes()
function searchNotes(word) {
  return notes.filter((note) => {
     return note.text.toLowerCase().includes(word.toLowerCase());
  });
}

console.log(searchNotes("javascript"));
// Expected: [{ id: 4, text: "Revise JavaScript arrays", category: "study" }]

console.log(searchNotes("pizza"));
// Expected: []

// 2. longestNote()
function longestNote() {
  if (notes.length === 0) {
    return null;
  }

  let longest = notes[0];

  for (const note of notes) {
    if (note.text.length > longest.text.length) {
      longest = note;
    }
  }

  return longest;
}

console.log(longestNote());
// Expected: { id: 3, text: "Email the project report to Grace", category: "work" }

const savedNotesForLongest = notes;
notes = [];

console.log(longestNote());
// Expected: null

notes = savedNotesForLongest;

// 3. countByCategory()
function countByCategory() {
  const counts = {};

  for (const note of notes) {
    if (counts[note.category]) {
      counts[note.category]++;
    } else {
      counts[note.category] = 1;
    }
  }

  return counts;
}

console.log(countByCategory());
// Expected: { personal: 2, study: 2, work: 1 }

// 4. getSummary()
function getSummary() {
  const counts = countByCategory();

  const noteWord = notes.length === 1 ? "note" : "notes";

  return `${notes.length} ${noteWord}: ${counts.personal || 0} personal, ${counts.work || 0} work, ${counts.study || 0} study.`;
}

console.log(getSummary());
// Expected: "5 notes: 2 personal, 1 work, 2 study."

const savedNotesForSummary = notes;
notes = [savedNotesForSummary[0]];

console.log(getSummary());
// Expected: "1 note: 1 personal, 0 work, 0 study."

notes = savedNotesForSummary;


// 5. isDuplicate()
function isDuplicate(text) {
  return notes.some((note) => {
    return note.text.trim().toLowerCase() === text.trim().toLowerCase();
  });
}

console.log(isDuplicate("Buy milk and bread"));
// Expected: true

console.log(isDuplicate("  BUY MILK AND BREAD  "));
// Expected: true

// 6. addNote()
function addNote(text, category) {
    if (text.length < 1 || text.length > 200) {
    console.log("Note text must be between 1 and 200 characters.");
    return false;
  }

if (isDuplicate(text)) {
    console.log("This note is a duplicate.");
    return false;
  }


const validCategories = ["personal", "work", "study"];

if (!validCategories.includes(category)) {
  console.log("Invalid category.");
  return false;
}

const newNote = {
  id: notes.length > 0 ? Math.max(...notes.map(note => note.id)) + 1 : 1,
  text: text,
  category: category
};

notes.push(newNote);

console.log("Note added successfully.");
return true;
}


console.log(addNote("Plan weekend trip", "personal"));
// Expected: true

console.log(addNote("  PLAN WEEKEND TRIP  ", "personal"));
// Expected: false

const savedNotesForIdTest = notes;
















