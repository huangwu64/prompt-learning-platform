import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

/**
 * 宣传页（/landing）路由承载层。
 *
 * 设计说明：landing.html 是自包含的独立文档（自身 <head> 样式 + body 级布局 +
 * 粒子/滚动渐入/磁性按钮等原生脚本）。为与静态版逐像素一致、避免被 React 全局样式
 * 与 StrictMode 双执行干扰，这里用同源 iframe 承载该文件（开发与产物都由 Vite 提供）：
 *  - 文档内的 CSS / 脚本 / 锚点滚动原样生效，宣传页本体无需任何改造；
 *  - 点击其中「开始学习」等 [data-link] 入口时，统一在父文档跳转到登录页 /login
 *    （登录成功后再进入工作台 /app），不因本地残留登录态而越级直进工作台。
 *  - 未来的宣传页文案/视觉修改仍在 landing.html 中维护。
 */
export default function LandingPage() {
  const navigate = useNavigate();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    let cleanupDoc: (() => void) | undefined;

    const onLoad = () => {
      cleanupDoc?.();
      const win = iframe.contentWindow;
      const doc = win?.document;
      if (!doc) return;

      // 拦截宣传页内「进入应用」类入口，改为父级 SPA 路由（不整页刷新）
      const onClick = (ev: MouseEvent) => {
        const anchor = (ev.target as HTMLElement | null)?.closest?.(
          "a[data-link]"
        ) as HTMLAnchorElement | null;
        if (!anchor) return;

        const kind = anchor.getAttribute("data-link");
        // app / footer 均为「进应用」入口：一律先进登录页，登录后再进工作台
        if (kind === "app" || kind === "footer") {
          ev.preventDefault();
          ev.stopPropagation();
          navigate("/login");
        }
        // email(mailto) / 站内锚点 交由宣传页自身处理
      };

      doc.addEventListener("click", onClick);
      cleanupDoc = () => doc.removeEventListener("click", onClick);
    };

    iframe.addEventListener("load", onLoad);
    return () => {
      cleanupDoc?.();
      iframe.removeEventListener("load", onLoad);
    };
  }, [navigate]);

  return (
    <div style={{ height: "100dvh", width: "100%" }}>
      <iframe
        ref={iframeRef}
        title="Spark · 零基础学AI 宣传页"
        src="/landing.html"
        sandbox="allow-scripts allow-same-origin"
        style={{ display: "block", width: "100%", height: "100%", border: 0 }}
      />
    </div>
  );
}
