import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
      },
      colors: {
        brand: {
          green: "#10BD91",
          "green-dark": "#0C8E6D",
          muted: "#6B6B6B",
          bg: "#FAF8F5",
        },
      },
      borderRadius: {
        pill: "100px",
        card: "12px",
      },
    },
  },
  plugins: [],
};

export default config;
