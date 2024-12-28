/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#DC2626',
          50: '#FEE2E2',
          100: '#FCA5A5',
          200: '#F87171',
          300: '#EF4444',
          400: '#DC2626',
          500: '#B91C1C',
          600: '#991B1B',
          700: '#7F1D1D',
        },
        secondary: {
          DEFAULT: '#16A34A',
          50: '#DCFCE7',
          100: '#BBF7D0',
          200: '#86EFAC',
          300: '#4ADE80',
          400: '#22C55E',
          500: '#16A34A',
          600: '#15803D',
          700: '#166534',
        }
      },
      boxShadow: {
        'input': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'input-focus': '0 0 0 2px rgba(220, 38, 38, 0.1)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
};