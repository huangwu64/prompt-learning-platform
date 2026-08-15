/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      // ===== 宣传页蓝白体系（landing.html 品牌一致）：白底 + 靛蓝 + 绿点缀 =====
      colors: {
        // blue 色板 → 靛蓝系（宣传页品牌主色 #4B3FE3）
        blue: {
          50: "#F3F2FD",
          100: "#E7E5FB",
          200: "#CFCBF6",
          300: "#A9A3F0",
          400: "#8378EA",
          500: "#6B5BFF", // 靛蓝亮阶
          600: "#4B3FE3", // 宣传页品牌主色
          700: "#3D31D6", // hover 加深
          800: "#2E26A6",
          900: "#211B7C",
          950: "#140F4A",
        },
        // violet → 靛蓝渐变亮阶
        violet: {
          400: "#8F86F5",
          500: "#7A6FF0",
          600: "#6B5BFF",
        },
        // accent → 宣传页语义绿（正向 / 成功）
        accent: {
          50: "#E6FAF1",
          100: "#CCF5E3",
          200: "#99EBC7",
          300: "#66E1AB",
          400: "#33D78F",
          500: "#00B983",
          600: "#009A6F",
          700: "#007A58",
          800: "#005C42",
          900: "#003E2C",
        },
        // 语义层（宣传页浅色：白底 + 靛蓝文字 + 蓝灰中性）
        app: {
          bg: "#F6F7F9", // 页面背景（暖白蓝）
          surface: "#FFFFFF", // 卡片表面
          chrome: "#F0F1F4", // hover / 徽标底
          border: "#E5E6EA", // 卡片边框
          borderStrong: "#D6D8DE", // 输入框边框
          fg: "#171717", // 主文字（近黑）
          t2: "#3A3A3A", // 次级文字
          t3: "#737373", // 弱化文字
          t4: "#A0A0A8", // placeholder / 禁用
        },
      },
      fontFamily: {
        // 宣传页正文：Outfit
        sans: [
          "Outfit",
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "PingFang SC",
          "Microsoft YaHei",
          "sans-serif",
        ],
        // 宣传页标题：衬线 Noto Serif SC
        display: [
          "Noto Serif SC",
          "Songti SC",
          "Georgia",
          "'Times New Roman'",
          "serif",
        ],
      },
    },
  },
  plugins: [],
};
