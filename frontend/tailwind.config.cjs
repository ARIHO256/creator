
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        evz: {
          orange: "#f77f00",
          teal: "#03cd8c",
          light: "#f2f2f2",
          dark: "#1f2933"
        }
      },
      borderRadius: {
        "2xl": "1rem"
      },
      fontSize: {
        // Centralized font size system - change these values to adjust all fonts globally
        // Base font size is 16px (set in index.css)
        
        // Tiny sizes (for badges, labels, captions)
        'tiny': ['0.6875rem', { lineHeight: '1rem' }],        // ~11px
        'xs': ['0.75rem', { lineHeight: '1.125rem' }],       // ~12px
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],        // ~14px
        
        // Standard sizes
        'base': ['1rem', { lineHeight: '1.5rem' }],           // 16px - base size
        'md': ['0.9375rem', { lineHeight: '1.375rem' }],     // ~15px
        'lg': ['1.125rem', { lineHeight: '1.625rem' }],       // ~18px
        
        // Large sizes
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],         // 20px
        '2xl': ['1.5rem', { lineHeight: '2rem' }],            // 24px
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],       // 30px
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],         // 36px
        '5xl': ['3rem', { lineHeight: '1' }],                 // 48px
      }
    }
  },
  plugins: []
};
