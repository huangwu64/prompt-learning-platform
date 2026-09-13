import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, ScrollText, Search } from "lucide-react";
import { Table, type Column } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { adminService } from "@/services/adminService";
import type { LogLevel, PaginatedData, SystemLogItem } from "@/types";

const LEVELS: { value: LogLevel | ""; label: string }[] = [
  { value: "", label: "全部" },
  { value: "ERROR", label: "ERROR" },
  { value: "WARN", label: "WARN" },
  { value: "SLOW", label: "SLOW" },
];

const LEVEL_BADGE: Record<LogLevel, string> = {
  ERROR: "wb-badge wb-badge-danger",
  WARN: "wb-badge wb-badge-warn",
  SLOW: "wb-badge wb-badge-blue",
};

function fmtTime(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export default function AdminLogsPage() {
  const [level, setLevel] = useState<LogLevel | "">("");
  const [path, setPath] = useState("");
  const [traceId, setTraceId] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [data, setData] = useState<PaginatedData<SystemLogItem> | null>(null);
  const [stats, setStats] = useState<Record<LogLevel, number> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<SystemLogItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, stat] = await Promise.all([
        adminService.listLogs({
          page,
          pageSize,
          level: level || undefined,
          path: path.trim() || undefined,
          traceId: traceId.trim() || undefined,
        }),
        adminService.logStats(7),
      ]);
      setData(list);
      setStats(stat);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, level, path, traceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const columns: Column<SystemLogItem>[] = [
    {
      key: "createdAt",
      title: "时间",
      width: "130px",
      render: (row) => <span className="text-xs text-app-t3 tabular-nums">{fmtTime(row.createdAt)}</span>,
    },
    {
      key: "level",
      title: "级别",
      width: "84px",
      render: (row) => <span className={LEVEL_BADGE[row.level]}>{row.level}</span>,
    },
    {
      key: "statusCode",
      title: "状态",
      width: "64px",
      align: "right",
      render: (row) => (
        <span className={`text-xs tabular-nums ${(row.statusCode ?? 0) >= 500 ? "text-red-600" : "text-app-t3"}`}>
          {row.statusCode ?? "—"}
        </span>
      ),
    },
    {
      key: "costMs",
      title: "耗时",
      width: "80px",
      align: "right",
      render: (row) => <span className="text-xs text-app-t3 tabular-nums">{row.costMs ?? "—"} ms</span>,
    },
    {
      key: "req",
      title: "请求",
      render: (row) => (
        <span className="text-[12px] text-app-t2 font-mono truncate block" title={row.path ?? ""}>
          {row.method} {row.path}
        </span>
      ),
    },
    {
      key: "traceId",
      title: "Trace",
      width: "150px",
      render: (row) => (
        <button
          type="button"
          onClick={() => {
            setTraceId(row.traceId ?? "");
            setPage(1);
          }}
          title="按此 traceId 筛选同一次请求"
          className="text-[11px] text-app-t4 font-mono truncate block hover:text-blue-600 transition"
        >
          {row.traceId ?? "—"}
        </button>
      ),
    },
    {
      key: "user",
      title: "用户",
      width: "140px",
      render: (row) => (
        <span className="text-[11px] text-app-t4 font-mono truncate block">{row.userId ?? "—"}</span>
      ),
    },
    {
      key: "actions",
      title: "",
      width: "60px",
      render: (row) => (
        <button type="button" onClick={() => setDetail(row)} className="wb-btn h-7 px-2 text-xs">
          详情
        </button>
      ),
    },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-5 md:px-8 py-8 md:py-10 flex flex-col gap-6">
      <AdminPageHeader
        icon={ScrollText}
        title="日志"
        description="只记录错误与慢请求（4xx/5xx，或耗时 ≥ 1 秒）—— 全量入库会把数据库写成热点。"
        right={
          <button type="button" onClick={() => void load()} disabled={loading} className="wb-btn">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            刷新
          </button>
        }
      />

      <div className="wb-reveal flex flex-wrap items-center gap-2">
        {LEVELS.map(({ value, label }) => {
          const active = level === value;
          const count = value === "" ? null : stats?.[value as LogLevel];
          return (
            <button
              key={value || "all"}
              type="button"
              onClick={() => {
                setLevel(value);
                setPage(1);
              }}
              className={`h-8 px-3.5 rounded-full text-[13px] transition ${
                active
                  ? "bg-blue-600 text-white"
                  : "bg-app-surface border border-app-border text-app-t2 hover:border-blue-300"
              }`}
            >
              {label}
              {count !== null && count !== undefined && (
                <span className={`ml-1.5 tabular-nums ${active ? "text-white/80" : "text-app-t4"}`}>{count}</span>
              )}
            </button>
          );
        })}

        <div className="relative ml-auto">
          <Search className="w-3.5 h-3.5 text-app-t4 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            value={path}
            onChange={(e) => setPath(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setPage(1);
            }}
            placeholder="按路径筛选"
            className="wb-input h-8 pl-8 w-48 text-[13px]"
          />
        </div>

        {traceId && (
          <button
            type="button"
            onClick={() => {
              setTraceId("");
              setPage(1);
            }}
            className="wb-btn h-8 px-3 text-xs"
          >
            清除 trace 筛选：{traceId}
          </button>
        )}
      </div>

      <div className="flex flex-col gap-4 wb-reveal">
        <Table
          columns={columns}
          data={data?.items ?? []}
          rowKey={(row) => String(row.id)}
          loading={loading}
          error={error}
          empty="没有匹配的日志"
        />
        {data && data.total > 0 && (
          <Pagination
            page={data.page}
            pageSize={data.pageSize}
            total={data.total}
            totalPages={data.totalPages}
            onChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        )}
      </div>

      {/* 详情弹窗：用固定浮层而非 Modal，避免与表格交互叠加 */}
      {detail && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" onClick={() => setDetail(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
          <div
            className="relative w-full max-w-lg rounded-2xl border border-app-border bg-app-surface p-5 shadow-[0_24px_80px_-16px_rgba(20,20,60,0.35)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-base font-medium tracking-tight text-app-fg mb-3">日志详情</h3>
            <dl className="grid grid-cols-[80px_1fr] gap-x-3 gap-y-2 text-[12px]">
              <dt className="text-app-t4">时间</dt>
              <dd className="text-app-t2">{fmtTime(detail.createdAt)}</dd>
              <dt className="text-app-t4">级别</dt>
              <dd><span className={LEVEL_BADGE[detail.level]}>{detail.level}</span></dd>
              <dt className="text-app-t4">请求</dt>
              <dd className="text-app-t2 font-mono break-all">{detail.method} {detail.path}</dd>
              <dt className="text-app-t4">状态 / 耗时</dt>
              <dd className="text-app-t2 tabular-nums">{detail.statusCode} · {detail.costMs} ms</dd>
              <dt className="text-app-t4">traceId</dt>
              <dd className="text-app-t2 font-mono break-all">{detail.traceId ?? "—"}</dd>
              <dt className="text-app-t4">用户 / IP</dt>
              <dd className="text-app-t2 font-mono break-all">{detail.userId ?? "—"} · {detail.ip ?? "—"}</dd>
              {detail.message && (
                <>
                  <dt className="text-app-t4">消息</dt>
                  <dd className="text-app-t2 break-all">{detail.message}</dd>
                </>
              )}
            </dl>
            <div className="mt-4 flex justify-end">
              <button type="button" onClick={() => setDetail(null)} className="wb-btn">关闭</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
