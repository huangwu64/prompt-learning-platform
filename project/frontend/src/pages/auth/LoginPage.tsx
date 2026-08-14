import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion, useMotionValue, useSpring } from "framer-motion";
import { Loader2, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useAuthStore } from "@/store/authStore";
import { ParticleField } from "@/components/common/ParticleField";
import { authService } from "@/services/authService";
import type { LoginRequest } from "@/types";

/** 品牌副标语（与宣传落地页一致） */
const TAGLINE = "零基础学AI · 提问的深度，决定答案的高度";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FieldErrors = { email?: string; password?: string; username?: string };

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const reduceMotion = useReducedMotion();

  // 3D 悬浮（景深）：鼠标移动时卡片轻微倾斜
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 220, damping: 24 });
  const sry = useSpring(ry, { stiffness: 220, damping: 24 });

  const handleTilt = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reduceMotion) return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    ry.set(px * 7);
    rx.set(-py * 6);
  };
  const resetTilt = () => {
    rx.set(0);
    ry.set(0);
  };

  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [shake, setShake] = useState(false);
  const [form, setForm] = useState<LoginRequest & { username?: string }>({
    email: "",
    password: "",
    username: "",
  });

  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

  /** 字段级校验（与接口文档错误文案一致） */
  const validate = (): boolean => {
    const fe: FieldErrors = {};
    const email = form.email.trim();
    if (!email) fe.email = "请输入邮箱";
    else if (!EMAIL_RE.test(email)) fe.email = "邮箱格式不合法";
    if (!form.password) fe.password = "请输入密码";
    else if (form.password.length < 6) fe.password = "密码至少 6 位";
    if (!isLogin) {
      const name = (form.username ?? "").trim();
      if (!name) fe.username = "请输入用户名";
      else if (name.length < 2 || name.length > 30) fe.username = "用户名长度需在 2—30 字符之间";
    }
    setFieldErrors(fe);
    return Object.keys(fe).length === 0;
  };

  /** 错误轻晃反馈 */
  const triggerShake = () => {
    setShake(false);
    requestAnimationFrame(() => setShake(true));
    setTimeout(() => setShake(false), 220);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!validate()) {
      triggerShake();
      return;
    }
    setLoading(true);
    try {
      const data = isLogin
        ? await authService.login({ email: form.email.trim(), password: form.password })
        : await authService.register({
            email: form.email.trim(),
            password: form.password,
            username: (form.username ?? "").trim(),
          });
      login(data.token, data.user);
      // 成功焦点时刻：短横线转绿 → 卡片淡出上移 → 进入工作台
      setSuccess(true);
      await delay(reduceMotion ? 0 : 480);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    // 游客模式：后端未启动时用于预览界面，不请求真实接口
    login("demo-token", {
      id: "user_demo",
      email: "demo@example.com",
      username: "体验用户",
      streakDays: 3,
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    navigate("/");
  };

  const fieldCls = (err?: string) => (err ? "!border-red-300 focus:!ring-red-100" : "");

  return (
    <div className="login-bg relative min-h-screen flex items-center justify-center px-6 overflow-hidden">
      {/* 景深：背景虚化光斑（近景卡片锐利） */}
      <div aria-hidden className="pointer-events-none absolute -top-28 left-1/2 -translate-x-1/2 w-[560px] h-[420px] rounded-full bg-blue-500/[0.08] blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-32 -right-24 w-[460px] h-[460px] rounded-full bg-blue-400/[0.08] blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute top-1/3 -left-32 w-[380px] h-[380px] rounded-full bg-emerald-400/[0.05] blur-3xl" />
      <ParticleField />
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={success ? { opacity: 0, y: -10, scale: 0.985 } : { opacity: 1, y: 0 }}
        transition={reduceMotion ? { duration: 0 } : { duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
        style={{ rotateX: srx, rotateY: sry, transformPerspective: 1100 }}
        onMouseMove={handleTilt}
        onMouseLeave={resetTilt}
        className={`relative z-10 w-full max-w-md ${shake ? "animate-login-shake" : ""}`}
      >
        <Card className="shadow-[0_28px_70px_-18px_rgba(23,23,23,0.22)]">
          <CardHeader className="text-center">
            {/* 出版感装饰短横线（成功时转绿） */}
            <div
              className="mx-auto mb-5 w-10 h-[3px] rounded-full transition-colors duration-300"
              style={{ backgroundColor: success ? "#00B983" : "#4B3FE3" }}
            />
            <CardTitle className="font-display text-3xl tracking-tight">Spark</CardTitle>
            <p className="text-[11px] text-[#A0A0A8] mt-2 tracking-[0.08em]">{TAGLINE}</p>
            <CardDescription className="mt-3">
              {isLogin ? "欢迎回来，继续你的学习之旅" : "创建账号，开启 7 天学习计划"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
              {!isLogin && (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="username" className="text-xs text-[#737373]">用户名</label>
                  <Input
                    id="username"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    placeholder="请输入用户名"
                    className={fieldCls(fieldErrors.username)}
                  />
                  {fieldErrors.username && (
                    <p className="text-[11px] text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />{fieldErrors.username}
                    </p>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-xs text-[#737373]">邮箱</label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="请输入邮箱"
                  className={fieldCls(fieldErrors.email)}
                />
                {fieldErrors.email && (
                  <p className="text-[11px] text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />{fieldErrors.email}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="password" className="text-xs text-[#737373]">密码</label>
                <Input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="请输入密码（至少 6 位）"
                  className={fieldCls(fieldErrors.password)}
                />
                {fieldErrors.password && (
                  <p className="text-[11px] text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />{fieldErrors.password}
                  </p>
                )}
              </div>

              {error && (
                <p className="text-xs text-red-600 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}
                </p>
              )}

              <Button type="submit" variant="primary" disabled={loading} className="mt-2 magnetic">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : success ? <Check className="w-4 h-4" /> : null}
                {loading ? "处理中…" : success ? "开始使用" : isLogin ? "登录" : "注册"}
              </Button>

              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError("");
                  setFieldErrors({});
                }}
                className="text-sm text-[#737373] hover:text-[#3A3A3A] transition duration-150 ease-in-out"
              >
                {isLogin ? "还没有账号？去注册" : "已有账号？去登录"}
              </button>

              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-[#F0F1F4]" />
                <span className="text-[10px] text-[#A0A0A8] uppercase tracking-wider">或</span>
                <div className="h-px flex-1 bg-[#F0F1F4]" />
              </div>

              <button type="button" onClick={handleDemoLogin} className="wb-btn magnetic">
                以游客身份体验（免登录预览）
              </button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}