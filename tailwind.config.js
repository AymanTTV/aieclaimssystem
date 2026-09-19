/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#423fbd',
          50: '#eef0ff',
          100: '#e0e4ff',
          200: '#c5cbff',
          300: '#a1a9ff',
          400: '#7a7bff',
          500: '#5651f8',
          600: '#423fbd',
          700: '#34309a',
          800: '#2a287e',
          900: '#212049',
        },
        secondary: {
          DEFAULT: '#40b6cb',
          50: '#e0f9fd',
          100: '#b4f0fa',
          200: '#75e4f5',
          300: '#40b6cb',
          400: '#289eb2',
          500: '#1b7f91',
          600: '#156575',
          700: '#12525f',
        }
      },
      boxShadow: {
        'input': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'input-focus': '0 0 0 2px rgba(66, 63, 189, 0.2)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
};