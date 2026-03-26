import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        category: {
          dump: "#C4572A",
          overflow: "#E8A838",
          uncollected: "#5C6B3A",
          other: "#8A7F6E",
        },
      },
    },
  },
  plugins: [],
};
export default config;
