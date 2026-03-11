const fs = require('fs');
const path = require('path');

/**
 * Translate German dictionary using French as reference structure
 * and comprehensive German translation mapping
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

// Comprehensive German translations - mapping English to German
// This is a large dictionary covering common terms
const germanTranslations = {
  // Basic UI
  "Dashboard": "Dashboard",
  "Portfolio": "Portfolio",
  "Provider Portfolio": "Anbieter-Portfolio",
  "Showcase projects, outcomes, and media": "Projekte, Ergebnisse und Medien präsentieren",
  "Share Portfolio": "Portfolio teilen",
  "Export": "Exportieren",
  "Import": "Importieren",
  "+ Add Project": "+ Projekt hinzufügen",
  "Projects": "Projekte",
  "Avg rating": "Durchschnittsbewertung",
  "Search": "Suchen",
  "Search title, tags, outcomes…": "Titel, Tags, Ergebnisse suchen…",
  "Tag": "Tag",
  "more": "mehr",
  "No cover": "Kein Cover",
  "View": "Anzeigen",
  "Units": "Einheiten",
  "Days": "Tage",
  "Edit": "Bearbeiten",
  "Duplicate": "Duplizieren",
  "No projects match your filters.": "Keine Projekte entsprechen Ihren Filtern.",
  "Delete project?": "Projekt löschen?",
  "This action cannot be undone.": "Diese Aktion kann nicht rückgängig gemacht werden.",
  "Portfolio link copied": "Portfolio-Link kopiert",
  "Copy failed": "Kopieren fehlgeschlagen",
  "Title is required": "Titel ist erforderlich",
  "Saved": "Gespeichert",
  "Duplicated": "Dupliziert",
  "Deleted": "Gelöscht",
  "Export failed": "Export fehlgeschlagen",
  "Imported": "Importiert",
  "Invalid JSON": "Ungültiges JSON",
  "New project": "Neues Projekt",
  "Edit project": "Projekt bearbeiten",
  "Project details": "Projektdetails",
  "Basics": "Grundlagen",
  "Outcomes": "Ergebnisse",
  "Media": "Medien",
  "Metrics": "Metriken",
  "Preview": "Vorschau",
  "Title": "Titel",
  "Project title": "Projekttitel",
  "Client": "Kunde",
  "Client name": "Kundenname",
  "Project type": "Projekttyp",
  "Installation / Maintenance": "Installation / Wartung",
  "Summary": "Zusammenfassung",
  "Short, professional summary": "Kurze, professionelle Zusammenfassung",
  "Rating (0-5)": "Bewertung (0-5)",
  "Tags (comma)": "Tags (Komma)",
  "EV, Install": "EV, Installation",
  "Outcomes (one per line)": "Ergebnisse (eines pro Zeile)",
  "Outcome 1\nOutcome 2\nOutcome 3": "Ergebnis 1\nErgebnis 2\nErgebnis 3",
  "No outcomes yet": "Noch keine Ergebnisse",
  "Upload images": "Bilder hochladen",
  "Drag and drop images here": "Bilder hierher ziehen und ablegen",
  "or browse files": "oder Dateien durchsuchen",
  "Browse": "Durchsuchen",
  "Add image by URL": "Bild per URL hinzufügen",
  "Images": "Bilder",
  "Remove": "Entfernen",
  "No images yet": "Noch keine Bilder",
  "Add URL": "URL hinzufügen",
  "Units installed": "Installierte Einheiten",
  "Total kW": "Gesamt kW",
  "Duration (days)": "Dauer (Tage)",
  "Tip": "Tipp",
  "Use metrics to show scale and credibility (units, kW, days). This improves conversion for new clients.": "Verwenden Sie Metriken, um Umfang und Glaubwürdigkeit zu zeigen (Einheiten, kW, Tage). Dies verbessert die Conversion für neue Kunden.",
  "Card preview": "Kartenvorschau",
  "Short summary will appear here.": "Kurze Zusammenfassung erscheint hier.",
  "Public portfolio link": "Öffentlicher Portfolio-Link",
  "This is a preview link pattern; your backend can map it to a public provider profile.": "Dies ist ein Vorschaulink-Muster; Ihr Backend kann es auf ein öffentliches Anbieterprofil abbilden.",
  "See the full picture across your EVzone products, services and MyLiveDealz promo arm – sales, bookings, Dealz and payouts in one place.": "Sehen Sie das Gesamtbild Ihrer EVzone-Produkte, -Dienstleistungen und MyLiveDealz-Promobereich – Verkäufe, Buchungen, Dealz und Auszahlungen an einem Ort.",
  "Showing metrics for": "Metriken anzeigen für",
  "Today": "Heute",
  "Last 7 days": "Letzte 7 Tage",
  "Last 30 days": "Letzte 30 Tage",
  "Go to Product Orders": "Zu Produktbestellungen",
  "View and fulfil your latest EVzone orders.": "Sehen Sie Ihre neuesten EVzone-Bestellungen an und erfüllen Sie sie.",
  "Go to Service Bookings": "Zu Servicebuchungen",
  "Manage today's service jobs and slots.": "Verwalten Sie die heutigen Serviceaufträge und Zeitslots.",
  "Go to EVzone Messages": "Zu EVzone-Nachrichten",
  "Reply to buyer & client messages.": "Antworten Sie auf Käufer- und Kunden-Nachrichten.",
  "Today at a glance": "Heute auf einen Blick",
  "Synced with EVzone & MyLiveDealz": "Synchronisiert mit EVzone & MyLiveDealz",
  "EVzone overview": "EVzone-Übersicht",
  "Core products & services": "Kernprodukte & -dienstleistungen",
  "EVzone product sales": "EVzone-Produktverkäufe",
  "Storefront & marketplace orders": "Storefront- und Marktplatzbestellungen",
  "EVzone service revenue": "EVzone-Serviceumsatz",
  "Bookings & service jobs": "Buchungen & Serviceaufträge",
  "Active orders & bookings": "Aktive Bestellungen & Buchungen",
  "Open products + today's services": "Produkte öffnen + heutige Services",
  "MyLiveDealz overview": "MyLiveDealz-Übersicht",
  "Promo arm: Shoppable Adz & Live": "Promobereich: Shoppable Adz & Live",
  "Sales via MyLiveDealz": "Verkäufe über MyLiveDealz",
  "Live sessions scheduled": "Geplante Live-Sessions",
  "Active Dealz": "Aktive Dealz",
  "Wallet balance": "Wallet-Guthaben",
};

// Proper nouns that stay as-is
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

function shouldKeepAsIs(key, value) {
  if (properNouns.has(key) || properNouns.has(value)) return true;
  for (const pn of properNouns) {
    if (key.includes(pn) || value.includes(pn)) return true;
  }
  if (value.includes('@') || value.includes('http') || value.startsWith('/')) return true;
  if (/^[A-Z]+-\d+/.test(value) || /^[A-Z]+\d+/.test(value)) return true;
  return false;
}

function translateToGerman(englishText) {
  // Check direct mapping
  if (germanTranslations[englishText]) {
    return germanTranslations[englishText];
  }
  
  // Check if should keep as-is
  if (shouldKeepAsIs(englishText, englishText)) {
    return englishText;
  }
  
  // For now, return English - will need API translation
  return englishText;
}

async function main() {
  console.log('🇩🇪 Translating German dictionary comprehensively...\n');
  
  const dictDir = path.join(__dirname, '../src/localization/dictionaries');
  const englishPath = path.join(dictDir, 'english.js');
  const germanPath = path.join(dictDir, 'german.js');
  const frenchPath = path.join(dictDir, 'french.js');
  
  const englishDict = extractDictionary(englishPath);
  const currentGermanDict = extractDictionary(germanPath);
  const frenchDict = extractDictionary(frenchPath);
  
  // Preserve existing German translations
  const existingTranslations = {};
  for (const [key, value] of Object.entries(currentGermanDict)) {
    if (value !== "Germany" && value !== englishDict[key]) {
      existingTranslations[key] = value;
    }
  }
  
  console.log(`✓ Preserved ${Object.keys(existingTranslations).length} existing German translations`);
  console.log(`✓ Loaded ${Object.keys(germanTranslations).length} translation mappings\n`);
  
  const newGermanDict = {};
  let preserved = 0;
  let translated = 0;
  let needsAPI = 0;
  
  for (const [key, englishValue] of Object.entries(englishDict)) {
    // Priority 1: Existing German translation
    if (existingTranslations[key]) {
      newGermanDict[key] = existingTranslations[key];
      preserved++;
      continue;
    }
    
    // Priority 2: Direct translation mapping
    const translation = translateToGerman(englishValue);
    if (translation !== englishValue) {
      newGermanDict[key] = translation;
      translated++;
      continue;
    }
    
    // Priority 3: Use English as placeholder (needs API translation)
    newGermanDict[key] = englishValue;
    needsAPI++;
  }
  
  writeDictionary(germanPath, newGermanDict);
  
  console.log(`✅ German dictionary updated:`);
  console.log(`   Preserved: ${preserved}`);
  console.log(`   Translated: ${translated}`);
  console.log(`   Needs API translation: ${needsAPI}`);
  console.log(`   Total: ${Object.keys(newGermanDict).length}`);
  console.log(`\n⚠️  ${needsAPI} keys still need German translation via API`);
  console.log(`   Recommendation: Use Google Translate API or DeepL API`);
}

main().catch(console.error);


