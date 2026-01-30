/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
 theme: {
  extend: {
    animation: {
      'fade-in': 'fadeIn 0.2s ease-in',
      'zoom-in': 'zoomIn 0.2s ease-out',
    },
    keyframes: {
      fadeIn: {
        '0%': { opacity: '0' },
        '100%': { opacity: '1' },
      },
      zoomIn: {
        '0%': { transform: 'scale(0.95)' },
        '100%': { transform: 'scale(1)' },
      },
    },
  },
},  plugins: [],
}