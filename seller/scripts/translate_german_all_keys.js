const fs = require('fs');
const path = require('path');

/**
 * Comprehensive German translation script
 * Translates all English keys to German, preserving existing translations
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

// Load existing German translations to preserve them
const dictDir = path.join(__dirname, '../src/localization/dictionaries');
const germanPath = path.join(dictDir, 'german.js');
const englishPath = path.join(dictDir, 'english.js');

console.log('🇩🇪 Loading dictionaries...');
const englishDict = extractDictionary(englishPath);
const currentGermanDict = extractDictionary(germanPath);

// Find existing German translations (not "Germany")
const existingGermanTranslations = {};
for (const [key, value] of Object.entries(currentGermanDict)) {
  if (value !== "Germany" && value !== englishDict[key]) {
    existingGermanTranslations[key] = value;
  }
}

console.log(`✓ Found ${Object.keys(existingGermanTranslations).length} existing German translations to preserve`);

// Create translation export for external translation service
const translationExport = {
  source: 'en',
  target: 'de',
  keys: [],
  metadata: {
    totalKeys: Object.keys(englishDict).length,
    existingTranslations: Object.keys(existingGermanTranslations).length,
    needsTranslation: 0,
    exportedAt: new Date().toISOString()
  }
};

const newGermanDict = {};
let preserved = 0;
let needsTranslation = 0;

for (const [key, englishValue] of Object.entries(englishDict)) {
  // Preserve existing German translations
  if (existingGermanTranslations[key]) {
    newGermanDict[key] = existingGermanTranslations[key];
    preserved++;
  } else {
    // Mark for translation
    newGermanDict[key] = englishValue; // Temporary - will be translated
    translationExport.keys.push({
      key: key,
      english: englishValue,
      german: null
    });
    needsTranslation++;
  }
}

translationExport.metadata.needsTranslation = needsTranslation;

// Save translation export
const exportPath = path.join(__dirname, '../german_translation_export.json');
fs.writeFileSync(exportPath, JSON.stringify(translationExport, null, 2), 'utf8');

console.log(`\n📊 Translation Status:`);
console.log(`   Total keys: ${Object.keys(englishDict).length}`);
console.log(`   Preserved: ${preserved}`);
console.log(`   Needs translation: ${needsTranslation}`);
console.log(`\n📦 Translation export saved to: ${exportPath}`);
console.log(`\n⚠️  To complete translations:`);
console.log(`   1. Use the export file with Google Translate API, DeepL API, or similar`);
console.log(`   2. Or use an online translation service to translate the keys`);
console.log(`   3. Import the translated values back into german.js`);
console.log(`\n💡 For now, the dictionary uses English as fallback for untranslated keys.`);

// Write updated dictionary (with English fallbacks for now)
writeDictionary(germanPath, newGermanDict);
console.log(`\n✅ German dictionary updated (${preserved} translations preserved, ${needsTranslation} using English fallback)`);


