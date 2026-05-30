/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#18C7D1",
        accent: "#4C8DFF",
        creative: "#9A6BFF",
        energy: "#FF8A3D",
        optimism: "#FFD24A",
        surface: "#F5F7FA",
        "text-soft": "#5F6B7A",
        "text-strong": "#1B2A41",
      },
      fontFamily: {
        heading: ['"Poppins"', "sans-serif"],
        body: ['"Nunito Sans"', "sans-serif"],
      },
      borderRadius: {
        button: "0.75rem",
        card: "1rem",
      },
      backgroundImage: {
        "gradient-main": "linear-gradient(135deg, #18C7D1, #4C8DFF)",
        "gradient-creative": "linear-gradient(135deg, #4C8DFF, #9A6BFF)",
        "gradient-energy": "linear-gradient(135deg, #FF8A3D, #FFD24A)",
      },
    },
  },
  plugins: [],
};
