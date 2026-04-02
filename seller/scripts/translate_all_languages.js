const fs = require('fs');
const path = require('path');

// This script uses the Chinese dictionary as the source of truth
// and translates all English placeholders in other languages
// Since we can't use external APIs, this creates a structure for manual/API translation

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

// Common proper nouns and brand names that should stay as-is
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
  "Skylink Stores", "Urban Couture", "Zuri EV Shop", "EV‑10510 / Q‑22018 / LS‑400",
  "name@example.com", "Alex Chen", "D. Namusoke", "K. Namusoke", "J. Byaruhanga",
  "A. Kato", "Alice", "Sam", "Namusoke K.", "Sam Support", "Faye Finance"
]);

// Technical terms that are commonly kept in English
const technicalTerms = new Set([
  "SKU", "RFQ", "SLA", "KYC", "KYB", "FAQ", "PDF", "SMS", "SOP", "DRM",
  "OTC", "Rx", "CSV", "JSON", "URL", "API", "ID", "PIN", "MOQ", "GMV",
  "ATC", "HDE", "ETA", "SEO", "MFA", "RMA", "RFQs", "SKUs", "RFQ-701",
  "EV-10452", "EV-10510", "Q-22018", "LS-400", "JOB-5002", "JOB-5001",
  "CON-001", "EVZ-10198", "RX-9002", "EQ-9002", "IP-700", "PM-12", "AC-20",
  "US-3500", "FA-BOOK", "UGX"
]);

function shouldKeepAsIs(key, value) {
  // Check if it's a proper noun
  if (properNouns.has(key) || properNouns.has(value)) return true;
  
  // Check if it contains a proper noun
  for (const pn of properNouns) {
    if (key.includes(pn) || value.includes(pn)) return true;
  }
  
  // Check if it's a technical term
  if (technicalTerms.has(key) || technicalTerms.has(value)) return true;
  
  // Check if it contains technical terms
  for (const tt of technicalTerms) {
    if (key.includes(tt) || value.includes(tt)) return true;
  }
  
  // Check if it's an email, URL, or code
  if (value.includes('@') || value.includes('http') || value.startsWith('/')) return true;
  
  // Check if it's a placeholder with variables
  if (value.includes('{') && value.includes('}')) {
    // Keep placeholders but might need translation of surrounding text
    return false; // Allow translation but preserve variables
  }
  
  return false;
}

// Simple translation mappings for common UI terms
// This is a basic implementation - in production, use a translation API
const basicTranslations = {
  // These will be expanded per language
};

async function translateLanguage(langCode, langName, englishDict, chineseDict) {
  const dictDir = path.join(__dirname, '../src/localization/dictionaries');
  const targetPath = path.join(dictDir, `${langCode}.js`);
  
  if (!fs.existsSync(targetPath)) {
    console.log(`   ⚠️  File not found: ${langCode}.js`);
    return null;
  }
  
  const targetDict = extractDictionary(targetPath);
  const newDict = {};
  
  let translatedCount = 0;
  let keptAsIsCount = 0;
  let preservedCount = 0;
  
  for (const [key, englishValue] of Object.entries(englishDict)) {
    // If target already has a translation (not same as English), preserve it
    if (targetDict[key] && targetDict[key] !== englishValue) {
      newDict[key] = targetDict[key];
      preservedCount++;
      continue;
    }
    
    // Check if should keep as-is
    if (shouldKeepAsIs(key, englishValue)) {
      newDict[key] = englishValue;
      keptAsIsCount++;
      continue;
    }
    
    // For now, use English as placeholder
    // In production, this would call a translation API
    // Translation would go here: translate(englishValue, 'en', langCode)
    newDict[key] = englishValue;
    translatedCount++; // Counted but not actually translated yet
  }
  
  writeDictionary(targetPath, newDict);
  
  return {
    name: langName,
    code: langCode,
    preserved: preservedCount,
    keptAsIs: keptAsIsCount,
    needsTranslation: translatedCount,
    total: Object.keys(newDict).length
  };
}

async function main() {
  console.log('🌍 Preparing all languages for translation...\n');
  
  const dictDir = path.join(__dirname, '../src/localization/dictionaries');
  const englishPath = path.join(dictDir, 'english.js');
  const chinesePath = path.join(dictDir, 'chinese.js');
  
  const englishDict = extractDictionary(englishPath);
  const chineseDict = extractDictionary(chinesePath);
  
  console.log(`English dictionary: ${Object.keys(englishDict).length} keys`);
  console.log(`Chinese dictionary: ${Object.keys(chineseDict).length} keys\n`);
  
  const languages = [
    { code: 'arabic', name: 'Arabic', code2: 'ar' },
    { code: 'spanish', name: 'Spanish', code2: 'es' },
    { code: 'french', name: 'French', code2: 'fr' },
    { code: 'portuguese', name: 'Portuguese', code2: 'pt' },
    { code: 'german', name: 'German', code2: 'de' },
    { code: 'italian', name: 'Italian', code2: 'it' },
    { code: 'russian', name: 'Russian', code2: 'ru' },
    { code: 'japanese', name: 'Japanese', code2: 'ja' },
    { code: 'korean', name: 'Korean', code2: 'ko' },
    { code: 'turkish', name: 'Turkish', code2: 'tr' },
    { code: 'vietnamese', name: 'Vietnamese', code2: 'vi' },
    { code: 'thai', name: 'Thai', code2: 'th' },
    { code: 'indonesian', name: 'Indonesian', code2: 'id' },
    { code: 'zh', name: 'Chinese (zh)', code2: 'zh' },
  ];
  
  console.log('Processing languages...\n');
  
  const results = [];
  for (const lang of languages) {
    console.log(`📝 Processing ${lang.name}...`);
    const result = await translateLanguage(lang.code, lang.name, englishDict, chineseDict);
    if (result) {
      results.push(result);
      console.log(`   ✅ Preserved: ${result.preserved}, Kept as-is: ${result.keptAsIs}, Needs translation: ${result.needsTranslation}`);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('Summary:');
  console.log('='.repeat(80));
  console.log('Language'.padEnd(15) + ' | Preserved | Kept as-is | Needs Translation');
  console.log('-'.repeat(80));
  
  results.forEach(({ name, preserved, keptAsIs, needsTranslation }) => {
    console.log(
      name.padEnd(15) + ' | ' +
      preserved.toString().padStart(9) + ' | ' +
      keptAsIs.toString().padStart(10) + ' | ' +
      needsTranslation.toString().padStart(17)
    );
  });
  
  console.log('\n💡 Note: Keys marked as "Needs Translation" are currently using English placeholders.');
  console.log('   To complete translations, use a translation API or service.');
  console.log('   Recommended: Google Translate API, DeepL API, or similar service.');
}

main().catch(console.error);


