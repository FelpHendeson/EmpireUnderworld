/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        noir: {
          950: '#05020a',
          900: '#0b0714',
          800: '#120d1e',
          700: '#1a1329'
        },
        neon: {
          blue: '#4cc9f0',
          purple: '#7b2ff7',
          pink: '#ff4dcd',
          green: '#00f5d4',
          amber: '#f9c74f'
        }
      },
      boxShadow: {
        neon: '0 0 25px rgba(76, 201, 240, 0.25)'
      }
    }
  },
  plugins: []
};
