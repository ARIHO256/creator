const fs = require('fs');
const path = require('path');
const https = require('https');

function extractDictionary(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const dictionary = {};

  const keyValuePattern = /"((?:[^"\\]|\\.)*)":\s*"((?:[^"\\]|\\.)*)"/g;
  let match;

  while ((match = keyValuePattern.exec(content)) !== null) {
    const key = match[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    const value = match[2].replace(/\\"/g, '"').replace(/\\\\/g, '\\').replace(/\\n/g, '\n');
    dictionary[key] = value;
  }

  return dictionary;
}

function writeDictionary(filePath, dictionary) {
  const entries = Object.entries(dictionary)
    .map(([key, value]) => {
      const escapedKey = key.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      const escapedValue = value
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n');
      return `  "${escapedKey}": "${escapedValue}"`;
    })
    .join(',\n');

  const content = `const dictionary: Record<string, string> = {\n${entries}\n};\n\nexport default dictionary;\n`;
  fs.writeFileSync(filePath, content, 'utf8');
}

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

const technicalTerms = new Set([
  "SKU", "RFQ", "SLA", "KYC", "KYB", "FAQ", "PDF", "SMS", "SOP", "DRM",
  "OTC", "Rx", "CSV", "JSON", "URL", "API", "ID", "PIN", "MOQ", "GMV",
  "ATC", "HDE", "ETA", "SEO", "MFA", "RMA", "RFQs", "SKUs", "RFQ-701",
  "EV-10452", "EV-10510", "Q-22018", "LS-400", "JOB-5002", "JOB-5001",
  "CON-001", "EVZ-10198", "RX-9002", "EQ-9002", "IP-700", "PM-12", "AC-20",
  "US-3500", "FA-BOOK", "UGX"
]);

function shouldKeepAsIs(key, value) {
  if (properNouns.has(value) || technicalTerms.has(value)) return true;
  if (value.includes('@') || value.includes('http') || value.startsWith('/')) return true;
  if (/^[A-Z]+-\d+/.test(value) || /^[A-Z]+\d+/.test(value)) return true;

  return false;
}

function isTrivial(value) {
  return !/[A-Za-z]/.test(value);
}

function protect(text) {
  const tokens = [];
  let out = text;

  const protectedTerms = [...properNouns, ...technicalTerms]
    .filter((term) => term.length > 0)
    .sort((a, b) => b.length - a.length);

  for (const term of protectedTerms) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const useWordBoundary = /^[A-Za-z0-9_]+$/.test(term);
    const pattern = useWordBoundary ? `\\b${escaped}\\b` : escaped;
    const regex = new RegExp(pattern, 'g');
    if (!regex.test(out)) continue;
    const placeholder = `__TERM${tokens.length}__`;
    tokens.push({ placeholder, value: term });
    out = out.replace(regex, placeholder);
  }

  out = out.replace(/\{[^}]+\}/g, (match) => {
    const placeholder = `__VAR${tokens.length}__`;
    tokens.push({ placeholder, value: match });
    return placeholder;
  });

  out = out.replace(/&amp;/g, '__AMP__');
  out = out.replace(/\n/g, '__NL__');

  return { text: out, tokens };
}

function restore(text, tokens) {
  let out = text;
  for (const token of tokens) {
    out = out.replaceAll(token.placeholder, token.value);
  }
  out = out.replaceAll('__AMP__', '&amp;');
  out = out.replaceAll('__NL__', '\n');
  return out;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requestTranslation(text, targetLang, attempt = 0) {
  return new Promise((resolve, reject) => {
    const params = new URLSearchParams({
      client: 'gtx',
      sl: 'en',
      tl: targetLang,
      dt: 't',
      q: text
    });

    const body = params.toString();
    const req = https.request({
      hostname: 'translate.googleapis.com',
      path: '/translate_a/single',
      method: 'POST',
      timeout: 15000,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
        'Content-Length': Buffer.byteLength(body),
        'User-Agent': 'Mozilla/5.0'
      }
    }, (res) => {
      let data = '';
      res.on('data', (d) => { data += d; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const out = Array.isArray(json?.[0])
            ? json[0].map((seg) => seg[0]).join('')
            : null;
          if (!out) {
            reject(new Error('Unexpected translation response'));
            return;
          }
          resolve(out);
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('timeout', () => {
      req.destroy(new Error('timeout'));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  }).catch(async (err) => {
    if (attempt >= 2) throw err;
    await sleep(300 * Math.pow(2, attempt));
    return requestTranslation(text, targetLang, attempt + 1);
  });
}

async function translateText(text, targetLang, cache) {
  if (cache.has(text)) return cache.get(text);
  const { text: protectedText, tokens } = protect(text);
  const translated = await requestTranslation(protectedText, targetLang);
  const restored = restore(translated, tokens);
  cache.set(text, restored);
  return restored;
}

async function translateTexts(texts, targetLang, concurrency) {
  const cache = new Map();
  const results = new Map();
  let index = 0;

  async function worker() {
    while (index < texts.length) {
      const current = texts[index++];
      try {
        const translated = await translateText(current, targetLang, cache);
        results.set(current, translated);
      } catch (err) {
        results.set(current, current);
        console.warn(`   ⚠️  Failed to translate "${current}" (${targetLang}): ${err.message}`);
      }
    }
  }

  const workers = Array.from({ length: concurrency }, worker);
  await Promise.all(workers);
  return results;
}

async function main() {
  const dictDir = path.join(__dirname, '../src/localization/dictionaries');
  const englishPath = path.join(dictDir, 'english.ts');
  const englishDict = extractDictionary(englishPath);

  const languageMap = {
    arabic: 'ar',
    chinese: 'zh-CN',
    danish: 'da',
    dutch: 'nl',
    finnish: 'fi',
    french: 'fr',
    german: 'de',
    hindi: 'hi',
    indonesian: 'id',
    italian: 'it',
    japanese: 'ja',
    korean: 'ko',
    luganda: 'lg',
    norwegian: 'no',
    portuguese: 'pt',
    russian: 'ru',
    spanish: 'es',
    swedish: 'sv',
    thai: 'th',
    turkish: 'tr',
    vietnamese: 'vi',
    zh: 'zh-CN'
  };

  const files = fs.readdirSync(dictDir)
    .filter((f) => f.endsWith('.ts') && f !== 'english.ts');

  for (const file of files) {
    const langCode = file.replace(/\.ts$/, '');
    const targetLang = languageMap[langCode];
    if (!targetLang) {
      console.log(`⚠️  No language mapping for ${langCode}, skipping.`);
      continue;
    }

    console.log(`\n🌍 Translating ${langCode} -> ${targetLang}`);
    const targetPath = path.join(dictDir, file);
    const targetDict = extractDictionary(targetPath);
    const newDict = {};

    const textsToTranslate = new Map();
    for (const [key, englishValue] of Object.entries(englishDict)) {
      const existing = targetDict[key];
      if (existing && existing !== englishValue) continue;
      if (shouldKeepAsIs(key, englishValue) || isTrivial(englishValue)) continue;
      textsToTranslate.set(englishValue, true);
    }

    const uniqueTexts = Array.from(textsToTranslate.keys());
    console.log(`   🔎 ${uniqueTexts.length} strings need translation`);

    const translations = uniqueTexts.length
      ? await translateTexts(uniqueTexts, targetLang, 5)
      : new Map();

    for (const [key, englishValue] of Object.entries(englishDict)) {
      const existing = targetDict[key];
      if (existing && existing !== englishValue) {
        newDict[key] = existing;
        continue;
      }

      if (shouldKeepAsIs(key, englishValue) || isTrivial(englishValue)) {
        newDict[key] = englishValue;
        continue;
      }

      const translated = translations.get(englishValue);
      newDict[key] = translated || englishValue;
    }

    writeDictionary(targetPath, newDict);
    console.log(`   ✅ Updated ${file}`);
  }

  console.log('\n✅ Auto-translation complete.');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
