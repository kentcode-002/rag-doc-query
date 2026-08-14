import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./lib/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0A0A0B",
        surface: "#141416",
        surface2: "#1C1C1F",
        edge: "#26262A",
        ink: "#F2F1EE",
        muted: "#8B8B90",
        accent: "#C4302B",
        "accent-bright": "#FF4438",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
      keyframes: {
        riseIn: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        stampIn: {
          "0%": { opacity: "0", transform: "rotate(-8deg) scale(0.85)" },
          "100%": { opacity: "1", transform: "rotate(-4deg) scale(1)" },
        },
      },
      animation: {
        riseIn: "riseIn 0.25s ease-out",
        stampIn: "stampIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
    },
  },
  plugins: [],
};
export default config;
