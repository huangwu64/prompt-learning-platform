/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      // ===== TRAE 浅色统一（与官网宣传页一致：白底 + 靛蓝主色 + 绿点缀） =====
      colors: {
        // 覆盖 Tailwind 默认 blue 色板 → 全站 blue-* 类自动换为 TRAE 靛蓝系
        blue: {
          50: "#F3F2FD",
          100: "#E7E5FB",
          200: "#CFCBF6",
          300: "#A9A3F0",
          400: "#8378EA",
          500: "#6B5BFF",
          600: "#4B3FE3", // 品牌主色（靛蓝，按钮 / 强调）
          700: "#3D31D6", // hover 加深
          800: "#2E26A6",
          900: "#211B7C",
          950: "#140F4A",
        },
        // 绿色强调（TRAE 绿，正向提示 / 成功状态）
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
        // 语义色板（TRAE 浅色工作台）
        app: {
          bg: "#F6F7F9", // 页面背景（暖白灰）
          surface: "#FFFFFF", // 卡片 / 侧栏
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
        sans: [
          "Outfit",
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Helvetica Neue",
          "Arial",
          "PingFang SC",
          "Microsoft YaHei",
          "sans-serif",
        ],
        // 衬线标题（与宣传页 Noto Serif SC 一致，编辑感）
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
