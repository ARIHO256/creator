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

async function verifyLanguage(langCode, langName) {
  const dictDir = path.join(__dirname, '../src/localization/dictionaries');
  const chinesePath = path.join(dictDir, 'chinese.js');
  const targetPath = path.join(dictDir, `${langCode}.js`);
  
  if (!fs.existsSync(targetPath)) {
    return { name: langName, code: langCode, status: 'missing', missing: [], extra: [] };
  }
  
  const chineseDict = extractDictionary(chinesePath);
  const targetDict = extractDictionary(targetPath);
  
  const chineseKeys = new Set(Object.keys(chineseDict));
  const targetKeys = new Set(Object.keys(targetDict));
  
  const missing = [...chineseKeys].filter(k => !targetKeys.has(k));
  const extra = [...targetKeys].filter(k => !chineseKeys.has(k));
  
  const status = missing.length === 0 && extra.length === 0 ? 'ok' : 'mismatch';
  
  return { name: langName, code: langCode, status, missing, extra, total: targetKeys.size };
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
  
  console.log('🔍 Verifying all languages have the same keys as Chinese...\n');
  
  const dictDir = path.join(__dirname, '../src/localization/dictionaries');
  const chinesePath = path.join(dictDir, 'chinese.js');
  const chineseDict = extractDictionary(chinesePath);
  const chineseKeys = new Set(Object.keys(chineseDict));
  
  console.log(`Chinese dictionary has ${chineseKeys.size} keys\n`);
  
  const results = [];
  for (const lang of languages) {
    const result = await verifyLanguage(lang.code, lang.name);
    results.push(result);
  }
  
  console.log('='.repeat(70));
  console.log('Verification Results:');
  console.log('='.repeat(70));
  
  let allOk = true;
  results.forEach(({ name, code, status, missing, extra, total }) => {
    if (status === 'ok') {
      console.log(`✅ ${name.padEnd(15)} | ${total.toString().padStart(4)} keys | All keys match`);
    } else if (status === 'missing') {
      console.log(`❌ ${name.padEnd(15)} | File not found`);
      allOk = false;
    } else {
      console.log(`⚠️  ${name.padEnd(15)} | ${total.toString().padStart(4)} keys | Missing: ${missing.length}, Extra: ${extra.length}`);
      if (missing.length > 0) {
        console.log(`   Missing keys (first 5): ${missing.slice(0, 5).join(', ')}`);
      }
      if (extra.length > 0) {
        console.log(`   Extra keys (first 5): ${extra.slice(0, 5).join(', ')}`);
      }
      allOk = false;
    }
  });
  
  console.log('='.repeat(70));
  
  if (allOk) {
    console.log('\n✅ All languages have the exact same keys as Chinese!');
  } else {
    console.log('\n⚠️  Some languages have mismatched keys. Run sync script to fix.');
  }
}

main().catch(console.error);


