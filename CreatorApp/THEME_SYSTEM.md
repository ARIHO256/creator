# Theme System Documentation

## Overview

The application uses a centralized theme system that supports both **light** and **dark** modes. The theme preference is persisted in localStorage and automatically syncs across all components in the application.

## Architecture

### Theme Context (`src/contexts/ThemeContext.tsx`)

The theme system is built on React Context API and provides:

- **Theme State**: Current theme (`"light"` or `"dark"`)
- **Toggle Function**: Method to switch between themes
- **Persistence**: Automatically saves preference to localStorage
- **System Preference Detection**: Falls back to system preference if no saved preference exists

### Key Features

1. **Automatic Persistence**: Theme preference is saved to `localStorage` and persists across sessionz
2. **System Preference Detection**: On first load, detects user's system preference (dark/light)
3. **Global Application**: Theme is applied to the entire application via `document.documentElement`
4. **Type Safety**: Fully typed with TypeScript

## Implementation

### Setup

The theme system is initialized in `src/main.tsx`:

```tsx
import { ThemeProvider as CustomThemeProvider } from "./contexts/ThemeContext";

// Wrap your app with ThemeProvider
<CustomThemeProvider>
  <App />
</CustomThemeProvider>
```

### Using Theme in Components

#### Basic Usage

```tsx
import { useTheme } from "../../contexts/ThemeContext";

function MyComponent() {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <div>
      <p>Current theme: {theme}</p>
      <button onClick={toggleTheme}>
        Toggle Theme
      </button>
    </div>
  );
}
```

#### Theme-Aware Styling with Tailwind CSS

The theme is applied via the `dark` class on the document root. Use Tailwind's `dark:` variant for dark mode styles:

```tsx
<div className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
  Content that adapts to theme
</div>
```

### Tailwind CSS Dark Mode Classes

#### Background Colors

```tsx
// Light backgrounds
bg-white dark:bg-slate-800
bg-slate-50 dark:bg-slate-900
bg-slate-100 dark:bg-slate-700

// Card backgrounds
bg-white dark:bg-slate-800
bg-slate-50 dark:bg-slate-700/50  // Semi-transparent
```

#### Text Colors

```tsx
// Primary text
text-slate-900 dark:text-slate-100
text-slate-800 dark:text-slate-50

// Secondary text
text-slate-600 dark:text-slate-300
text-slate-500 dark:text-slate-400

// Muted text
text-slate-500 dark:text-slate-400
```

#### Border Colors

```tsx
border-slate-200 dark:border-slate-700
border-slate-300 dark:border-slate-600
```

#### Interactive Elements

```tsx
// Hover states
hover:bg-slate-50 dark:hover:bg-slate-700
hover:bg-slate-100 dark:hover:bg-slate-600

// Focus states
focus:ring-[#f77f00] dark:focus:ring-[#f77f00]
```

### Standard Color Patterns

#### Cards and Containers

```tsx
className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
```

#### Input Fields

```tsx
className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#f77f00] dark:focus:ring-[#f77f00] transition-colors"
```

#### Buttons

```tsx
// Neutral button
className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"

// Outline button
className="border border-slate-900 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-slate-900 dark:hover:bg-slate-600 hover:text-white transition-colors"
```

#### Modals

```tsx
// Modal backdrop
className="bg-black/40 dark:bg-black/60"

// Modal content
className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl transition-colors"
```

## Best Practices

### 1. Always Include `transition-colors`

Add `transition-colors` to elements that change color between themes for smooth transitions:

```tsx
<div className="bg-white dark:bg-slate-800 transition-colors">
```

### 2. Use Consistent Color Palette

Stick to the standard slate color scale:
- **Light backgrounds**: `white`, `slate-50`, `slate-100`
- **Dark backgrounds**: `slate-800`, `slate-900`, `slate-950`
- **Light text**: `slate-900`, `slate-800`
- **Dark text**: `slate-100`, `slate-50`
- **Secondary text**: `slate-600` / `slate-300`
- **Muted text**: `slate-500` / `slate-400`

### 3. Test Both Themes

Always verify your components in both light and dark modes:
- Check contrast ratios for accessibility
- Ensure interactive elements are clearly visible
- Verify hover and focus states work in both themes

### 4. Use Semantic Color Names

When possible, use semantic color names that make sense in both themes:

```tsx
// Good - semantic
text-slate-900 dark:text-slate-100

// Avoid - theme-specific
text-black dark:text-white  // Less flexible
```

### 5. Brand Colors

Brand colors (like `#f77f00` orange) should remain consistent across themes:

```tsx
bg-[#f77f00]  // Same in both themes
text-[#f77f00]  // Same in both themes
```

## Settings Integration

### Theme Setting in Settings Page

The theme can be toggled from the **Creator Settings & Safety** page:

**Location**: `src/pages/creator/CreatorSettingsSafetyPage.tsx`

**Component**: `AppearanceCard`

```tsx
import { useTheme } from "../../contexts/ThemeContext";

function CreatorSettingsSafetyPage() {
  const { theme, toggleTheme } = useTheme();
  
  // ... rest of component
  return (
    <AppearanceCard
      theme={theme}
      onToggleTheme={toggleTheme}
    />
  );
}
```

### Alternative Toggle Locations

The theme can also be toggled from:
- **Avatar Menu Dropdown** (`src/components/AvatarMenuDropdown.tsx`)
- Any component that imports and uses `useTheme()`

## Theme State Management

### How It Works

1. **Initialization**: 
   - Checks `localStorage.getItem("theme")` first
   - Falls back to system preference: `window.matchMedia("(prefers-color-scheme: dark)")`
   - Defaults to `"light"` if neither is available

2. **Application**:
   - Adds/removes `dark` class on `document.documentElement`
   - Tailwind CSS automatically applies dark mode styles

3. **Persistence**:
   - Every theme change is saved to `localStorage`
   - Persists across page reloads and browser sessionz

### Theme Context API

```tsx
interface ThemeContextType {
  theme: "light" | "dark";
  toggleTheme: () => void;
}

// Usage
const { theme, toggleTheme } = useTheme();
```

## Common Patterns

### Conditional Rendering Based on Theme

```tsx
const { theme } = useTheme();

{theme === "dark" ? (
  <DarkModeIcon />
) : (
  <LightModeIcon />
)}
```

### Theme-Aware Inline Styles

```tsx
const { theme } = useTheme();

<div style={{
  backgroundColor: theme === "dark" ? "#1e293b" : "#ffffff"
}}>
```

### Custom CSS Variables (if needed)

```tsx
// In your CSS
:root {
  --bg-primary: #ffffff;
  --text-primary: #0f172a;
}

.dark {
  --bg-primary: #1e293b;
  --text-primary: #f1f5f9;
}

// Usage
<div style={{ backgroundColor: "var(--bg-primary)" }}>
```

## Migration Guide

### Converting Existing Components

1. **Add dark mode classes to all color-related classes**:
   ```tsx
   // Before
   className="bg-white text-gray-900"
   
   // After
   className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
   ```

2. **Add transition-colors for smooth transitions**:
   ```tsx
   className="bg-white dark:bg-slate-800 transition-colors"
   ```

3. **Update all gray colors to slate**:
   ```tsx
   // Before
   text-gray-600 bg-gray-50 border-gray-200
   
   // After
   text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-700
   ```

4. **Test in both themes**:
   - Switch theme using settings or avatar menu
   - Verify all elements are visible and readable
   - Check interactive states (hover, focus, active)

## Troubleshooting

### Theme Not Applying

1. **Check ThemeProvider**: Ensure your app is wrapped in `ThemeProvider`
2. **Check localStorage**: Verify theme is being saved: `localStorage.getItem("theme")`
3. **Check DOM**: Inspect `document.documentElement` for `dark` class
4. **Check Tailwind Config**: Ensure `darkMode: "class"` is set in `tailwind.config.js`

### Styles Not Updating

1. **Verify dark: variant**: Ensure you're using `dark:` prefix correctly
2. **Check class order**: Dark mode classes should come after base classes
3. **Check specificity**: Ensure dark mode classes aren't being overridden

### Inconsistent Theme State

1. **Single Source of Truth**: Always use `useTheme()` hook, never store theme in component state
2. **Avoid Direct localStorage**: Don't read/write to localStorage directly, use the context

## File Structure

```
src/
├── contexts/
│   └── ThemeContext.tsx          # Theme context provider
├── pages/
│   └── creator/
│       └── CreatorSettingsSafetyPage.tsx  # Settings page with theme toggle
└── components/
    └── AvatarMenuDropdown.tsx    # Alternative theme toggle location
```

## Examples

### Complete Component Example

```tsx
import React from "react";
import { useTheme } from "../../contexts/ThemeContext";

function ExampleComponent() {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <div className="min-h-screen bg-[#f2f2f2] dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors">
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 transition-colors">
        <h2 className="text-slate-900 dark:text-slate-100 font-bold">
          Example Component
        </h2>
        <p className="text-slate-600 dark:text-slate-300 mt-2">
          This component adapts to the current theme.
        </p>
        <button
          onClick={toggleTheme}
          className="mt-4 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
        >
          Toggle Theme (Current: {theme})
        </button>
      </div>
    </div>
  );
}
```

## Summary

- **Theme Context**: Centralized theme management via React Context
- **Tailwind CSS**: Use `dark:` variant for dark mode styles
- **Persistence**: Automatic localStorage persistence
- **Settings**: Theme toggle available in Settings page
- **Consistency**: Use standard slate color palette
- **Transitions**: Always include `transition-colors` for smooth theme changes

For questions or issues, refer to:
- `src/contexts/ThemeContext.tsx` - Theme implementation
- `src/pages/creator/CreatorSettingsSafetyPage.tsx` - Settings integration
- `DARK_MODE_PATTERNS.md` - Additional dark mode patterns

