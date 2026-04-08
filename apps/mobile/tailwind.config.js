/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Backgrounds
        void: { DEFAULT: "#0A0A0C", light: "#FFFFFF" },
        surface: { DEFAULT: "#151518", light: "#F5F5F7" },
        elevated: { DEFAULT: "#1E1E22", light: "#EBEBED" },
        hover: { DEFAULT: "#252529", light: "#E0E0E2" },

        // Accent colors
        plasma: { DEFAULT: "#FF6B35", dim: "#CC5529", light: "#E55A2B" },
        violet: { DEFAULT: "#A78BFA", dim: "#8B6FD9", light: "#7C5CD9" },

        // Semantic colors
        success: { DEFAULT: "#3DDC84", light: "#22A563" },
        warning: { DEFAULT: "#FBBF24", light: "#D97706" },
        error: { DEFAULT: "#FF3366", light: "#DC2651" },
        info: { DEFAULT: "#60A5FA", light: "#2563EB" },

        // Text colors
        "text-primary": { DEFAULT: "#F5F5F5", light: "#0A0A0C" },
        "text-secondary": { DEFAULT: "#B8B8B8", light: "#4A4A4E" },
        "text-muted": { DEFAULT: "#6B6B6B", light: "#8A8A8E" },
      },
      fontFamily: {
        // Display font - Clash Display
        clash: ["ClashDisplay-Medium"],
        "clash-semibold": ["ClashDisplay-Semibold"],
        "clash-bold": ["ClashDisplay-Bold"],

        // Body font - Satoshi
        satoshi: ["Satoshi-Regular"],
        "satoshi-medium": ["Satoshi-Medium"],
        "satoshi-bold": ["Satoshi-Bold"],

        // Mono font - Geist Mono
        geist: ["GeistMono-Regular"],
        "geist-medium": ["GeistMono-Medium"],
      },
      fontSize: {
        // Typography scale from DESIGN.md
        display: ["48px", { lineHeight: "1.1", fontWeight: "700" }],
        h1: ["32px", { lineHeight: "1.2", fontWeight: "600" }],
        h2: ["24px", { lineHeight: "1.3", fontWeight: "600" }],
        h3: ["18px", { lineHeight: "1.4", fontWeight: "600" }],
        body: ["16px", { lineHeight: "1.5", fontWeight: "400" }],
        "body-sm": ["14px", { lineHeight: "1.5", fontWeight: "400" }],
        caption: ["12px", { lineHeight: "1.4", fontWeight: "500" }],
        mono: ["14px", { lineHeight: "1.5", fontWeight: "400" }],
      },
      spacing: {
        // Spacing scale from DESIGN.md (8px base)
        "2xs": "2px",
        xs: "4px",
        sm: "8px",
        md: "16px",
        lg: "24px",
        xl: "32px",
        "2xl": "48px",
        "3xl": "64px",
      },
      borderRadius: {
        sm: "4px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        full: "9999px",
      },
    },
  },
  plugins: [],
};
