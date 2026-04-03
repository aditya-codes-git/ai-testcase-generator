/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#09090b',
        foreground: '#FAFAFA',
        primary: {
          DEFAULT: '#8b5cf6',
          foreground: '#FFFFFF',
        },
        card: {
          DEFAULT: '#18181A',
          foreground: '#FAFAFA',
        },
        border: '#27272A',
        muted: {
          DEFAULT: '#27272A',
          foreground: '#A1A1AA',
        }
      },
    },
  },
  plugins: [],
}
