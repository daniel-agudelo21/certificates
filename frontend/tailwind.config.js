/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#F7F5FC',
        line: '#E7E2F3',
        ink: {
          DEFAULT: '#38364F',
          soft: '#5E5B7A',
          muted: '#6F6C8C',
        },
        lilac: { 50: '#F6F3FD', 100: '#EEE9FB', 200: '#DDD3F7', 300: '#C5B6EF', 400: '#AB99E6', 500: '#8F7BD6', 700: '#5B4A9E' },
        mint: { 100: '#E3F5EC', 200: '#C7EBDB', 300: '#A7DEC6', 700: '#2F6B53' },
        peach: { 100: '#FFEEE6', 200: '#FFDCCB', 300: '#FFC4AB', 700: '#9A4F33' },
        sky: { 100: '#E4F1FB', 200: '#CBE5F7', 300: '#A9D3F0', 700: '#2F6592' },
        butter: { 100: '#FDF5D8', 200: '#FAEBB0', 300: '#F4DC86', 700: '#7A6420' },
        rose: { 100: '#FDE8EC', 200: '#F7C5CF', 700: '#9E2F47' },
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        sans: ['Figtree', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        soft: '0 1px 2px rgb(91 74 158 / 0.06), 0 8px 24px -10px rgb(91 74 158 / 0.14)',
        lift: '0 2px 4px rgb(91 74 158 / 0.06), 0 24px 48px -16px rgb(91 74 158 / 0.28)',
      },
      borderRadius: {
        card: '1.5rem',
        field: '0.875rem',
      },
    },
  },
  plugins: [],
}
