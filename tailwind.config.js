/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        agri: {
          50: "#E8F5E9",
          100: "#C8E6C9",
          200: "#A5D6A7",
          300: "#81C784",
          400: "#66BB6A",
          500: "#1B5E20",
          600: "#2E7D32",
          700: "#1B5E20",
          800: "#145214",
          900: "#0D3D0D",
        },
        soil: {
          50: "#EFEBE9",
          100: "#D7CCC8",
          200: "#BCAAA4",
          300: "#A1887F",
          400: "#8D6E63",
          500: "#6D4C41",
          600: "#5D4037",
          700: "#4E342E",
          800: "#3E2723",
        },
        warning: {
          1: "#FFF9C4",
          2: "#FFE082",
          3: "#FFAB40",
          accent: "#FFA000",
        },
        sky: {
          brand: "#0288D1",
        },
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', '"Source Han Serif CN"', 'Georgia', 'serif'],
        sans: ['"Noto Sans SC"', '"PingFang SC"', '"Hiragino Sans GB"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'agri': '0 4px 20px -4px rgba(27, 94, 32, 0.25)',
        'soil': '0 4px 20px -4px rgba(109, 76, 65, 0.25)',
      },
      backgroundImage: {
        'agri-gradient': 'linear-gradient(135deg, #1B5E20 0%, #2E7D32 50%, #66BB6A 100%)',
        'soil-gradient': 'linear-gradient(135deg, #6D4C41 0%, #8D6E63 50%, #A1887F 100%)',
        'warning-gradient': 'linear-gradient(135deg, #FFA000 0%, #FFAB40 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
