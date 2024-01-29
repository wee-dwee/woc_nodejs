// Import the random-word-slugs package
const randomWordSlugs = require('random-word-slugs');

// Function to generate a random word
function generateRandomWord() {
  // Generate a random word slug
  const slug = randomWordSlugs.generateSlug(1, { format: "title" ,partsOfSpeech: ["noun"]});
  console.log(slug);
}

// Generate and print a random word
console.log(generateRandomWord());
