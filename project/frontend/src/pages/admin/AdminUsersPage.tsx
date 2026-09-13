import { useCallback, useEffect, useState } from "react";
import { KeyRound, Loader2, Pencil, Search, Trash2, UserPlus, Users } from "lucide-react";
import { Table, type Column } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { Modal } from "@/components/ui/modal";
import { PasswordInput } from "@/components/ui/password-input";
import { UserAvatar } from "@/components/common/UserAvatar";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Banner, Toast } from "@/components/admin/Banner";
import { adminService } from "@/services/adminService";
import { useAuthStore } from "@/store/authStore";
import type { AdminUser, PaginatedData, UserRole, UserStatus } from "@/types";

const STATUS_BADGE: Record<UserStatus, { cls: string; text: string }> = {
  active: { cls: "wb-badge wb-badge-ok", text: "正常" },
  disabled: { cls: "wb-badge wb-badge-warn", text: "已禁用" },
  deleted: { cls: "wb-badge wb-badge-danger", text: "已删除" },
};

function fmtTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

type ModalKind =
  | { kind: "create" }
  | { kind: "edit"; user: AdminUser }
  | { kind: "password"; user: AdminUser }
  | { kind: "delete"; user: AdminUser }
  | { kind: "status"; user: AdminUser }
  | null;

export default function AdminUsersPage() {
  const me = useAuthStore((s) => s.user);

  const [keyword, setKeyword] = useState("");
  const [role, setRole] = useState<UserRole | "">("");
  const [status, setStatus] = useState<UserStatus | "">("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [data, setData] = useState<PaginatedData<AdminUser> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);
  const [modal, setModal] = useState<ModalKind>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");

  // 表单字段
  const [fEmail, setFEmail] = useState("");
  const [fUsername, setFUsername] = useState("");
  const [fPassword, setFPassword] = useState("");
  const [fRole, setFRole] = useState<UserRole>("USER");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await adminService.listUsers({
        page,
        pageSize,
        keyword: keyword.trim() || undefined,
        role: role || undefined,
        status: status || undefined,
      });
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, keyword, role, status]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const closeModal = () => {
    if (busy) return;
    setModal(null);
    setFormError("");
    setFPassword("");
  };

  const run = async (action: () => Promise<unknown>, successText: string) => {
    setBusy(true);
    setFormError("");
    try {
      await action();
      setToast({ ok: true, text: successText });
      setModal(null);
      setFPassword("");
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "操作失败");
    } finally {
      setBusy(false);
    }
  };

  const isSelf = (u: AdminUser) => u.id === me?.id;

  const columns: Column<AdminUser>[] = [
    {
      key: "user",
      title: "用户",
      render: (row) => (
        <div className="flex items-center gap-2.5 min-w-0">
          <UserAvatar src={row.avatar} name={row.username} className="w-8 h-8" fallbackClassName="text-xs" />
          <div className="min-w-0">
            <p className="text-[13px] text-app-fg truncate">
              {row.username}
              {isSelf(row) && <span className="ml-1.5 text-[11px] text-app-t4">（我）</span>}
            </p>
            <p className="text-[11px] text-app-t4 truncate">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "id",
      title: "用户 ID",
      width: "170px",
      render: (row) => (
        <span className="text-[11px] text-app-t4 font-mono truncate block" title={row.id}>
          {row.id}
        </span>
      ),
    },
    {
      key: "role",
      title: "角色",
      width: "110px",
      render: (row) => (
        <select
          value={row.role}
          disabled={isSelf(row)}
          onChange={(e) => {
            const next = e.target.value as UserRole;
            void run(() => adminService.updateUserRole(row.id, next),
              `已将 ${row.username} 的角色改为 ${next}`);
          }}
          title={isSelf(row) ? "不能修改自己的角色" : undefined}
          className="wb-input h-7 w-auto pr-6 text-xs disabled:opacity-50"
        >
          <option value="USER">USER</option>
          <option value="ADMIN">ADMIN</option>
        </select>
      ),
    },
    {
      key: "status",
      title: "状态",
      width: "90px",
      render: (row) => {
        const badge = STATUS_BADGE[row.status];
        return <span className={badge.cls}>{badge.text}</span>;
      },
    },
    {
      key: "activity",
      title: "会话 / 作品",
      width: "110px",
      align: "right",
      render: (row) => (
        <span className="text-xs text-app-t3">
          {row.conversationCount} / {row.workCount}
        </span>
      ),
    },
    {
      key: "lastLoginAt",
      title: "最后登录",
      width: "140px",
      render: (row) => <span className="text-xs text-app-t3">{fmtTime(row.lastLoginAt)}</span>,
    },
    {
      key: "actions",
      title: "操作",
      width: "260px",
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setFEmail(row.email);
              setFUsername(row.username);
              setFormError("");
              setModal({ kind: "edit", user: row });
            }}
            className="wb-btn h-7 px-2 text-xs whitespace-nowrap"
          >
            <Pencil className="w-3.5 h-3.5 shrink-0" />
            编辑
          </button>
          <button
            type="button"
            onClick={() => {
              setFPassword("");
              setFormError("");
              setModal({ kind: "password", user: row });
            }}
            className="wb-btn h-7 px-2 text-xs whitespace-nowrap"
          >
            <KeyRound className="w-3.5 h-3.5 shrink-0" />
            改密
          </button>
          <button
            type="button"
            disabled={isSelf(row)}
            title={isSelf(row) ? "不能禁用自己的账号" : undefined}
            onClick={() => setModal({ kind: "status", user: row })}
            className="wb-btn h-7 px-2 text-xs whitespace-nowrap disabled:opacity-40"
          >
            {row.status === "active" ? "禁用" : "启用"}
          </button>
          <button
            type="button"
            disabled={isSelf(row)}
            title={isSelf(row) ? "不能删除自己的账号" : undefined}
            onClick={() => setModal({ kind: "delete", user: row })}
            className="wb-btn h-7 px-2 text-xs whitespace-nowrap text-red-600 disabled:opacity-40"
          >
            <Trash2 className="w-3.5 h-3.5 shrink-0" />
            删除
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-5 md:px-8 py-8 md:py-10 flex flex-col gap-6">
      <AdminPageHeader
        icon={Users}
        title="用户管理"
        description="管理账号资料、角色与状态。密码为哈希存储，后台只能重置、无法查看；用户 ID 是主键，不可修改。"
        right={
          <button
            type="button"
            onClick={() => {
              setFEmail("");
              setFUsername("");
              setFPassword("");
              setFRole("USER");
              setFormError("");
              setModal({ kind: "create" });
            }}
            className="wb-btn wb-btn-primary"
          >
            <UserPlus className="w-4 h-4" />
            新建用户
          </button>
        }
      />

      {/* 筛选 */}
      <div className="wb-reveal flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-app-t4 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setPage(1);
            }}
            placeholder="搜索用户名或邮箱"
            className="wb-input h-8 pl-8 w-56 text-[13px]"
          />
        </div>

        <select
          value={role}
          onChange={(e) => {
            setRole(e.target.value as UserRole | "");
            setPage(1);
          }}
          className="wb-input h-8 w-auto pr-6 text-[13px]"
        >
          <option value="">全部角色</option>
          <option value="USER">USER</option>
          <option value="ADMIN">ADMIN</option>
        </select>

        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as UserStatus | "");
            setPage(1);
          }}
          className="wb-input h-8 w-auto pr-6 text-[13px]"
        >
          <option value="">全部状态</option>
          <option value="active">正常</option>
          <option value="disabled">已禁用</option>
          <option value="deleted">已删除</option>
        </select>

        <button type="button" onClick={() => void load()} disabled={loading} className="wb-btn h-8 px-3 text-xs">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
          刷新
        </button>
      </div>

      <div className="flex flex-col gap-4 wb-reveal">
        <Table
          columns={columns}
          data={data?.items ?? []}
          rowKey={(row) => row.id}
          loading={loading}
          error={error}
          empty="没有匹配的用户"
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

      {toast && <Toast tone={toast.ok ? "ok" : "err"} text={toast.text} />}

      {/* 新建 */}
      {modal?.kind === "create" && (
        <Modal
          title="新建用户"
          onClose={closeModal}
          maxWidth="max-w-md"
          footer={
            <>
              <button type="button" onClick={closeModal} disabled={busy} className="wb-btn">取消</button>
              <button
                type="button"
                disabled={busy || !fEmail.trim() || !fUsername.trim() || fPassword.length < 6}
                onClick={() => void run(
                  () => adminService.createUser({
                    email: fEmail.trim(),
                    username: fUsername.trim(),
                    password: fPassword,
                    role: fRole,
                  }),
                  `已创建用户 ${fUsername.trim()}`)}
                className="wb-btn wb-btn-primary"
              >
                {busy ? "创建中…" : "创建"}
              </button>
            </>
          }
        >
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-app-fg">邮箱</span>
              <input value={fEmail} onChange={(e) => setFEmail(e.target.value)} className="wb-input h-9" placeholder="user@example.com" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-app-fg">用户名</span>
              <input value={fUsername} onChange={(e) => setFUsername(e.target.value)} maxLength={30} className="wb-input h-9" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-app-fg">初始密码</span>
              <PasswordInput
                value={fPassword}
                onChange={(e) => setFPassword(e.target.value)}
                placeholder="至少 6 位"
                autoComplete="new-password"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-app-fg">角色</span>
              <select value={fRole} onChange={(e) => setFRole(e.target.value as UserRole)} className="wb-input h-9">
                <option value="USER">USER（普通用户）</option>
                <option value="ADMIN">ADMIN（管理员）</option>
              </select>
            </label>
            {formError && <Banner tone="err">{formError}</Banner>}
          </div>
        </Modal>
      )}

      {/* 编辑资料 */}
      {modal?.kind === "edit" && (
        <Modal
          title="编辑用户"
          subtitle={modal.user.id}
          onClose={closeModal}
          maxWidth="max-w-md"
          footer={
            <>
              <button type="button" onClick={closeModal} disabled={busy} className="wb-btn">取消</button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void run(
                  () => adminService.updateUser(modal.user.id, { email: fEmail.trim(), username: fUsername.trim() }),
                  "已保存")}
                className="wb-btn wb-btn-primary"
              >
                {busy ? "保存中…" : "保存"}
              </button>
            </>
          }
        >
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-app-fg">邮箱</span>
              <input value={fEmail} onChange={(e) => setFEmail(e.target.value)} className="wb-input h-9" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-app-fg">用户名</span>
              <input value={fUsername} onChange={(e) => setFUsername(e.target.value)} maxLength={30} className="wb-input h-9" />
            </label>
            {formError && <Banner tone="err">{formError}</Banner>}
          </div>
        </Modal>
      )}

      {/* 重置密码 */}
      {modal?.kind === "password" && (
        <Modal
          title="重置密码"
          subtitle={modal.user.username}
          onClose={closeModal}
          maxWidth="max-w-md"
          footer={
            <>
              <button type="button" onClick={closeModal} disabled={busy} className="wb-btn">取消</button>
              <button
                type="button"
                disabled={busy || fPassword.length < 6}
                onClick={() => void run(
                  () => adminService.resetPassword(modal.user.id, fPassword),
                  `已重置 ${modal.user.username} 的密码`)}
                className="wb-btn wb-btn-primary"
              >
                {busy ? "提交中…" : "确认重置"}
              </button>
            </>
          }
        >
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-app-fg">新密码</span>
              <PasswordInput
                value={fPassword}
                onChange={(e) => setFPassword(e.target.value)}
                placeholder="至少 6 位"
                autoComplete="new-password"
              />
            </label>
            <Banner tone="info">
              密码以 BCrypt 哈希存储，<strong>无法查看原密码</strong>，只能像这样重置。
              新密码由你自行设定，接口不会回显。
            </Banner>
            {formError && <Banner tone="err">{formError}</Banner>}
          </div>
        </Modal>
      )}

      {/* 启用 / 禁用 */}
      {modal?.kind === "status" && (
        <Modal
          title={modal.user.status === "active" ? "禁用该账号？" : "启用该账号？"}
          subtitle={modal.user.username}
          onClose={closeModal}
          maxWidth="max-w-md"
          footer={
            <>
              <button type="button" onClick={closeModal} disabled={busy} className="wb-btn">取消</button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void run(
                  () => adminService.updateUserStatus(
                    modal.user.id,
                    modal.user.status === "active" ? "disabled" : "active"),
                  modal.user.status === "active" ? "已禁用" : "已启用")}
                className="wb-btn wb-btn-primary"
              >
                {busy ? "处理中…" : "确认"}
              </button>
            </>
          }
        >
          <p className="text-[13px] text-app-t3 leading-relaxed">
            {modal.user.status === "active"
              ? "禁用后该账号无法登录，且已有登录态会在数秒内失效（后台写入了即时失效标记）。其历史数据保留。"
              : "启用后该账号可以重新登录。"}
          </p>
          {formError && <div className="mt-3"><Banner tone="err">{formError}</Banner></div>}
        </Modal>
      )}

      {/* 删除 */}
      {modal?.kind === "delete" && (
        <Modal
          title="删除该用户？"
          subtitle={modal.user.username}
          onClose={closeModal}
          maxWidth="max-w-md"
          footer={
            <>
              <button type="button" onClick={closeModal} disabled={busy} className="wb-btn">取消</button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void run(() => adminService.deleteUser(modal.user.id), "已删除")}
                className="wb-btn wb-btn-primary"
              >
                {busy ? "删除中…" : "确认删除"}
              </button>
            </>
          }
        >
          <Banner tone="err">
            这是<strong>软删除</strong>：账号置为「已删除」、邮箱与用户名被混淆以释放唯一键，立即无法登录。
            之所以不真删 —— 该用户的会话/作品/审核记录都有外键指向它，硬删要么被拒、要么留下孤儿数据。
          </Banner>
          <p className="text-[13px] text-app-t3 mt-3 leading-relaxed">
            该用户当前有 <strong className="text-app-fg">{modal.user.conversationCount}</strong> 条会话、
            <strong className="text-app-fg"> {modal.user.workCount}</strong> 个作品，删除后它们会保留。
          </p>
          {formError && <div className="mt-3"><Banner tone="err">{formError}</Banner></div>}
        </Modal>
      )}
    </div>
  );
}
