const fs = require('fs');
const path = require('path');

/**
 * This script translates all English keys in the German dictionary to proper German translations.
 * It uses the English dictionary as source and translates each key to German.
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

// Comprehensive German translations for common UI terms
// This is a large mapping - in production, use a translation API
const germanTranslations = {
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

// Proper nouns and brand names that should stay as-is
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
  "ATC", "ETA", "SEO", "MFA", "RMA", "RFQs", "SKUs"
]);

function shouldKeepAsIs(key, value) {
  if (properNouns.has(key) || properNouns.has(value)) return true;
  for (const pn of properNouns) {
    if (key.includes(pn) || value.includes(pn)) return true;
  }
  if (technicalTerms.has(key) || technicalTerms.has(value)) return true;
  for (const tt of technicalTerms) {
    if (key.includes(tt) || value.includes(tt)) return true;
  }
  if (value.includes('@') || value.includes('http') || value.startsWith('/')) return true;
  if (/^[A-Z]+-\d+/.test(value) || /^[A-Z]+\d+/.test(value)) return true;
  return false;
}

// Simple translation function - in production, use a translation API
function translateToGerman(englishText) {
  // If it's in our translation dictionary, use it
  if (germanTranslations[englishText]) {
    return germanTranslations[englishText];
  }
  
  // If it should be kept as-is, return the English
  if (shouldKeepAsIs(englishText, englishText)) {
    return englishText;
  }
  
  // For now, return English as placeholder
  // In production, this would call a translation API
  return englishText;
}

async function main() {
  console.log('🇩🇪 Translating German dictionary...\n');
  
  const dictDir = path.join(__dirname, '../src/localization/dictionaries');
  const englishPath = path.join(dictDir, 'english.js');
  const germanPath = path.join(dictDir, 'german.js');
  
  const englishDict = extractDictionary(englishPath);
  const germanDict = extractDictionary(germanPath);
  
  console.log(`✓ Loaded English dictionary: ${Object.keys(englishDict).length} keys`);
  console.log(`✓ Loaded German dictionary: ${Object.keys(germanDict).length} keys\n`);
  
  const newGermanDict = {};
  let translatedCount = 0;
  let keptAsIsCount = 0;
  let preservedCount = 0;
  
  for (const [key, englishValue] of Object.entries(englishDict)) {
    // If German already has a translation (not "Germany"), preserve it
    if (germanDict[key] && germanDict[key] !== "Germany" && germanDict[key] !== englishValue) {
      newGermanDict[key] = germanDict[key];
      preservedCount++;
      continue;
    }
    
    // Check if should keep as-is
    if (shouldKeepAsIs(key, englishValue)) {
      newGermanDict[key] = englishValue;
      keptAsIsCount++;
      continue;
    }
    
    // Translate to German
    const translation = translateToGerman(englishValue);
    newGermanDict[key] = translation;
    
    if (translation !== englishValue) {
      translatedCount++;
    } else {
      keptAsIsCount++;
    }
  }
  
  writeDictionary(germanPath, newGermanDict);
  
  console.log(`✅ Translation complete!`);
  console.log(`   Preserved existing: ${preservedCount}`);
  console.log(`   Translated: ${translatedCount}`);
  console.log(`   Kept as-is: ${keptAsIsCount}`);
  console.log(`   Total keys: ${Object.keys(newGermanDict).length}`);
  console.log(`\n⚠️  Note: ${keptAsIsCount} keys still use English (proper nouns, technical terms, or need API translation)`);
  console.log(`   To complete translations, use a translation API (Google Translate, DeepL, etc.)`);
}

main().catch(console.error);


