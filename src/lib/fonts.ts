import localFont from "next/font/local";

/**
 * Barlow (SIL OFL 1.1), self-hosted from licensed files in src/assets/fonts (no runtime call to Google).
 * Only the variants actually used are loaded: 400 text, 500 labels/navigation, 600 headings, 700 emphasis,
 * plus Barlow Semi Condensed 400/500/600 for dense tables and charts. System sans-serif is the fallback.
 */
export const barlow = localFont({
  src: [
    { path: "../assets/fonts/barlow-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../assets/fonts/barlow-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../assets/fonts/barlow-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "../assets/fonts/barlow-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-barlow",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

export const barlowSemiCondensed = localFont({
  src: [
    { path: "../assets/fonts/barlow-semi-condensed-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../assets/fonts/barlow-semi-condensed-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../assets/fonts/barlow-semi-condensed-latin-600-normal.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-barlow-semi-condensed",
  display: "swap",
  preload: false,
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

export const fontVariables = `${barlow.variable} ${barlowSemiCondensed.variable}`;
