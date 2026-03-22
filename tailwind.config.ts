import type { Config } from "tailwindcss";

export default {
  // Keep Tailwind scanning restricted to source files only.
  // This prevents Tailwind from trying to parse binary assets as text.
  content: ["./src/**/*.{js,ts,jsx,tsx,md,mdx,css}"],
} satisfies Config;

