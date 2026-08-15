import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

/* ===== 全局滚动渐入（宣传页 reveal 同款机制，渐进增强） =====
   元素默认可见；扫描到 .wb-reveal 后加 .init（隐藏）+ 进入视口加 .in（显示）。
   双 RAF 等待 React 首屏 commit，MutationObserver 兜底模块切换/懒加载挂载的元素。 */
(function () {
  if (!("IntersectionObserver" in window)) return; // 无 IO：保持元素默认可见

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) en.target.classList.add("in");
        else en.target.classList.remove("in"); // 离开视口恢复，可重播
      });
    },
    { threshold: 0.12 }
  );

  const observed = new Set<Element>();
  const scan = () => {
    document.querySelectorAll(".wb-reveal").forEach((el) => {
      if (!observed.has(el)) {
        observed.add(el);
        el.classList.add("init"); // 现在才隐藏，等待渐入
        io.observe(el);
      }
    });
  };

  // 等 React 首屏渲染 commit 完成后再扫描
  requestAnimationFrame(() => requestAnimationFrame(scan));
  if (typeof MutationObserver !== "undefined") {
    new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
  }
})();
