import { useCallback, useEffect, useState } from "react";
import { KeyRound, Loader2, PlugZap, Save, Settings2 } from "lucide-react";
import { PasswordInput } from "@/components/ui/password-input";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Banner, Toast } from "@/components/admin/Banner";
import { adminService } from "@/services/adminService";
import type { AiConfig, AiConfigTestResult } from "@/types";

interface Form {
  baseUrl: string;
  apiKey: string;
  model: string;
  dailyLimit: number;
  assistantDailyLimit: number;
  timeoutSeconds: number;
  streamTimeoutSeconds: number;
  maxTokens: number;
  enabled: boolean;
}

const EMPTY: Form = {
  baseUrl: "",
  apiKey: "",
  model: "",
  dailyLimit: 50,
  assistantDailyLimit: 100,
  timeoutSeconds: 30,
  streamTimeoutSeconds: 120,
  maxTokens: 2048,
  enabled: true,
};

function toForm(c: AiConfig): Form {
  return {
    baseUrl: c.baseUrl,
    apiKey: "", // 永不回填真实密钥
    model: c.model,
    dailyLimit: c.dailyLimit,
    assistantDailyLimit: c.assistantDailyLimit,
    timeoutSeconds: c.timeoutSeconds,
    streamTimeoutSeconds: c.streamTimeoutSeconds,
    maxTokens: c.maxTokens,
    enabled: c.enabled,
  };
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium text-app-fg">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-app-t4 leading-relaxed">{hint}</span>}
    </label>
  );
}

export default function AdminConfigPage() {
  const [config, setConfig] = useState<AiConfig | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<AiConfigTestResult | null>(null);
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const c = await adminService.getAiConfig();
      setConfig(c);
      setForm(toForm(c));
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const set = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    setTestResult(null);
    try {
      const updated = await adminService.updateAiConfig({
        baseUrl: form.baseUrl.trim(),
        // 留空 = 不修改密钥；传脱敏串后端也会忽略
        apiKey: form.apiKey.trim() || undefined,
        model: form.model.trim(),
        dailyLimit: form.dailyLimit,
        assistantDailyLimit: form.assistantDailyLimit,
        timeoutSeconds: form.timeoutSeconds,
        streamTimeoutSeconds: form.streamTimeoutSeconds,
        maxTokens: form.maxTokens,
        enabled: form.enabled,
      });
      setConfig(updated);
      setForm(toForm(updated));
      setToast({ ok: true, text: "配置已保存，下一个 AI 请求立即生效（无需重启）" });
    } catch (err) {
      setToast({ ok: false, text: err instanceof Error ? err.message : "保存失败" });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await adminService.testAiConfig({
        baseUrl: form.baseUrl.trim(),
        apiKey: form.apiKey.trim() || undefined,
        model: form.model.trim(),
        timeoutSeconds: form.timeoutSeconds,
        streamTimeoutSeconds: form.streamTimeoutSeconds,
        maxTokens: form.maxTokens,
        dailyLimit: form.dailyLimit,
        assistantDailyLimit: form.assistantDailyLimit,
        enabled: form.enabled,
      });
      setTestResult(result);
    } catch (err) {
      setTestResult({
        ok: false,
        latencyMs: 0,
        model: null,
        error: err instanceof Error ? err.message : "试连失败",
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-app-t2 animate-spin" />
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-10">
        <Banner tone="err">{error || "配置加载失败"}</Banner>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-5 md:px-8 py-8 md:py-10 flex flex-col gap-6">
      <AdminPageHeader
        icon={Settings2}
        title="API 配置"
        description="修改后立即生效，无需重启服务。密钥加密存储、接口只返回脱敏值。"
        right={
          <div className="flex items-center gap-2">
            <button type="button" onClick={handleTest} disabled={testing} className="wb-btn">
              {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlugZap className="w-4 h-4" />}
              测试连接
            </button>
            <button type="button" onClick={handleSave} disabled={saving} className="wb-btn wb-btn-primary">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              保存
            </button>
          </div>
        }
      />

      {!config.enabled && (
        <Banner tone="err">
          当前 AI 能力已被<strong>关闭</strong>：所有 AI 接口（苏格拉底对话 / 助手 / 作品工厂 / 智能对比）都会直接返回 503。
        </Banner>
      )}

      {testResult && (
        <Banner tone={testResult.ok ? "ok" : "err"}>
          {testResult.ok ? (
            <>
              连接正常，耗时 {testResult.latencyMs}ms，服务端实际命中模型{" "}
              <strong>{testResult.model}</strong>。
            </>
          ) : (
            <>试连失败：{testResult.error}</>
          )}
        </Banner>
      )}

      {/* 连接 */}
      <section className="wb-card wb-reveal flex flex-col gap-4">
        <h2 className="font-display text-base font-medium tracking-tight text-app-fg">连接</h2>

        <Field label="Base URL" hint="OpenAI 兼容端点的根地址，路径 /chat/completions 由后端拼接">
          <input
            value={form.baseUrl}
            onChange={(e) => set("baseUrl", e.target.value)}
            className="wb-input h-9"
            placeholder="https://api.deepseek.com"
          />
        </Field>

        <Field
          label="API Key"
          hint={
            config.apiKeyConfigured
              ? `当前已配置（${config.apiKeyMasked}，来源：${config.apiKeySource}）。留空表示不修改；填新值则覆盖。`
              : "尚未配置。留空表示沿用环境变量 DEEPSEEK_API_KEY。"
          }
        >
          <PasswordInput
            leadingIcon={KeyRound}
            value={form.apiKey}
            onChange={(e) => set("apiKey", e.target.value)}
            className="font-mono text-[13px]"
            placeholder={config.apiKeyConfigured ? config.apiKeyMasked : "sk-..."}
            autoComplete="off"
          />
        </Field>

        <Field
          label="模型"
          hint="例如 deepseek-chat。切换后新请求立即使用新模型，助手与苏格拉底一起生效。"
        >
          <input
            value={form.model}
            onChange={(e) => set("model", e.target.value)}
            className="wb-input h-9 font-mono text-[13px]"
          />
        </Field>

        <label className="flex items-center gap-2.5 mt-1">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(e) => set("enabled", e.target.checked)}
            className="w-4 h-4 accent-[#4B3FE3]"
          />
          <span className="text-[13px] text-app-fg">启用 AI 能力</span>
          <span className="text-[11px] text-app-t4">取消勾选可一键停掉全站 AI 调用</span>
        </label>
      </section>

      {/* 限额与超时 */}
      <section className="wb-card wb-reveal flex flex-col gap-4">
        <h2 className="font-display text-base font-medium tracking-tight text-app-fg">限额与超时</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="普通场景日配额"
            hint="苏格拉底对话、作品工厂、智能对比等共用的单用户每日上限。填 0 表示不限量（联调/压测用）"
          >
            <input
              type="number"
              min={0}
              value={form.dailyLimit}
              onChange={(e) => set("dailyLimit", Number(e.target.value))}
              className="wb-input h-9 tabular-nums"
            />
          </Field>

          <Field
            label="助手日配额"
            hint="助手独立记账，不与上面的配额互相挤占。填 0 表示不限量"
          >
            <input
              type="number"
              min={0}
              value={form.assistantDailyLimit}
              onChange={(e) => set("assistantDailyLimit", Number(e.target.value))}
              className="wb-input h-9 tabular-nums"
            />
          </Field>

          <Field label="同步调用超时（秒）">
            <input
              type="number"
              min={1}
              value={form.timeoutSeconds}
              onChange={(e) => set("timeoutSeconds", Number(e.target.value))}
              className="wb-input h-9 tabular-nums"
            />
          </Field>

          <Field label="流式调用超时（秒）" hint="助手长回复的总时长上限，应比同步超时宽裕">
            <input
              type="number"
              min={1}
              value={form.streamTimeoutSeconds}
              onChange={(e) => set("streamTimeoutSeconds", Number(e.target.value))}
              className="wb-input h-9 tabular-nums"
            />
          </Field>

          <Field label="max_tokens" hint="单次生成的最大 token 数">
            <input
              type="number"
              min={1}
              value={form.maxTokens}
              onChange={(e) => set("maxTokens", Number(e.target.value))}
              className="wb-input h-9 tabular-nums"
            />
          </Field>
        </div>
      </section>

      <p className="text-[11px] text-app-t4 leading-relaxed">
        最后修改：{config.updatedAt ?? "—"}
        {config.updatedBy ? ` · 操作人 ${config.updatedBy}` : ""}
        <br />
        密钥以 AES-256-GCM 加密存储，接口只返回脱敏值（永不回显原文）。该加密保护的是数据库被 dump
        的情况 —— 同时拿到数据库与配置密钥的人仍可解密。
      </p>

      {toast && <Toast tone={toast.ok ? "ok" : "err"} text={toast.text} />}
    </div>
  );
}
