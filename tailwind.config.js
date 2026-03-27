/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#4caf50', // Màu xanh chủ đạo (bạn có thể sửa sau)
      }
    },
  },
  plugins: [],
}