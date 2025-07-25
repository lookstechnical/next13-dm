import { type Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#0F111A", // Deep navy
        wkbackground: "#1A1D2D",
        card: "#0F111A", // Lighter card background
        border: "#2C2F3C",
        input: "#1F2333",
        ring: "#F8FAFC", // Vibrant yellow (accent)
        primary: "#FF0000",
        secondary: "#1E88E5", // Electric blue
        destructive: "#EF4444",
        muted: "#94A3B8",
        accent: "#3B82F6",
        popover: "#1A1D2D",
        foreground: "#F8FAFC",
      },
      borderColor: {
        card: "#000000",
      },
      borderRadius: {
        lg: "0rem",
        md: "0rem",
        sm: "0rem",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
