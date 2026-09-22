/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        nikosh: ['Nikosh', 'sans-serif'],
        kalpurush: ['Kalpurush', 'sans-serif'],
        roboto: ['Roboto', 'sans-serif'],
        arial: ['Arial', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
