import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        toy: {
          bg: "#fff8f0",
          accent: "#ff7a59",
          ink: "#1f1b16",
          soft: "#ffe5d4",
        },
      },
      fontFamily: {
        display: ['"Nunito"', '"Comfortaa"', "system-ui", "sans-serif"],
      },
      borderRadius: { xl2: "1.25rem" },
    },
  },
  plugins: [],
} satisfies Config;
