import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Clock, ImageUp, Loader2, XCircle } from "lucide-react";
import { Table, type Column } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { Modal } from "@/components/ui/modal";
import { adminService } from "@/services/adminService";
import type {
  AdminAvatarReview,
  AdminAvatarStats,
  PaginatedData,
  ReviewStatus,
} from "@/types";

type Filter = ReviewStatus | "";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "pending", label: "待审核" },
  { value: "approved", label: "已通过" },
  { value: "rejected", label: "已驳回" },
  { value: "", label: "全部" },
];

const STATUS_BADGE: Record<ReviewStatus, { cls: string; text: string }> = {
  pending: { cls: "wb-badge wb-badge-blue", text: "待审核" },
  approved: { cls: "wb-badge wb-badge-ok", text: "已通过" },
  rejected: { cls: "wb-badge wb-badge-danger", text: "已驳回" },
};

/** MM-DD HH:mm */
function fmtTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function AdminAvatarsPage() {
  const [filter, setFilter] = useState<Filter>("pending");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [data, setData] = useState<PaginatedData<AdminAvatarReview> | null>(null);
  const [stats, setStats] = useState<AdminAvatarStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);

  const [approving, setApproving] = useState<AdminAvatarReview | null>(null);
  const [approveBusy, setApproveBusy] = useState(false);

  const [rejecting, setRejecting] = useState<AdminAvatarReview | null>(null);
  const [reason, setReason] = useState("");
  const [rejectBusy, setRejectBusy] = useState(false);
  const [rejectError, setRejectError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pageData, statData] = await Promise.all([
        adminService.listAvatarReviews({
          page,
          pageSize,
          status: filter === "" ? undefined : filter,
        }),
        adminService.avatarStats(),
      ]);
      setData(pageData);
      setStats(statData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filter]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const handleApprove = async () => {
    if (!approving) return;
    setApproveBusy(true);
    try {
      await adminService.approveAvatar(approving.reviewId);
      setApproving(null);
      setToast({ ok: true, text: `已通过 ${approving.username ?? "该用户"} 的头像` });
      await load();
    } catch (err) {
      setToast({ ok: false, text: err instanceof Error ? err.message : "操作失败" });
      setApproving(null);
    } finally {
      setApproveBusy(false);
    }
  };

  const handleReject = async () => {
    if (!rejecting) return;
    const text = reason.trim();
    if (text.length < 2) {
      setRejectError("请填写驳回理由（至少 2 个字）");
      return;
    }
    setRejectBusy(true);
    setRejectError("");
    try {
      await adminService.rejectAvatar(rejecting.reviewId, text);
      setRejecting(null);
      setReason("");
      setToast({ ok: true, text: `已驳回 ${rejecting.username ?? "该用户"} 的头像` });
      await load();
    } catch (err) {
      setRejectError(err instanceof Error ? err.message : "操作失败");
    } finally {
      setRejectBusy(false);
    }
  };

  const columns: Column<AdminAvatarReview>[] = [
    {
      key: "user",
      title: "用户",
      render: (row) => (
        <div className="min-w-0">
          <p className="text-[13px] text-app-fg truncate">{row.username ?? "—"}</p>
          <p className="text-[11px] text-app-t4 truncate">{row.email ?? "—"}</p>
        </div>
      ),
    },
    {
      key: "submitted",
      title: "本次提交",
      width: "88px",
      render: (row) => (
        <img
          src={row.avatarUrl}
          alt="待审头像"
          className="w-11 h-11 rounded-lg object-cover border border-app-border bg-app-chrome"
        />
      ),
    },
    {
      key: "current",
      title: "当前生效",
      width: "88px",
      render: (row) =>
        row.currentAvatar ? (
          <img
            src={row.currentAvatar}
            alt="当前头像"
            className="w-11 h-11 rounded-lg object-cover border border-app-border bg-app-chrome"
          />
        ) : (
          <span className="text-xs text-app-t4">无</span>
        ),
    },
    {
      key: "submittedAt",
      title: "提交时间",
      width: "110px",
      render: (row) => (
        <span className="text-xs text-app-t3">{fmtTime(row.submittedAt)}</span>
      ),
    },
    {
      key: "status",
      title: "状态",
      width: "96px",
      render: (row) => {
        const badge = STATUS_BADGE[row.status];
        return <span className={badge.cls}>{badge.text}</span>;
      },
    },
    {
      key: "reviewed",
      title: "审核",
      width: "190px",
      render: (row) =>
        row.status === "pending" ? (
          <div className="flex items-center gap-1.5">
            {/* whitespace-nowrap：否则窄列里「通过」会被挤成两行 */}
            <button
              type="button"
              onClick={() => setApproving(row)}
              className="wb-btn h-7 px-2.5 text-xs whitespace-nowrap"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-accent-600 shrink-0" />
              通过
            </button>
            <button
              type="button"
              onClick={() => {
                setRejecting(row);
                setReason("");
                setRejectError("");
              }}
              className="wb-btn h-7 px-2.5 text-xs whitespace-nowrap"
            >
              <XCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
              驳回
            </button>
          </div>
        ) : (
          <div className="min-w-0">
            <p className="text-xs text-app-t3 truncate">{row.reviewerName ?? "—"}</p>
            <p className="text-[11px] text-app-t4">{fmtTime(row.reviewedAt)}</p>
          </div>
        ),
    },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-5 md:px-8 py-8 md:py-10 flex flex-col gap-6">
      {/* 页头 */}
      <div className="wb-reveal flex items-start gap-3">
        <span
          className="w-11 h-11 shrink-0 rounded-2xl flex items-center justify-center text-white shadow-[0_6px_18px_-4px_rgba(75,63,227,0.5)]"
          style={{ background: "linear-gradient(135deg, #4B3FE3, #6B5BFF 60%, #7A6FF0)" }}
        >
          <ImageUp className="w-5 h-5" />
        </span>
        <div className="min-w-0">
          <h1 className="font-display text-2xl md:text-[26px] font-medium tracking-tight text-app-fg">
            头像审核
          </h1>
          <p className="wb-text text-sm">
            用户提交的头像需审核通过后才会在用户端展示；驳回时请写明原因，用户可据此修改后重新提交。
          </p>
        </div>
      </div>

      {/* 筛选 */}
      <div className="wb-reveal flex items-center gap-1.5 flex-wrap">
        {FILTERS.map(({ value, label }) => {
          const active = filter === value;
          const count =
            value === "" || !stats
              ? null
              : stats[value as ReviewStatus];
          return (
            <button
              key={value || "all"}
              type="button"
              onClick={() => {
                setFilter(value);
                setPage(1);
              }}
              className={`h-8 px-3.5 rounded-full text-[13px] transition ${
                active
                  ? "bg-blue-600 text-white"
                  : "bg-app-surface border border-app-border text-app-t2 hover:border-blue-300"
              }`}
            >
              {label}
              {count !== null && (
                <span className={`ml-1.5 tabular-nums ${active ? "text-white/80" : "text-app-t4"}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="wb-btn h-8 px-3 text-xs ml-auto"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
          刷新
        </button>
      </div>

      {/* 列表 */}
      <div className="flex flex-col gap-4 wb-reveal">
        <Table
          columns={columns}
          data={data?.items ?? []}
          rowKey={(row) => row.reviewId}
          loading={loading}
          error={error}
          empty={filter === "pending" ? "没有待审核的头像" : "暂无记录"}
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

      {/* 操作反馈 */}
      {toast && (
        <div className="fixed top-20 right-6 z-[200]">
          <div
            className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 shadow-[0_12px_32px_-12px_rgba(20,20,60,0.3)] ${
              toast.ok
                ? "border-accent-200 bg-accent-50 text-accent-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {toast.ok ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <p className="text-[13px]">{toast.text}</p>
          </div>
        </div>
      )}

      {/* 通过确认 */}
      {approving && (
        <Modal
          title="通过该头像？"
          subtitle={approving.username ?? undefined}
          onClose={() => !approveBusy && setApproving(null)}
          maxWidth="max-w-md"
          footer={
            <>
              <button
                type="button"
                onClick={() => setApproving(null)}
                disabled={approveBusy}
                className="wb-btn"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleApprove}
                disabled={approveBusy}
                className="wb-btn wb-btn-primary"
              >
                {approveBusy ? "处理中…" : "确认通过"}
              </button>
            </>
          }
        >
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center gap-1.5">
              <img
                src={approving.avatarUrl}
                alt="待审头像"
                className="w-20 h-20 rounded-xl object-cover border border-app-border"
              />
              <span className="text-[11px] text-app-t4">本次提交</span>
            </div>
            {approving.currentAvatar && (
              <div className="flex flex-col items-center gap-1.5">
                <img
                  src={approving.currentAvatar}
                  alt="当前头像"
                  className="w-20 h-20 rounded-xl object-cover border border-app-border opacity-60"
                />
                <span className="text-[11px] text-app-t4">将被替换</span>
              </div>
            )}
          </div>
          <p className="text-[13px] text-app-t3 mt-4 leading-relaxed">
            通过后新头像立即对该用户生效，旧头像文件会被清理。
          </p>
        </Modal>
      )}

      {/* 驳回 */}
      {rejecting && (
        <Modal
          title="驳回该头像"
          subtitle={rejecting.username ?? undefined}
          onClose={() => !rejectBusy && setRejecting(null)}
          maxWidth="max-w-md"
          footer={
            <>
              <button
                type="button"
                onClick={() => setRejecting(null)}
                disabled={rejectBusy}
                className="wb-btn"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={rejectBusy}
                className="wb-btn wb-btn-primary"
              >
                {rejectBusy ? "提交中…" : "确认驳回"}
              </button>
            </>
          }
        >
          <div className="flex items-start gap-4">
            <img
              src={rejecting.avatarUrl}
              alt="待审头像"
              className="w-20 h-20 shrink-0 rounded-xl object-cover border border-app-border"
            />
            <div className="min-w-0 flex-1">
              <label htmlFor="reject-reason" className="text-[13px] font-medium text-app-fg">
                驳回理由 <span className="text-red-600">*</span>
              </label>
              <textarea
                id="reject-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                maxLength={200}
                placeholder="例如：头像含二维码 / 涉及侵权 / 画面模糊无法辨认"
                className="wb-input w-full mt-1.5 resize-none leading-relaxed"
              />
              <div className="flex items-center justify-between mt-1">
                <p className="text-[11px] text-app-t4">
                  用户会在个人中心看到这条理由并可重新上传
                </p>
                <span className="text-[11px] text-app-t4 tabular-nums">{reason.length}/200</span>
              </div>
              {rejectError && (
                <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {rejectError}
                </p>
              )}
            </div>
          </div>
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-app-border bg-app-chrome px-3.5 py-2.5">
            <Clock className="w-4 h-4 shrink-0 mt-0.5 text-app-t3" />
            <p className="text-[12px] text-app-t3 leading-relaxed">
              驳回不会删除用户已有的头像 —— 对方会继续使用当前生效的那张，
              只有从未设置过头像的用户才回落默认占位。
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
