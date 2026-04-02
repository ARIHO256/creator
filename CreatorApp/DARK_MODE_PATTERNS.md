# Dark Mode Update Patterns

This document lists the Tailwind class patterns that need dark mode variants added.

## Common Patterns to Update:

1. **Backgrounds:**
   - `bg-white` → `bg-white dark:bg-slate-800`
   - `bg-evz-light` → `bg-evz-light dark:bg-slate-900`
   - `bg-slate-50` → `bg-slate-50 dark:bg-slate-700/50`
   - `bg-slate-100` → `bg-slate-100 dark:bg-slate-700`
   - `bg-slate-200` → `bg-slate-200 dark:bg-slate-600`

2. **Text Colors:**
   - `text-slate-900` → `text-slate-900 dark:text-slate-100`
   - `text-slate-700` → `text-slate-700 dark:text-slate-200`
   - `text-slate-600` → `text-slate-600 dark:text-slate-300`
   - `text-slate-500` → `text-slate-500 dark:text-slate-400`
   - `text-slate-400` → `text-slate-400 dark:text-slate-500`

3. **Borders:**
   - `border-slate-200` → `border-slate-200 dark:border-slate-700`
   - `border-slate-100` → `border-slate-100 dark:border-slate-700`
   - `border-slate-300` → `border-slate-300 dark:border-slate-600`

4. **Hover States:**
   - `hover:bg-slate-50` → `hover:bg-slate-50 dark:hover:bg-slate-700`
   - `hover:bg-white` → `hover:bg-white dark:hover:bg-slate-700`
   - `hover:bg-slate-100` → `hover:bg-slate-100 dark:hover:bg-slate-600`

5. **Add transition-colors:**
   - Add `transition-colors` to elements with dark mode variants

## Pages Updated:
- ✅ TopBar
- ✅ Sidebar
- ✅ FooterNav
- ✅ MoneyBar
- ✅ CommandPalette
- ✅ EarningsPanel
- ✅ CreatorShellLayout (main container)

## Pages to Update:
All pages in `src/pages/creator/` need dark mode classes added.

