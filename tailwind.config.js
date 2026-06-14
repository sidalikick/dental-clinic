/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#0ea5e9", // Sky 500
        secondary: "#14b8a6", // Teal 500
        dark: "#1e293b", // Slate 800
        light: "#f8fafc", // Slate 50
      },
      fontFamily: {
        sans: ['Tajawal', 'Cairo', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
