/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#0a0a0f',
        foreground: '#e2e8f0',
        primary: {
          DEFAULT: '#6366f1',
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: '#1e1e2e',
          foreground: '#a1a1b5',
        },
        accent: {
          DEFAULT: '#22d3ee',
          foreground: '#0a0a0f',
        },
        muted: {
          DEFAULT: '#1a1a2e',
          foreground: '#6b7280',
        },
        card: {
          DEFAULT: '#111118',
          foreground: '#e2e8f0',
        },
        border: '#2a2a3e',
        input: '#1e1e2e',
        ring: '#6366f1',
        positive: '#22c55e',
        negative: '#ef4444',
        warning: '#f59e0b',
        info: '#22d3ee',
      },
      borderRadius: {
        DEFAULT: '0.5rem',
      },
      fontFamily: {
        sans: ['Geist', 'sans-serif'],
        mono: ['Geist Mono', 'monospace'],
      },
    },
  },
  plugins: [require('@tailwindcss/typography'), require('@tailwindcss/forms'), require('tailwindcss-animate')],
};
