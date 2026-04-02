const fs = require('fs');
const path = require('path');

/**
 * This script implements localization by:
 * 1. Using Chinese translations as reference (since it's fully translated)
 * 2. Preserving existing translations in each language
 * 3. Using English as fallback for untranslated keys
 * 4. Creating a translation-ready structure
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

// Proper nouns and brand names that should stay as-is across all languages
const properNouns = new Set([
  "ExpressMart", "HealthMart", "EduMart", "EVmart", "GadgetMart", "StyleMart",
  "LivingMart", "PropertyMart", "GeneralMart", "ServiceMart", "MyLiveDealz",
  "EVzone", "GreenFleet", "FaithMart", "Alipay", "WeChat Pay (Weixin Pay)",
  "TechWithBrian", "Glow Essentials Store", "StyleByAma", "EV World Store",
  "Lilian Beauty Plug", "MamaTwinsCooks", "CampusTutor UG", "HomeFix Felix",
  "NewWave Creator", "TikTok", "Instagram", "YouTube", "Facebook", "WhatsApp",
  "Twitter / X", "Google Analytics", "Google Analytics 4", "Google Cloud Storage",
  "PayPal", "Stripe", "DHL", "UPS", "Twilio", "Amazon S3", "Xero", "TaxJar",
  "EVzone Pay", "MTN Uganda", "Bank of Africa", "Kampala EV Hub", "Urban Eats Cafe",
  "Kamwokya Tech Park", "Lakeview Pharmacy", "Hope Clinic", "GreenFleet Uganda",
  "Skylink Stores", "Urban Couture", "Zuri EV Shop"
]);

// Technical terms and codes that are typically kept in English
const technicalTerms = new Set([
  "SKU", "RFQ", "SLA", "KYC", "KYB", "FAQ", "PDF", "SMS", "SOP", "DRM",
  "OTC", "Rx", "CSV", "JSON", "URL", "API", "ID", "PIN", "MOQ", "GMV",
  "ATC", "ETA", "SEO", "MFA", "RMA", "RFQs", "SKUs"
]);

function shouldKeepAsIs(key, value) {
  // Check proper nouns
  if (properNouns.has(key) || properNouns.has(value)) return true;
  for (const pn of properNouns) {
    if (key.includes(pn) || value.includes(pn)) return true;
  }
  
  // Check technical terms
  if (technicalTerms.has(key) || technicalTerms.has(value)) return true;
  for (const tt of technicalTerms) {
    if (key.includes(tt) || value.includes(tt)) return true;
  }
  
  // Check for emails, URLs, or code patterns
  if (value.includes('@') || value.includes('http') || value.startsWith('/')) return true;
  
  // Check for product codes/IDs
  if (/^[A-Z]+-\d+/.test(value) || /^[A-Z]+\d+/.test(value)) return true;
  
  return false;
}

async function implementLocalization() {
  console.log('🌍 Implementing localization for all languages...\n');
  
  const dictDir = path.join(__dirname, '../src/localization/dictionaries');
  const englishPath = path.join(dictDir, 'english.js');
  const chinesePath = path.join(dictDir, 'chinese.js');
  
  const englishDict = extractDictionary(englishPath);
  const chineseDict = extractDictionary(chinesePath);
  
  console.log(`✓ Loaded English dictionary: ${Object.keys(englishDict).length} keys`);
  console.log(`✓ Loaded Chinese dictionary: ${Object.keys(chineseDict).length} keys\n`);
  
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
  
  const results = [];
  
  for (const lang of languages) {
    const targetPath = path.join(dictDir, `${lang.code}.js`);
    
    if (!fs.existsSync(targetPath)) {
      console.log(`⚠️  ${lang.name}: File not found, skipping...`);
      continue;
    }
    
    console.log(`📝 Processing ${lang.name}...`);
    
    const targetDict = extractDictionary(targetPath);
    const newDict = {};
    
    let preservedCount = 0;
    let keptAsIsCount = 0;
    let usingEnglishCount = 0;
    
    // Process each key from English dictionary (which matches Chinese)
    for (const [key, englishValue] of Object.entries(englishDict)) {
      // Priority 1: If target already has a translation (different from English), preserve it
      if (targetDict[key] && targetDict[key] !== englishValue) {
        newDict[key] = targetDict[key];
        preservedCount++;
        continue;
      }
      
      // Priority 2: If it's a proper noun or technical term, keep as-is
      if (shouldKeepAsIs(key, englishValue)) {
        newDict[key] = englishValue;
        keptAsIsCount++;
        continue;
      }
      
      // Priority 3: Use English as fallback (will be translated later or by translation service)
      // The localization system will fallback to English if translation is missing
      newDict[key] = englishValue;
      usingEnglishCount++;
    }
    
    // Write the updated dictionary
    writeDictionary(targetPath, newDict);
    
    const result = {
      name: lang.name,
      code: lang.code,
      total: Object.keys(newDict).length,
      preserved: preservedCount,
      keptAsIs: keptAsIsCount,
      usingEnglish: usingEnglishCount,
      translationCoverage: ((preservedCount / Object.keys(newDict).length) * 100).toFixed(1)
    };
    
    results.push(result);
    
    console.log(`   ✅ Total: ${result.total} | Preserved: ${result.preserved} | Kept as-is: ${result.keptAsIs} | Using English: ${result.usingEnglish}`);
    console.log(`   📊 Translation coverage: ${result.translationCoverage}%`);
  }
  
  // Generate summary report
  console.log('\n' + '='.repeat(80));
  console.log('📊 Localization Implementation Summary');
  console.log('='.repeat(80));
  console.log('Language'.padEnd(15) + ' | Total | Preserved | Kept as-is | English | Coverage');
  console.log('-'.repeat(80));
  
  results.forEach(({ name, total, preserved, keptAsIs, usingEnglish, translationCoverage }) => {
    console.log(
      name.padEnd(15) + ' | ' +
      total.toString().padStart(5) + ' | ' +
      preserved.toString().padStart(9) + ' | ' +
      keptAsIs.toString().padStart(10) + ' | ' +
      usingEnglish.toString().padStart(7) + ' | ' +
      translationCoverage.padStart(7) + '%'
    );
  });
  
  console.log('='.repeat(80));
  
  // Create translation export file for external translation services
  const translationExport = {
    source: 'en',
    languages: {},
    metadata: {
      totalKeys: Object.keys(englishDict).length,
      exportedAt: new Date().toISOString(),
      note: 'Export for translation services. Translate values from English to target languages.'
    }
  };
  
  // Export keys that need translation for each language
  for (const lang of languages) {
    const targetPath = path.join(dictDir, `${lang.code}.js`);
    if (!fs.existsSync(targetPath)) continue;
    
    const targetDict = extractDictionary(targetPath);
    const needsTranslation = {};
    
    for (const [key, englishValue] of Object.entries(englishDict)) {
      const targetValue = targetDict[key];
      // Include keys that are using English or missing
      if (!targetValue || targetValue === englishValue) {
        if (!shouldKeepAsIs(key, englishValue)) {
          needsTranslation[key] = englishValue;
        }
      }
    }
    
    if (Object.keys(needsTranslation).length > 0) {
      translationExport.languages[lang.code] = needsTranslation;
    }
  }
  
  const exportPath = path.join(__dirname, '../translation_export.json');
  fs.writeFileSync(exportPath, JSON.stringify(translationExport, null, 2), 'utf8');
  
  console.log(`\n📦 Translation export created: ${exportPath}`);
  console.log(`   This file can be used with translation services (Google Translate API, DeepL, etc.)`);
  
  console.log('\n✅ Localization implementation complete!');
  console.log('\n💡 Next steps:');
  console.log('   1. Use translation_export.json with a translation service');
  console.log('   2. Import translated values back into dictionaries');
  console.log('   3. The localization system will automatically use translations when available');
  console.log('   4. English is used as fallback for missing translations');
}

implementLocalization().catch(console.error);


