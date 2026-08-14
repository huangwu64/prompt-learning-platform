import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useAuthStore } from "@/store/authStore";
import { authService } from "@/services/authService";
import type { LoginRequest } from "@/types";

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<LoginRequest & { username?: string }>({
    email: "",
    password: "",
    username: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = isLogin
        ? await authService.login({ email: form.email, password: form.password })
        : await authService.register({
            email: form.email,
            password: form.password,
            username: form.username || form.email,
          });
      login(data.token, data.user);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
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

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "radial-gradient(640px circle at 50% -5%, rgba(75,63,227,0.09), transparent 62%), #F6F7F9" }}>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-[#6B5BFF] flex items-center justify-center shadow-lg shadow-blue-600/25">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <CardTitle className="font-display text-2xl tracking-tight">Spark</CardTitle>
          <CardDescription>
            {isLogin ? "登录你的账号" : "创建新账号"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {!isLogin && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[#737373]">用户名</label>
                <Input
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  placeholder="请输入用户名"
                  required
                />
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[#737373]">邮箱</label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="请输入邮箱"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[#737373]">密码</label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="请输入密码"
                required
              />
            </div>

            {error && <p className="text-xs text-red-600">{error}</p>}

            <Button type="submit" variant="primary" disabled={loading} className="mt-2 magnetic">
              {loading ? "处理中..." : isLogin ? "登录" : "注册"}
            </Button>

            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
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
              <Sparkles className="w-4 h-4" />
              以游客身份体验（免登录预览）
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
