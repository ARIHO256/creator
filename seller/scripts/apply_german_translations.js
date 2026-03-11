const fs = require('fs');
const path = require('path');

/**
 * This script applies German translations to the dictionary.
 * It can read from a translated JSON file or use inline translations.
 */

function extractDictionary(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const dictionary = {};
  
  const keyValuePattern = /"((?:[^"\\]|\\.)*)":\s*"((?:[^"\\]|\\.)*)"/g;
  let match;
  
  while ((match = keyValuePattern.exec(content)) !== null) {
    const key = match[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    const value = match[2].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    dictionary[key] = value;
  }
  
  return dictionary;
}

function writeDictionary(filePath, dictionary) {
  const entries = Object.entries(dictionary)
    .map(([key, value]) => {
      const escapedKey = key.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      const escapedValue = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
      return `  "${escapedKey}": "${escapedValue}"`;
    })
    .join(',\n');
  
  const content = `const dictionary = {\n${entries}\n};\n\nexport default dictionary;\n`;
  fs.writeFileSync(filePath, content, 'utf8');
}

// Check if there's a translated JSON file
const exportPath = path.join(__dirname, '../german_translations_complete.json');
const dictDir = path.join(__dirname, '../src/localization/dictionaries');
const englishPath = path.join(dictDir, 'english.js');
const germanPath = path.join(dictDir, 'german.js');

const englishDict = extractDictionary(englishPath);
const currentGermanDict = extractDictionary(germanPath);

// Preserve existing German translations
const existingTranslations = {};
for (const [key, value] of Object.entries(currentGermanDict)) {
  if (value !== "Germany" && value !== englishDict[key]) {
    existingTranslations[key] = value;
  }
}

console.log(`Preserved ${Object.keys(existingTranslations).length} existing German translations`);

// If translated file exists, use it
let translatedData = null;
if (fs.existsSync(exportPath)) {
  try {
    translatedData = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
    console.log(`✓ Found translated file: ${exportPath}`);
  } catch (e) {
    console.log(`⚠️  Could not parse translated file`);
  }
}

const newGermanDict = {};
let applied = 0;
let preserved = 0;
let usingEnglish = 0;

for (const [key, englishValue] of Object.entries(englishDict)) {
  // Priority 1: Existing German translation
  if (existingTranslations[key]) {
    newGermanDict[key] = existingTranslations[key];
    preserved++;
    continue;
  }
  
  // Priority 2: Translated data from file
  if (translatedData && translatedData[key]) {
    newGermanDict[key] = translatedData[key];
    applied++;
    continue;
  }
  
  // Priority 3: Use English as fallback
  newGermanDict[key] = englishValue;
  usingEnglish++;
}

writeDictionary(germanPath, newGermanDict);

console.log(`\n✅ German dictionary updated:`);
console.log(`   Preserved: ${preserved}`);
console.log(`   Applied from file: ${applied}`);
console.log(`   Using English fallback: ${usingEnglish}`);
console.log(`   Total: ${Object.keys(newGermanDict).length}`);

if (usingEnglish > 0) {
  console.log(`\n⚠️  ${usingEnglish} keys still need German translation`);
  console.log(`   Create ${exportPath} with translations to complete`);
}


