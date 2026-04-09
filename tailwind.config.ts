import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bridge: {
          bg: '#060b15',
          panel: '#0f172a',
          border: '#1f2a44',
          accent: '#3b82f6'
        }
      }
    }
  },
  plugins: []
};

export default config;
