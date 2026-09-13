import { useCallback, useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, AlertTriangle, HeartPulse, Loader2, RefreshCw } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { StatCard } from "@/components/admin/StatCard";
import { Banner } from "@/components/admin/Banner";
import { adminService } from "@/services/adminService";
import type { MonitorOverview, TrendMetric, TrendPoint } from "@/types";

/**
 * 图表配色。
 * 刻意**不用**品牌那三段蓝（#4B3FE3 / #6B5BFF / #7A6FF0）做分类色 ——
 * 实测 #6B5BFF 与 #7A6FF0 对全色觉用户的区分度 ΔE 仅 5.7，远低于 15 的门槛，
 * 放在同一张图里没人分得清。品牌渐变是品牌资产，不是数据编码通道。
 */
const C = {
  primary: "#4B3FE3",
  good: "#00B983",
  critical: "#E11D48",
  grid: "rgba(23,23,23,0.06)",
  axis: "#737373",
};

const HEALTH_LABEL: Record<string, string> = {
  database: "数据库",
  redis: "Redis",
  deepseek: "AI 服务",
};

const HEALTH_OK: Record<string, string> = {
  connected: "正常",
  configured: "已配置",
};

function fmtUptime(seconds: number): string {
  if (!seconds) return "—";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d} 天 ${h} 小时`;
  if (h > 0) return `${h} 小时 ${m} 分`;
  return `${m} 分`;
}

export default function AdminMonitorPage() {
  const [days, setDays] = useState(7);
  const [overview, setOverview] = useState<MonitorOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [metric, setMetric] = useState<TrendMetric>("users");
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [trendLoading, setTrendLoading] = useState(false);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setOverview(await adminService.monitorOverview(days));
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    let cancelled = false;
    setTrendLoading(true);
    adminService
      .monitorTrends(metric, Math.max(days, 14))
      .then((data) => {
        if (!cancelled) setTrends(data);
      })
      .catch(() => {
        if (!cancelled) setTrends([]);
      })
      .finally(() => {
        if (!cancelled) setTrendLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [metric, days]);

  if (loading && !overview) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-app-t2 animate-spin" />
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-10">
        <Banner tone="err">{error || "监控数据加载失败"}</Banner>
      </div>
    );
  }

  const { kpi, ai, health, system, content, recentErrors } = overview;

  // AI 趋势的堆叠柱：成功用语义绿、失败用告警红 —— 语义是好/坏，不该靠色相区分
  const aiByDay = ai.byDay.map((row) => ({
    date: String(row.statDate ?? "").slice(5),
    success: row.success ?? 0,
    failure: row.failure ?? 0,
  }));

  const scopeRows = ai.byScope.map((row) => ({
    scope: row.scope ?? "—",
    calls: row.calls,
    tokens: row.tokens,
  }));

  return (
    <div className="w-full max-w-7xl mx-auto px-5 md:px-8 py-8 md:py-10 flex flex-col gap-6">
      <AdminPageHeader
        icon={Activity}
        title="后台监控"
        description="AI 调用指标、系统健康、用户与内容统计。数据来源为 ai_usage_daily 与实时探活。"
        right={
          <div className="flex items-center gap-2">
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              aria-label="统计区间"
              className="wb-input h-8 w-auto pr-6 text-xs"
            >
              <option value={1}>今日</option>
              <option value={7}>近 7 天</option>
              <option value={30}>近 30 天</option>
              <option value={90}>近 90 天</option>
            </select>
            <button type="button" onClick={() => void loadOverview()} disabled={loading} className="wb-btn h-8 px-3 text-xs">
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              刷新
            </button>
          </div>
        }
      />

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 wb-reveal">
        <StatCard label="AI 调用" value={kpi.calls} hint={`今日 ${kpi.todayCalls} 次`} />
        <StatCard
          label="成功率"
          value={kpi.successRate === null ? "—" : `${kpi.successRate}%`}
          tone={kpi.successRate === null ? "default" : kpi.successRate >= 95 ? "good" : "warn"}
          hint={kpi.successRate === null ? "区间内无调用" : undefined}
        />
        <StatCard
          label="平均耗时"
          value={kpi.avgLatencyMs === null ? "—" : `${kpi.avgLatencyMs} ms`}
        />
        <StatCard label="Token 消耗" value={kpi.tokens.toLocaleString()} />
        <StatCard label="用户总数" value={kpi.totalUsers} hint={`7 天活跃 ${kpi.activeUsers7d}`} />
        <StatCard
          label="待审头像"
          value={kpi.pendingAvatarReviews}
          tone={kpi.pendingAvatarReviews > 0 ? "warn" : "good"}
        />
      </div>

      {/* AI 趋势 */}
      <section className="wb-card wb-reveal">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="font-display text-base font-medium tracking-tight text-app-fg">AI 调用趋势</h2>
          <span className="text-[11px] text-app-t4">
            模型 {ai.quota.model} · 普通配额 {ai.quota.dailyLimit > 0 ? `${ai.quota.dailyLimit}/日` : "不限"} · 助手配额{" "}
            {ai.quota.assistantDailyLimit > 0 ? `${ai.quota.assistantDailyLimit}/日` : "不限"}
            {ai.quota.enabled ? "" : " · 已关闭"}
          </span>
        </div>

        {aiByDay.length === 0 ? (
          <p className="text-[13px] text-app-t4 py-10 text-center">
            区间内没有调用记录。发起一次对话或助手提问后这里就会有数据。
          </p>
        ) : (
          <>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={aiByDay} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
                  <CartesianGrid stroke={C.grid} vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: C.axis, fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: C.axis, fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid #E5E6EA", fontSize: 12 }}
                    formatter={(v, name) => [v, name === "success" ? "成功" : "失败"]}
                  />
                  <Legend formatter={(v) => (v === "success" ? "成功" : "失败")} wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="success" stackId="a" fill={C.good} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="failure" stackId="a" fill={C.critical} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {scopeRows.length > 0 && (
              <div className="mt-4 pt-4 border-t border-app-border">
                <p className="text-[11px] tracking-[0.14em] text-app-t4 mb-2">按场景</p>
                <div className="flex flex-wrap gap-x-6 gap-y-1.5">
                  {scopeRows.map((row) => (
                    <span key={row.scope} className="text-[12px] text-app-t3">
                      <span className="text-app-fg font-medium">
                        {row.scope === "assistant" ? "AI 助手" : row.scope === "socratic" ? "苏格拉底" : "工具"}
                      </span>
                      <span className="ml-2 tabular-nums">{row.calls} 次</span>
                      <span className="ml-2 tabular-nums text-app-t4">{row.tokens.toLocaleString()} tokens</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 wb-reveal">
        {/* 系统健康 */}
        <section className="wb-card">
          <h2 className="font-display text-base font-medium tracking-tight text-app-fg mb-3 flex items-center gap-2">
            <HeartPulse className="w-4 h-4 text-blue-600" />
            系统健康
          </h2>

          <div className="flex flex-col gap-2">
            {Object.entries(health).map(([key, value]) => {
              const ok = value === "connected" || value === "configured";
              return (
                <div key={key} className="flex items-center justify-between rounded-lg border border-app-border px-3.5 py-2.5">
                  <span className="text-[13px] text-app-fg">{HEALTH_LABEL[key] ?? key}</span>
                  <span className={`text-[12px] ${ok ? "text-accent-600" : "text-red-600"}`}>
                    {HEALTH_OK[value] ?? value}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-app-border grid grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
            <span className="text-app-t4">运行时长</span>
            <span className="text-app-t2 tabular-nums text-right">{fmtUptime(system.uptimeSeconds)}</span>
            <span className="text-app-t4">堆内存</span>
            <span className="text-app-t2 tabular-nums text-right">
              {system.heapUsedMb} / {system.heapMaxMb} MB（{system.heapUsagePercent}%）
            </span>
            <span className="text-app-t4">线程数</span>
            <span className="text-app-t2 tabular-nums text-right">{system.threads}</span>
            {system.hikariTotal !== undefined && system.hikariTotal >= 0 && (
              <>
                <span className="text-app-t4">连接池</span>
                <span className="text-app-t2 tabular-nums text-right">
                  活跃 {system.hikariActive} / 空闲 {system.hikariIdle} / 等待 {system.hikariWaiting}
                </span>
              </>
            )}
          </div>

          <p className="text-[11px] text-app-t4 mt-3 leading-relaxed">
            这里只做连通性探活，不真实调用模型 —— 避免监控本身消耗额度。
          </p>
        </section>

        {/* 内容统计 + 趋势 */}
        <section className="wb-card">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="font-display text-base font-medium tracking-tight text-app-fg">用户与内容</h2>
            <div className="flex items-center gap-1">
              {(["users", "conversations", "works"] as TrendMetric[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMetric(m)}
                  className={`h-7 px-2.5 rounded-full text-[12px] transition ${
                    metric === m ? "bg-blue-600 text-white" : "text-app-t2 hover:bg-app-chrome"
                  }`}
                >
                  {m === "users" ? "用户" : m === "conversations" ? "会话" : "作品"}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[12px] mb-4">
            <span className="text-app-t4">用户总数 / 今日新增</span>
            <span className="text-app-t2 tabular-nums text-right">
              {content.users.total} / {content.users.today}
            </span>
            <span className="text-app-t4">苏格拉底 / 助手会话</span>
            <span className="text-app-t2 tabular-nums text-right">
              {content.conversations.socratic} / {content.conversations.assistant}
            </span>
            <span className="text-app-t4">作品总数</span>
            <span className="text-app-t2 tabular-nums text-right">{content.works.total}</span>
          </div>

          <div className="h-44">
            {trendLoading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-app-t3" />
              </div>
            ) : trends.length === 0 ? (
              <p className="h-full flex items-center justify-center text-[12px] text-app-t4">
                区间内没有新增数据
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
                  <CartesianGrid stroke={C.grid} vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: C.axis, fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: string) => String(v).slice(5)}
                  />
                  <YAxis tick={{ fill: C.axis, fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid #E5E6EA", fontSize: 12 }}
                    formatter={(v) => [v, "新增"]}
                  />
                  {/* 单系列：三种量级差一个数量级，共用一轴会把小系列压成直线，所以分开展示 */}
                  <Line type="monotone" dataKey="count" stroke={C.primary} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>
      </div>

      {/* 最近错误 */}
      <section className="wb-card wb-reveal">
        <h2 className="font-display text-base font-medium tracking-tight text-app-fg mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          最近错误
        </h2>
        {recentErrors.length === 0 ? (
          <p className="text-[13px] text-app-t4 py-6 text-center">
            没有 ERROR 级日志。5xx 与超时 1 秒的请求会自动记录到「日志」页。
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {recentErrors.map((e, i) => (
              <div key={`${e.traceId}-${i}`} className="rounded-lg border border-app-border px-3.5 py-2.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="wb-badge wb-badge-danger">{e.statusCode ?? "—"}</span>
                  <span className="text-[12px] text-app-fg font-mono truncate">{e.path}</span>
                  <span className="text-[11px] text-app-t4 tabular-nums ml-auto">{e.costMs} ms</span>
                </div>
                <p className="text-[11px] text-app-t4 mt-1 font-mono truncate">
                  trace {e.traceId ?? "—"} · {e.createdAt ?? ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
