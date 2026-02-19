/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        felt: {
          DEFAULT: '#1a5c2a',
          dark: '#0f3d1a',
          light: '#2d7a3f',
        },
        gold: {
          DEFAULT: '#d4a844',
          light: '#e8c36a',
          dark: '#b8922e',
        },
        card: {
          red: '#dc2626',
          black: '#1a1a2e',
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 8px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)',
        'card-hover': '0 8px 24px rgba(0,0,0,0.4), 0 2px 6px rgba(0,0,0,0.3)',
        glow: '0 0 20px rgba(212, 168, 68, 0.3)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};
