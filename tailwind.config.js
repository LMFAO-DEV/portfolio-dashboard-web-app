/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        gain: { DEFAULT: '#d8ecd8', text: '#166534' },
        loss: { DEFAULT: '#f4d6cf', text: '#991b1b' },
      },
    },
  },
  plugins: [],
}

