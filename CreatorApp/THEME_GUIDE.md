# MyLiveDealz Dark Foundation Guide

> [!IMPORTANT]
> **AI/Developer Directive**: When this file is provided as context, implement the **Dark Mode Foundation** described below within the target codebase. Ensure the color tokens (Slate 950/800/700) are mapped to global backgrounds, surfaces, and borders, while preserving the system's existing primary brand colors.

This guide focuses specifically on the **Dark Mode Foundation** (The "Dark Shell") used in this project. Use these tokens to bring consistent dark mode behavior to your other systems, even if they use different primary brand colors.

## 1. The "Dark Shell" Tokens

These are the core slate-based colors that define the background, surfaces, and typography in dark mode.

| Category | HEX Code | Tailwind Class | Role |
| :--- | :--- | :--- | :--- |
| **Deep Base** | `#0f172a` | `bg-slate-950` | The main page/app background. |
| **Surface** | `#1e293b` | `bg-slate-800` | Cards, modals, side bars, and active sections. |
| **Secondary Surface** | `#334155` | `bg-slate-700` | Subtle background shifts or hover states on surfaces. |
| **Primary Text** | `#f1f5f9` | `text-slate-100` | Main headings and high-emphasis body text. |
| **Secondary Text** | `#cbd5e1` | `text-slate-300` | Captions, muted labels, and placeholder text. |
| **Borders** | `#1e293b` | `border-slate-800` | Subtle dividers (usually 1 shade lighter/darker than surface). |

## 2. Integration Pattern

To integrate this into an existing light-mode system with your own primary colors:

### A. Tailwind Configuration
Update your `tailwind.config.js` to ensure you have the correct slate palette and a `class` based dark mode toggle:

```javascript
module.exports = {
  darkMode: 'class', // Critical for toggling
  theme: {
    extend: {
      colors: {
        // Use your own primary colors, but adopt these for the "shell"
        dark: {
          bg: '#0f172a',
          surface: '#1e293b',
          border: '#334155'
        }
      }
    }
  }
}
```

### B. Global CSS (Applying the Foundation)
Apply these variables to your global CSS to ensure the background shifts automatically when the `.dark` class is applied:

```css
/* Apply to your root html or body */
html.dark {
  background-color: #0f172a; /* Slate 950 */
  color: #f1f5f9;            /* Slate 100 */
}

/* Ensure surfaces shift correctly */
.dark .card, .dark .modal {
  background-color: #1e293b; /* Slate 800 */
  border-color: #334155;     /* Slate 700 */
}
```

## 3. Dark Mode Best Practices
- **Contrast**: Avoid pure black (`#000000`). Using Slate-950/900 provides a "softer" dark look that reduces eye strain.
- **Elevation**: In dark mode, "higher" surfaces (like modals) should be lighter in color (e.g., Background: Slate 950 -> Card: Slate 800 -> Modal: Slate 700).
- **Primary Colors**: Ensure your system's primary colors have enough contrast against Slate 950. High-vibrancy colors (like our Orange `#f77f00`) work best.
