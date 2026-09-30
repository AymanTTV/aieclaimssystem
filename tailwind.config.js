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
        },
        success: {
          DEFAULT: 'var(--color-success, #059669)',
          dark: 'var(--color-success-dark, #047857)',
          light: 'var(--color-success-light, #10B981)',
          bg: 'var(--color-success-bg, #ECFDF5)',
          border: 'var(--color-success-border, #A7F3D0)',
        },
        danger: {
          DEFAULT: 'var(--color-danger, #DC2626)',
          dark: 'var(--color-danger-dark, #B91C1C)',
          light: 'var(--color-danger-light, #EF4444)',
          bg: 'var(--color-danger-bg, #FEF2F2)',
          border: 'var(--color-danger-border, #FECACA)',
        },
        warning: {
          DEFAULT: 'var(--color-warning, #D97706)',
          dark: 'var(--color-warning-dark, #B45309)',
          light: 'var(--color-warning-light, #F59E0B)',
          bg: 'var(--color-warning-bg, #FFFBEB)',
          border: 'var(--color-warning-border, #FDE68A)',
        },
        financial: {
          total: 'var(--color-total, #D97706)',
          'total-bg': 'var(--color-total-bg, #FFFBEB)',
          'total-border': 'var(--color-total-border, #FDE68A)',
          paid: 'var(--color-paid, #059669)',
          'paid-dark': 'var(--color-paid-dark, #047857)',
          'paid-bg': 'var(--color-paid-bg, #ECFDF5)',
          'paid-border': 'var(--color-paid-border, #A7F3D0)',
          owing: 'var(--color-owing, #DC2626)',
          'owing-dark': 'var(--color-owing-dark, #B91C1C)',
          'owing-bg': 'var(--color-owing-bg, #FEF2F2)',
          'owing-border': 'var(--color-owing-border, #FECACA)',
          dealer: 'var(--color-dealer, #475569)',
          'dealer-bg': 'var(--color-dealer-bg, #F8FAFC)',
          'dealer-border': 'var(--color-dealer-border, #E2E8F0)',
          profit: 'var(--color-profit, #059669)',
          loss: 'var(--color-loss, #DC2626)',
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