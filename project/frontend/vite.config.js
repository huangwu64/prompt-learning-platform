import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    server: {
        port: 5173,
        proxy: {
            "/api": {
                target: "http://localhost:8080",
                changeOrigin: true,
            },
        },
    },
    build: {
        // 沙箱环境禁止删除 dist（安全删除拦截），产物带 hash 覆盖即可
        emptyOutDir: false,
        // 多页面入口：/ = React 应用，/landing.html = 宣传页，同一个端口切换
        rollupOptions: {
            input: {
                main: path.resolve(__dirname, "index.html"),
                landing: path.resolve(__dirname, "landing.html"),
            },
        },
    },
});
