const fs = require('fs');
const path = require('path');
const https = require('https');

/**
 * This script translates all English keys to German using a translation approach.
 * For production, integrate with Google Translate API, DeepL API, or similar service.
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

// Load comprehensive German translations from a file or use API
// For now, we'll use a systematic approach with common translations

async function translateText(text, sourceLang = 'en', targetLang = 'de') {
  // This is a placeholder - in production, use Google Translate API, DeepL, etc.
  // Example with Google Translate API:
  // const response = await fetch(`https://translation.googleapis.com/language/translate/v2?key=YOUR_API_KEY&q=${encodeURIComponent(text)}&source=${sourceLang}&target=${targetLang}`);
  // return response.data.translations[0].translatedText;
  
  // For now, return a placeholder that indicates translation needed
  // In production, replace this with actual API call
  return text; // Placeholder
}

async function main() {
  console.log('🇩🇪 Translating German dictionary using comprehensive approach...\n');
  
  const dictDir = path.join(__dirname, '../src/localization/dictionaries');
  const englishPath = path.join(dictDir, 'english.js');
  const germanPath = path.join(dictDir, 'german.js');
  
  const englishDict = extractDictionary(englishPath);
  const germanDict = extractDictionary(germanPath);
  
  console.log(`✓ Loaded English: ${Object.keys(englishDict).length} keys`);
  console.log(`✓ Loaded German: ${Object.keys(germanDict).length} keys\n`);
  
  // Find keys that need translation (those with "Germany" as value)
  const keysToTranslate = [];
  for (const [key, value] of Object.entries(germanDict)) {
    if (value === "Germany") {
      keysToTranslate.push(key);
    }
  }
  
  console.log(`Found ${keysToTranslate.length} keys with "Germany" placeholder\n`);
  console.log('⚠️  To complete translations, you need to:');
  console.log('   1. Use Google Translate API, DeepL API, or similar service');
  console.log('   2. Or use the translation_export.json file with a translation service');
  console.log('   3. Or manually translate using the existing German translations as reference\n');
  
  // For now, we'll preserve existing German translations and use English for the rest
  // In production, replace this with actual API translation
  const newGermanDict = {};
  let preservedCount = 0;
  let needsTranslationCount = 0;
  
  for (const [key, englishValue] of Object.entries(englishDict)) {
    // Preserve existing German translations (not "Germany")
    if (germanDict[key] && germanDict[key] !== "Germany" && germanDict[key] !== englishValue) {
      newGermanDict[key] = germanDict[key];
      preservedCount++;
    } else {
      // Use English as placeholder until translated
      newGermanDict[key] = englishValue;
      needsTranslationCount++;
    }
  }
  
  writeDictionary(germanPath, newGermanDict);
  
  console.log(`✅ Dictionary updated!`);
  console.log(`   Preserved existing translations: ${preservedCount}`);
  console.log(`   Needs translation: ${needsTranslationCount}`);
  console.log(`\n💡 Next step: Use a translation API to translate the ${needsTranslationCount} keys`);
}

main().catch(console.error);


