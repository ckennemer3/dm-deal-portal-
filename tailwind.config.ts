import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#e8f0fa',
          100: '#c5d9f2',
          200: '#9dbde6',
          300: '#74a1d9',
          400: '#4b85cd',
          500: '#1A569B',
          600: '#174d8b',
          700: '#213E69',
          800: '#1a3356',
          900: '#132843',
          950: '#0d1c2f',
        },
        surface: {
          0: '#ffffff',
          50: '#f7faf9',
          100: '#eef3f1',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#213E69',
          900: '#1a3356',
          950: '#1F1F1F',
        },
        status: {
          success: '#83E8AB',
          warning: '#FFBE0B',
          danger: '#DD0F15',
          info: '#1A569B',
        },
      },
      fontFamily: {
        sans: ['var(--font-roboto)', 'Roboto', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.5rem',
      },
      boxShadow: {
        'card': '0 1px 2px rgba(0, 0, 0, 0.04)',
        'card-hover': '0 1px 3px rgba(0, 0, 0, 0.06)',
        'modal': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      },
      animation: {
        'fade-in': 'fadeIn 0.15s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
        'slide-down': 'slideDown 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
