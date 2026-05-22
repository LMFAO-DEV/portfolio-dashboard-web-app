/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        page: '#0f1117',
        surface: {
          DEFAULT: '#171923',
          raised: '#1e2130',
          border: '#2b2f45',
        },
        gain: '#16c784',
        loss: '#ea3943',
        accent: '#3861fb',
        muted: '#808a9d',
        faint: '#58617a',
      },
    },
  },
  plugins: [],
}

