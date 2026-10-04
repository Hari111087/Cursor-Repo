import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1rem" },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        popover: { DEFAULT: "hsl(var(--popover))", foreground: "hsl(var(--popover-foreground))" },
        primary: { DEFAULT: "rgb(var(--cyan) / <alpha-value>)", foreground: "#0A0E27" },
        secondary: { DEFAULT: "rgb(var(--violet) / <alpha-value>)", foreground: "#ffffff" },
        accent: { DEFAULT: "rgb(var(--magenta) / <alpha-value>)", foreground: "#ffffff" },
        cyan: "rgb(var(--cyan) / <alpha-value>)",
        violet: "rgb(var(--violet) / <alpha-value>)",
        magenta: "rgb(var(--magenta) / <alpha-value>)",
        gold: "rgb(var(--gold) / <alpha-value>)",
        success: "rgb(var(--success) / <alpha-value>)",
        danger: "rgb(var(--danger) / <alpha-value>)",
        space: { 950: "#0A0E27", 900: "#111735", 800: "#1a2150" },
      },
      fontFamily: {
        display: ["var(--font-orbitron)", "ui-sans-serif", "system-ui"],
        script: ["var(--font-script)", "cursive"],
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui"],
      },
      borderRadius: { lg: "1rem", md: "0.75rem", sm: "0.5rem" },
      boxShadow: {
        glow: "0 0 24px rgb(var(--cyan) / 0.35)",
        "glow-violet": "0 0 24px rgb(var(--violet) / 0.35)",
        "glow-magenta": "0 0 24px rgb(var(--magenta) / 0.35)",
      },
      keyframes: {
        "grid-pan": { from: { backgroundPosition: "0 0" }, to: { backgroundPosition: "48px 48px" } },
        shimmer: { from: { backgroundPosition: "200% 0" }, to: { backgroundPosition: "-200% 0" } },
      },
      animation: {
        "grid-pan": "grid-pan 6s linear infinite",
        shimmer: "shimmer 2.5s linear infinite",
      },
    },
  },
  plugins: [animate],
};

export default config;
