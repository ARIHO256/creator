const fs = require('fs');
const path = require('path');

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

async function checkLanguage(langCode, langName) {
  const dictDir = path.join(__dirname, '../src/localization/dictionaries');
  const englishPath = path.join(dictDir, 'english.js');
  const targetPath = path.join(dictDir, `${langCode}.js`);
  
  if (!fs.existsSync(targetPath)) {
    return { name: langName, code: langCode, total: 0, translated: 0, englishPlaceholders: 0 };
  }
  
  const englishDict = extractDictionary(englishPath);
  const targetDict = extractDictionary(targetPath);
  
  let englishPlaceholders = 0;
  for (const [key, value] of Object.entries(targetDict)) {
    const englishValue = englishDict[key];
    if (englishValue && value === englishValue) {
      englishPlaceholders++;
    }
  }
  
  const total = Object.keys(targetDict).length;
  const translated = total - englishPlaceholders;
  
  return { name: langName, code: langCode, total, translated, englishPlaceholders };
}

async function main() {
  const languages = [
    { code: 'arabic', name: 'Arabic' },
    { code: 'spanish', name: 'Spanish' },
    { code: 'french', name: 'French' },
    { code: 'portuguese', name: 'Portuguese' },
    { code: 'german', name: 'German' },
    { code: 'italian', name: 'Italian' },
    { code: 'russian', name: 'Russian' },
    { code: 'japanese', name: 'Japanese' },
    { code: 'korean', name: 'Korean' },
    { code: 'turkish', name: 'Turkish' },
    { code: 'vietnamese', name: 'Vietnamese' },
    { code: 'thai', name: 'Thai' },
    { code: 'indonesian', name: 'Indonesian' },
    { code: 'zh', name: 'Chinese (zh)' },
  ];
  
  console.log('📊 Checking translation status for all languages...\n');
  
  const results = [];
  for (const lang of languages) {
    const result = await checkLanguage(lang.code, lang.name);
    results.push(result);
  }
  
  console.log('='.repeat(80));
  console.log('Translation Status:');
  console.log('='.repeat(80));
  console.log('Language'.padEnd(15) + ' | Total Keys | Translated | English Placeholders | % Translated');
  console.log('-'.repeat(80));
  
  results.forEach(({ name, total, translated, englishPlaceholders }) => {
    const percentage = total > 0 ? ((translated / total) * 100).toFixed(1) : '0.0';
    console.log(
      name.padEnd(15) + ' | ' +
      total.toString().padStart(9) + ' | ' +
      translated.toString().padStart(9) + ' | ' +
      englishPlaceholders.toString().padStart(19) + ' | ' +
      percentage.padStart(11) + '%'
    );
  });
  
  console.log('='.repeat(80));
  
  const totalKeys = results[0]?.total || 0;
  const totalTranslated = results.reduce((sum, r) => sum + r.translated, 0);
  const totalPlaceholders = results.reduce((sum, r) => sum + r.englishPlaceholders, 0);
  
  console.log(`\nOverall: ${totalTranslated} translated keys, ${totalPlaceholders} English placeholders across all languages`);
}

main().catch(console.error);


