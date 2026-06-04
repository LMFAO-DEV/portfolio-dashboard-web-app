/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ["sohne-var", "'Inter'", "'SF Pro Display'", 'system-ui', '-apple-system', 'sans-serif'],
        display: ["sohne-var", "'Inter'", "'SF Pro Display'", 'system-ui', '-apple-system', 'sans-serif'],
        label: ["sohne-var", "'Inter'", "'SF Pro Display'", 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        // Brand — indigo primary
        primary: {
          DEFAULT: '#533afd',
          deep: '#4434d4',
          press: '#2e2b8c',
          soft: '#665efd',
          subdued: '#b9b9f9',
        },
        'brand-dark': '#1c1e54',

        // Text
        ink: {
          DEFAULT: '#0d253d',
          secondary: '#273951',
          mute: '#64748d',
          'mute-2': '#61718a',
        },

        // Surfaces
        canvas: {
          DEFAULT: '#ffffff',
          soft: '#f6f9fc',
          cream: '#f5e9d4',
        },

        // Borders
        hairline: {
          DEFAULT: '#e3e8ee',
          input: '#a8c3de',
        },

        // Gradient-mesh accent stops (not for buttons)
        ruby: '#ea2261',
        magenta: '#f96bee',
        lemon: '#9b6829',
        'shadow-blue': '#003770',

        // Financial semantic (portfolio-specific)
        gain: '#00A63D',
        loss: '#FF2157',
        warning: '#FE9900',

        // Backward-compat aliases for existing components
        page: '#f6f9fc',        // → canvas.soft
        muted: '#64748d',       // → ink.mute
        faint: '#61718a',       // → ink.mute-2
        accent: '#533afd',      // → primary
        surface: {
          DEFAULT: '#f6f9fc',   // → canvas.soft
          raised: '#ffffff',    // → canvas
          border: '#e3e8ee',    // → hairline
        },
      },
      borderRadius: {
        xs: '4px',
        sm: '6px',
        DEFAULT: '8px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        pill: '9999px',
      },
      boxShadow: {
        // Elevation level 1 — card lift on white
        card: 'rgba(0,55,112,0.08) 0 1px 3px',
        // Elevation level 2 — floating panels / dashboard chrome
        panel: 'rgba(0,55,112,0.08) 0 8px 24px, rgba(0,55,112,0.04) 0 2px 6px',
      },
      letterSpacing: {
        'display-xxl': '-0.025em', // -1.4px at 56px
        'display-xl': '-0.02em',   // -0.96px at 48px
        'display-lg': '-0.02em',   // -0.64px at 32px
        'display-md': '-0.01em',   // -0.26px at 26px
        'heading': '-0.01em',      // -0.2px at 20px
        'tabular': '-0.03em',      // -0.42px at 14px
        'caption': '-0.03em',      // -0.39px at 13px
      },
    },
  },
  plugins: [],
}
