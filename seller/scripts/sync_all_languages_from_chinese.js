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

async function syncLanguage(langCode, langName) {
  const dictDir = path.join(__dirname, '../src/localization/dictionaries');
  const chinesePath = path.join(dictDir, 'chinese.js');
  const targetPath = path.join(dictDir, `${langCode}.js`);
  
  // Skip if target file doesn't exist
  if (!fs.existsSync(targetPath)) {
    console.log(`⚠️  ${langName} (${langCode}): File not found, skipping...`);
    return;
  }
  
  console.log(`\n📝 Processing ${langName} (${langCode})...`);
  
  // Load dictionaries
  const chineseDict = extractDictionary(chinesePath);
  const targetDict = extractDictionary(targetPath);
  
  console.log(`   Chinese keys: ${Object.keys(chineseDict).length}`);
  console.log(`   Current ${langName} keys: ${Object.keys(targetDict).length}`);
  
  // Create new dictionary with all Chinese keys
  const newDict = {};
  let preservedCount = 0;
  let newCount = 0;
  
  for (const [key, chineseValue] of Object.entries(chineseDict)) {
    if (targetDict.hasOwnProperty(key)) {
      // Preserve existing translation
      newDict[key] = targetDict[key];
      preservedCount++;
    } else {
      // Use English key as placeholder (can be translated later)
      newDict[key] = key;
      newCount++;
    }
  }
  
  console.log(`   ✅ Preserved ${preservedCount} existing translations`);
  console.log(`   ➕ Added ${newCount} new keys (using English as placeholder)`);
  
  // Write updated dictionary
  writeDictionary(targetPath, newDict);
  console.log(`   💾 Updated ${langName}.js`);
  
  return { preserved: preservedCount, added: newCount, total: Object.keys(newDict).length };
}

async function main() {
  const languages = [
    { code: 'arabic', name: 'Arabic' },
    { code: 'spanish', name: 'Spanish' },
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
  
  console.log('🔄 Syncing all languages to match Chinese dictionary...\n');
  
  const results = [];
  for (const lang of languages) {
    try {
      const result = await syncLanguage(lang.code, lang.name);
      if (result) {
        results.push({ ...lang, ...result });
      }
    } catch (error) {
      console.error(`   ❌ Error processing ${lang.name}:`, error.message);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Summary:');
  console.log('='.repeat(60));
  
  results.forEach(({ name, code, preserved, added, total }) => {
    console.log(`${name.padEnd(15)} | Total: ${total.toString().padStart(4)} | Preserved: ${preserved.toString().padStart(4)} | Added: ${added.toString().padStart(4)}`);
  });
  
  console.log('\n✅ All languages now have the same keys as Chinese!');
  console.log('💡 Note: New keys use English as placeholder. Consider translating them.');
}

main().catch(console.error);


