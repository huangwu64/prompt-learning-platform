import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion, useMotionValue, useSpring } from "framer-motion";
import {
  Loader2,
  Check,
  AlertCircle,
  MessageSquareText,
  Wand2,
  Trophy,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/authStore";
import { authService } from "@/services/authService";
import { ParticleField } from "@/components/common/ParticleField";
import type { LoginRequest } from "@/types";

const TAGLINE = "零基础学AI · 提问的深度，决定答案的高度";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PAPER_NOISE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)'/%3E%3C/svg%3E\")";

type FieldErrors = { email?: string; password?: string; username?: string };

const valuePoints = [
  { icon: MessageSquareText, title: "苏格拉底式追问", desc: "2—5 轮对话引导你完善提示词，练出好问题" },
  { icon: Wand2, title: "即用即走的作品工厂", desc: "邮件 / 报告 / 社交文案，一键生成可用内容" },
  { icon: Trophy, title: "每日挑战赛", desc: "四维评分 + 排行榜，和高手同台竞技" },
];

const containerVar = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};
const itemVar = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const reduceMotion = useReducedMotion();

  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 220, damping: 24 });
  const sry = useSpring(ry, { stiffness: 220, damping: 24 });

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
  const motionProps = reduceMotion ? { duration: 0 } : { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const };

  const validate = (): boolean => {
    const fe: FieldErrors = {};
    const email = form.email.trim();
    if (!email) fe.email = "请输入账号";
    else if (!EMAIL_RE.test(email)) fe.email = "账号格式不合法";
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
    login("demo-token", {
      id: "user_demo",
      email: "demo@example.com",
      username: "体验用户",
      streakDays: 3,
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    navigate("/");
  };

  const handleTilt = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reduceMotion) return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    ry.set(px * 5);
    rx.set(-py * 4);
  };
  const resetTilt = () => {
    rx.set(0);
    ry.set(0);
  };

  const fieldCls = (err?: string) => (err ? "!border-red-300 focus:!ring-red-100" : "");

  return (
    <div className="login-bg relative min-h-screen overflow-hidden">
      {/* 背景水印大字 */}
      <div aria-hidden className="login-watermark pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        提问的深度
        <br />
        决定答案的高度
      </div>
      {/* 景深：背景虚化光斑 */}
      <div aria-hidden className="pointer-events-none absolute -top-28 left-1/4 w-[560px] h-[420px] rounded-full bg-blue-500/[0.09] blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-32 -right-24 w-[460px] h-[460px] rounded-full bg-blue-400/[0.08] blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute top-1/3 -left-32 w-[380px] h-[380px] rounded-full bg-emerald-400/[0.05] blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -top-16 -right-20 w-[420px] h-[420px] rounded-full bg-amber-400/[0.05] blur-3xl" />
      <ParticleField />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center justify-center gap-12 px-6 py-12 md:flex-row md:px-10">
        {/* 移动端顶部标语 */}
        <div className="md:hidden text-center">
          <p className="text-xs font-medium tracking-[0.18em] text-blue-600">SPARK · 零基础学AI</p>
        </div>

        {/* ===== 左栏：品牌叙事 ===== */}
        <motion.div
          variants={containerVar}
          initial="hidden"
          animate="show"
          className="hidden md:block md:flex-1 min-w-0"
        >
          <motion.p variants={itemVar} className="text-xs font-medium tracking-[0.18em] text-blue-600">
            SPARK · 零基础学AI
          </motion.p>
          <motion.h1 variants={itemVar} className="wb-title text-4xl xl:text-5xl leading-[1.15] mt-5 text-[#171717]">
            把模糊的需求，
            <br />
            问成一句话。
          </motion.h1>
          <motion.p variants={itemVar} className="mt-5 max-w-md text-sm leading-relaxed text-[#737373]">
            不需要懂术语。从一句"帮我写个邮件"开始，在对话里学会角色、任务、格式、约束——让 AI 真正听懂你。
          </motion.p>

          <motion.div variants={itemVar} className="mt-9 flex flex-col gap-4">
            {valuePoints.map((v) => (
              <div key={v.title} className="flex items-start gap-3.5">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#E5E6EA] bg-white/80">
                  <v.icon className="h-4 w-4 text-blue-600" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#171717]">{v.title}</p>
                  <p className="text-xs text-[#A0A0A8] mt-0.5">{v.desc}</p>
                </div>
              </div>
            ))}
          </motion.div>

          <motion.div variants={itemVar} className="mt-10 flex items-center gap-6 text-xs text-[#737373]">
            <span className="flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 fill-blue-500 text-blue-500" />
              平均评分 4.2 / 5
            </span>
            <span className="h-3 w-px bg-[#D6D8DE]" />
            <span>7 天成长计划</span>
            <span className="h-3 w-px bg-[#D6D8DE]" />
            <span>6 大学习模块</span>
          </motion.div>
        </motion.div>

        {/* ===== 右栏：信纸卡片（以"一张纸"的形式存在） ===== */}
        <div className="w-full md:w-[420px] shrink-0">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={success ? { opacity: 0, y: -12, scale: 0.985 } : { opacity: 1, y: 0 }}
            transition={motionProps}
            style={{ rotateX: srx, rotateY: sry, transformPerspective: 1200 }}
            onMouseMove={handleTilt}
            onMouseLeave={resetTilt}
            className={`relative overflow-hidden rounded-[20px] border border-[#E8E5DF] bg-[#FDFCFA] shadow-[0_20px_45px_-15px_rgba(75,63,227,0.14),0_3px_12px_rgba(23,23,23,0.05)] ${shake ? "animate-login-shake" : ""}`}
          >
            {/* 纸张噪点纹理（极淡，纸的质感） */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-[0.025]"
              style={{ backgroundImage: PAPER_NOISE }}
            />
            {/* 纸张内高光（纸的厚度） */}
            <div aria-hidden className="pointer-events-none absolute inset-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),inset_0_-1px_0_rgba(23,23,23,0.03)]" />

            {/* 纸张内高光（纸的厚度） */}
            <div aria-hidden className="pointer-events-none absolute inset-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),inset_0_-1px_0_rgba(23,23,23,0.03)]" />

            {/* 刊头（letterhead） */}
            <div className="h-[2px] w-full bg-blue-600" />
            <div className="px-8 pt-6 pb-4 text-center">
              <p className="text-[10px] font-medium tracking-[0.24em] text-[#A0A0A8]">SPARK · 零基础学AI</p>
              <div className="mx-auto mt-3 h-px w-14 bg-[#E5E2DA]" />
            </div>

            {/* 正文区 */}
            <div className="px-8 pb-8">
              <div className="text-center">
                <div
                  className="mx-auto mb-4 w-10 h-[3px] rounded-full transition-colors duration-300"
                  style={{ backgroundColor: success ? "#00B983" : "#4B3FE3" }}
                />
                <h2 className="wb-title font-display text-3xl tracking-tight text-[#171717]">Spark</h2>
                <p className="text-[11px] text-[#A0A0A8] mt-2 tracking-[0.08em]">{TAGLINE}</p>
                <p className="mt-3 text-sm text-[#737373]">
                  {isLogin ? "欢迎回来，继续你的学习之旅" : "创建账号，开启 7 天学习计划"}
                </p>
              </div>

              <p className="mb-1 mt-6 text-[11px] font-medium tracking-[0.14em] text-[#A0A0A8]">账号信息</p>
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
                  <label htmlFor="email" className="text-xs text-[#737373]">账号</label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="请输入账号（邮箱）"
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
                  <div className="h-px flex-1 bg-[#E9E6E0]" />
                  <span className="text-[10px] text-[#A0A0A8] uppercase tracking-wider">或</span>
                  <div className="h-px flex-1 bg-[#E9E6E0]" />
                </div>

                <button type="button" onClick={handleDemoLogin} className="wb-btn magnetic !bg-blue-50 !border-blue-100 !text-blue-700 hover:!bg-blue-100">
                  以游客身份体验（免登录预览）
                </button>

                <div className="flex items-center gap-2 rounded-xl border border-[#E9E6E0] bg-[#F6F4EF] px-3 py-2.5 text-[11px] text-[#737373]">
                  <span className="font-medium text-[#3A3A3A]">测试账号</span>
                  test@example.com / 123456
                </div>

                <p className="text-center text-[10px] text-[#A0A0A8]">免费注册 · 无需绑定支付</p>
              </form>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}