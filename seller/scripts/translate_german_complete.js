const fs = require('fs');
const path = require('path');

/**
 * Complete German translation script
 * Uses comprehensive translation mapping + pattern matching
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

// Comprehensive German translation patterns
const translationPatterns = [
  // Common UI terms
  { en: /^Dashboard$/i, de: "Dashboard" },
  { en: /^Portfolio$/i, de: "Portfolio" },
  { en: /^Search$/i, de: "Suchen" },
  { en: /^Edit$/i, de: "Bearbeiten" },
  { en: /^Delete$/i, de: "Löschen" },
  { en: /^Save$/i, de: "Speichern" },
  { en: /^Cancel$/i, de: "Abbrechen" },
  { en: /^Close$/i, de: "Schließen" },
  { en: /^View$/i, de: "Anzeigen" },
  { en: /^Add$/i, de: "Hinzufügen" },
  { en: /^Remove$/i, de: "Entfernen" },
  { en: /^Export$/i, de: "Exportieren" },
  { en: /^Import$/i, de: "Importieren" },
  { en: /^Settings$/i, de: "Einstellungen" },
  { en: /^Profile$/i, de: "Profil" },
  { en: /^Orders$/i, de: "Bestellungen" },
  { en: /^Messages$/i, de: "Nachrichten" },
  { en: /^Notifications$/i, de: "Benachrichtigungen" },
  { en: /^Finance$/i, de: "Finanzen" },
  { en: /^Analytics$/i, de: "Analysen" },
  
  // Common phrases
  { en: /^Today$/i, de: "Heute" },
  { en: /^Yesterday$/i, de: "Gestern" },
  { en: /^Tomorrow$/i, de: "Morgen" },
  { en: /^Pending$/i, de: "Ausstehend" },
  { en: /^Processing$/i, de: "In Bearbeitung" },
  { en: /^Completed$/i, de: "Abgeschlossen" },
  { en: /^Active$/i, de: "Aktiv" },
  { en: /^Inactive$/i, de: "Inaktiv" },
  { en: /^Enabled$/i, de: "Aktiviert" },
  { en: /^Disabled$/i, de: "Deaktiviert" },
  
  // Patterns
  { en: /^New (.+)$/i, de: (m) => `Neue${m[1]}` },
  { en: /^Edit (.+)$/i, de: (m) => `${m[1]} bearbeiten` },
  { en: /^Add (.+)$/i, de: (m) => `${m[1]} hinzufügen` },
  { en: /^Delete (.+)\?$/i, de: (m) => `${m[1]} löschen?` },
  { en: /^(.+) is required$/i, de: (m) => `${m[1]} ist erforderlich` },
  { en: /^(.+) saved$/i, de: (m) => `${m[1]} gespeichert` },
  { en: /^(.+) failed$/i, de: (m) => `${m[1]} fehlgeschlagen` },
  { en: /^No (.+) yet$/i, de: (m) => `Noch keine ${m[1]}` },
  { en: /^Total (.+)$/i, de: (m) => `Gesamt ${m[1]}` },
];

function translateToGerman(text) {
  // Try patterns first
  for (const pattern of translationPatterns) {
    const match = text.match(pattern.en);
    if (match) {
      if (typeof pattern.de === 'function') {
        return pattern.de(match);
      }
      return pattern.de;
    }
  }
  
  // Return English as fallback (will be translated via API)
  return text;
}

async function main() {
  console.log('🇩🇪 Translating German dictionary comprehensively...\n');
  
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
  
  console.log(`✓ Preserved ${Object.keys(existingTranslations).length} existing translations`);
  
  const newGermanDict = {};
  let preserved = 0;
  let translated = 0;
  let needsAPI = 0;
  
  for (const [key, englishValue] of Object.entries(englishDict)) {
    if (existingTranslations[key]) {
      newGermanDict[key] = existingTranslations[key];
      preserved++;
    } else {
      const translation = translateToGerman(englishValue);
      if (translation !== englishValue) {
        newGermanDict[key] = translation;
        translated++;
      } else {
        newGermanDict[key] = englishValue; // Needs API translation
        needsAPI++;
      }
    }
  }
  
  writeDictionary(germanPath, newGermanDict);
  
  console.log(`\n✅ German dictionary updated:`);
  console.log(`   Preserved: ${preserved}`);
  console.log(`   Pattern-translated: ${translated}`);
  console.log(`   Needs API translation: ${needsAPI}`);
  console.log(`\n💡 To complete: Use Google Translate API or DeepL API for remaining ${needsAPI} keys`);
}

main().catch(console.error);


