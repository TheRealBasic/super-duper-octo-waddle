module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: '#1f2333',
        sidebar: '#161a29',
        accent: '#5865f2',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
