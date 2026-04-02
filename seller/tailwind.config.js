/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    // Standardized Border Radius
    borderRadius: {
      none: "0",
      sm: "4px",
      DEFAULT: "6px", // Base radius for cards, buttons, inputs
      md: "6px",
      lg: "8px",
      xl: "10px",
      "2xl": "12px",
      "3xl": "14px", // Large cards, hero sections
      full: "9999px", // Pills, badges
    },
    extend: {
      // Standardized Color Palette
      colors: {
        // Semantic theme tokens (CSS vars)
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Brand Colors
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          light: "#34D9A5",
          dark: "#02B877",
          50: "#E6FBF3",
          100: "#CCF7E7",
          500: "#03CD8C",
          600: "#02B877",
          700: "#029E66",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
          light: "#FF9A33",
          dark: "#E06800",
          50: "#FFF3E6",
          100: "#FFE7CC",
          500: "#F77F00",
          600: "#E06800",
          700: "#C85A00",
        },
        // Semantic Colors
        success: {
          DEFAULT: "#10B981",
          light: "#34D399",
          dark: "#059669",
          50: "#ECFDF5",
          500: "#10B981",
          600: "#059669",
        },
        warning: {
          DEFAULT: "#F59E0B",
          light: "#FBBF24",
          dark: "#D97706",
          50: "#FFFBEB",
          500: "#F59E0B",
          600: "#D97706",
        },
        error: {
          DEFAULT: "#EF4444",
          light: "#F87171",
          dark: "#DC2626",
          50: "#FEF2F2",
          500: "#EF4444",
          600: "#DC2626",
        },
        // Neutral Colors
        ink: {
          DEFAULT: "#111827", // Primary text
          50: "#F9FAFB",
          100: "#F3F4F6",
          200: "#E5E7EB",
          300: "#D1D5DB",
          400: "#9CA3AF",
          500: "#6B7280",
          600: "#4B5563",
          700: "#374151",
          800: "#1F2937",
          900: "#111827",
        },
        // Legacy compatibility
        "ev-green": "#03CD8C",
        "ev-orange": "#F77F00",
        "ev-orange-dark": "#e06800",
        "ev-ink": "#111827",
      },
      // Standardized Typography
      fontFamily: {
        sans: [
          "Söhne",
          "Soehne",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Helvetica",
          "Arial",
          "Apple Color Emoji",
          "Segoe UI Emoji",
        ],
      },
      fontSize: {
        xs: ["12px", { lineHeight: "1.5", letterSpacing: "0" }],
        sm: ["14px", { lineHeight: "1.5", letterSpacing: "0" }],
        base: ["16px", { lineHeight: "1.5", letterSpacing: "0" }],
        lg: ["18px", { lineHeight: "1.4", letterSpacing: "-0.01em" }],
        xl: ["20px", { lineHeight: "1.4", letterSpacing: "-0.01em" }],
        "2xl": ["24px", { lineHeight: "1.3", letterSpacing: "-0.02em" }],
        "3xl": ["28px", { lineHeight: "1.25", letterSpacing: "-0.02em" }],
        "4xl": ["32px", { lineHeight: "1.2", letterSpacing: "-0.03em" }],
      },
      fontWeight: {
        normal: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
        extrabold: 800,
      },
      // Standardized Spacing Scale
      spacing: {
        // Base scale: 4px increments
        0: "0",
        1: "4px",
        2: "8px",
        3: "12px",
        4: "16px",
        5: "20px",
        6: "24px",
        8: "32px",
        10: "40px",
        12: "48px",
        16: "64px",
        20: "80px",
        24: "96px",
      },
      // Standardized Shadows
      boxShadow: {
        none: "none",
        sm: "0 1px 2px 0 rgba(15, 23, 42, 0.05)",
        DEFAULT: "0 4px 6px -1px rgba(15, 23, 42, 0.1), 0 2px 4px -1px rgba(15, 23, 42, 0.06)",
        md: "0 8px 12px -2px rgba(15, 23, 42, 0.1), 0 4px 6px -2px rgba(15, 23, 42, 0.05)",
        lg: "0 12px 24px -4px rgba(15, 23, 42, 0.12), 0 8px 12px -4px rgba(15, 23, 42, 0.08)",
        xl: "0 20px 32px -8px rgba(15, 23, 42, 0.15), 0 12px 16px -4px rgba(15, 23, 42, 0.1)",
        // Custom shadows for cards
        "soft-card": "0 18px 46px -32px rgba(15, 23, 42, 0.35)",
        "card": "0 4px 12px -2px rgba(15, 23, 42, 0.08), 0 2px 4px -1px rgba(15, 23, 42, 0.04)",
        "card-hover": "0 8px 20px -4px rgba(15, 23, 42, 0.12), 0 4px 8px -2px rgba(15, 23, 42, 0.06)",
      },
      // Container Max Widths
      maxWidth: {
        "page": "1280px", // Standard page width
        "content": "1120px", // Content area width
        "narrow": "768px", // Narrow content
      },
    },
  },
  plugins: [],
};
