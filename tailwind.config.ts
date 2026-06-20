import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["system-ui", "-apple-system", "sans-serif"],
      },
      colors: {
        brand: {
          DEFAULT: "#1a56db",
          dark:    "#1e429f",
          glow:    "#76a9fa",
        },
      },
    },
  },
  plugins: [],
};
export default config;
