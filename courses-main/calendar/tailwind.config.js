/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: "white",
        foreground: "rgb(var(--foreground))",
      },
      fontFamily: {
        montserrat: ['Montserrat', 'sans-serif'],
        xolonium: ['Xolonium', 'sans-serif'],
      },
    },
  },
  plugins: [],
};