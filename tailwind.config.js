/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'media',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Rubik', 'Arial', 'Helvetica', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
