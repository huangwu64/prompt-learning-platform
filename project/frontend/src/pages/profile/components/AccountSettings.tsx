import { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Clock, ImageUp, KeyRound, Loader2, UserCog } from "lucide-react";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { PasswordInput } from "@/components/ui/password-input";
import { UserAvatar } from "@/components/common/UserAvatar";
import { profileService } from "@/services/profileService";
import type { AvatarStatusInfo, Profile } from "@/types";

/** 头像最大边长，与后端 MAX_DIMENSION 一致 */
const MAX_DIMENSION = 512;
/** 客户端可接受的源文件上限（缩图后再上传，所以可以比后端的 2MB 宽松） */
const MAX_SOURCE_BYTES = 10 * 1024 * 1024;

type Tone = "ok" | "err" | "info";

/**
 * 把选中的图片缩到 512px 以内再上传 —— 手机原图动辄几 MB，
 * 直接传会被后端的大小限制拒掉；前端预缩体验更好。
 * 后端仍会重新解码+缩放作为权威步骤，这里只是优化。
 */
async function shrinkImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const ratio = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  if (ratio === 1 && file.size <= 1024 * 1024) {
    return file; // 本来就够小，不动它（避免无谓的重编码损失）
  }

  const width = Math.max(1, Math.round(bitmap.width * ratio));
  const height = Math.max(1, Math.round(bitmap.height * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);

  // 保持原格式：PNG 转 JPEG 会把透明区域变成黑底
  const type = file.type === "image/png" ? "image/png" : "image/jpeg";
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.9));
  if (!blob) return file;

  const ext = type === "image/png" ? ".png" : ".jpg";
  return new File([blob], file.name.replace(/\.\w+$/, "") + ext, { type });
}

function Banner({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  const styles: Record<Tone, string> = {
    ok: "border-accent-200 bg-accent-50 text-accent-700",
    err: "border-red-200 bg-red-50 text-red-700",
    info: "border-app-border bg-app-chrome text-app-t2",
  };
  const Icon = tone === "err" ? AlertCircle : tone === "ok" ? CheckCircle2 : Clock;
  return (
    <div className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 ${styles[tone]}`}>
      <Icon className="w-4 h-4 shrink-0 mt-0.5" />
      <p className="text-[13px] leading-snug">{children}</p>
    </div>
  );
}

interface Props {
  profile: Profile;
  /** 资料变更后通知父组件重新拉取 */
  onRefresh: () => void;
}

export function AccountSettings({ profile, onRefresh }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const [avatar, setAvatar] = useState<AvatarStatusInfo | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState<{ tone: Tone; text: string } | null>(null);

  const [username, setUsername] = useState(profile.username);
  const [usernameBusy, setUsernameBusy] = useState(false);
  const [usernameMsg, setUsernameMsg] = useState<{ tone: Tone; text: string } | null>(null);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ tone: Tone; text: string } | null>(null);

  useEffect(() => {
    setUsername(profile.username);
  }, [profile.username]);

  useEffect(() => {
    let cancelled = false;
    profileService
      .getAvatarStatus()
      .then((s) => {
        if (!cancelled) setAvatar(s);
      })
      .catch(() => {
        /* 头像状态拿不到不该让整页报错 */
      });
    return () => {
      cancelled = true;
    };
  }, [profile.avatar, profile.avatarStatus]);

  const status = avatar?.status ?? profile.avatarStatus;
  const isPending = status === "pending";
  const rejectReason = avatar?.rejectReason ?? profile.avatarRejectReason;

  const handlePick = () => fileRef.current?.click();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // 允许重复选择同一个文件
    if (!file) return;

    setAvatarMsg(null);
    if (!["image/png", "image/jpeg"].includes(file.type)) {
      setAvatarMsg({ tone: "err", text: "只支持 PNG / JPEG 格式的图片" });
      return;
    }
    if (file.size > MAX_SOURCE_BYTES) {
      setAvatarMsg({ tone: "err", text: "图片过大，请选择 10MB 以内的文件" });
      return;
    }

    setAvatarBusy(true);
    try {
      const prepared = await shrinkImage(file);
      const result = await profileService.uploadAvatar(prepared);
      setAvatar(result);
      setAvatarMsg({ tone: "ok", text: "已提交审核，管理员通过后将展示新头像" });
      onRefresh();
    } catch (err) {
      setAvatarMsg({ tone: "err", text: err instanceof Error ? err.message : "上传失败" });
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleSaveUsername = async () => {
    const value = username.trim();
    if (!value || value === profile.username) return;
    setUsernameBusy(true);
    setUsernameMsg(null);
    try {
      await profileService.update({ username: value });
      setUsernameMsg({ tone: "ok", text: "用户名已更新" });
      onRefresh();
    } catch (err) {
      setUsernameMsg({ tone: "err", text: err instanceof Error ? err.message : "保存失败" });
    } finally {
      setUsernameBusy(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordMsg(null);
    if (newPassword.length < 6) {
      setPasswordMsg({ tone: "err", text: "新密码至少 6 位" });
      return;
    }
    setPasswordBusy(true);
    try {
      await profileService.changePassword({ oldPassword, newPassword });
      setOldPassword("");
      setNewPassword("");
      setPasswordMsg({ tone: "ok", text: "密码已更新，请用新密码登录" });
    } catch (err) {
      setPasswordMsg({ tone: "err", text: err instanceof Error ? err.message : "修改失败" });
    } finally {
      setPasswordBusy(false);
    }
  };

  return (
    <div className="wb-card wb-reveal">
      <SectionTitle icon={UserCog} className="mb-4">
        账号设置
      </SectionTitle>

      <div className="flex flex-col gap-6">
        {/* 头像 */}
        <section className="flex flex-col gap-3">
          <p className="text-[13px] font-medium text-app-fg">头像</p>

          <div className="flex items-center gap-4">
            <UserAvatar
              src={avatar?.avatar ?? profile.avatar}
              name={profile.username}
              className="w-16 h-16"
              fallbackClassName="text-lg"
            />
            <div className="min-w-0 flex-1 flex flex-col gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                {status === "approved" && <span className="wb-badge wb-badge-ok">已通过</span>}
                {status === "pending" && <span className="wb-badge wb-badge-blue">审核中</span>}
                {status === "rejected" && <span className="wb-badge wb-badge-danger">已驳回</span>}
                {status === "none" && <span className="wb-badge">未设置</span>}
                <button
                  type="button"
                  onClick={handlePick}
                  disabled={avatarBusy || isPending}
                  className="wb-btn wb-btn-primary h-8 px-3 text-[13px]"
                >
                  {avatarBusy ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      上传中…
                    </>
                  ) : (
                    <>
                      <ImageUp className="w-3.5 h-3.5" />
                      {status === "none" || status === "approved" ? "选择图片" : "重新上传"}
                    </>
                  )}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  className="hidden"
                  onChange={handleFile}
                />
              </div>
              <p className="text-[11px] text-app-t4 leading-relaxed">
                支持 PNG / JPEG。为保证清晰度建议使用 512×512 以上的正脸或标识图；
                提交后需管理员审核，通过前仍显示当前头像。
              </p>
            </div>
          </div>

          {isPending && (
            <Banner tone="info">
              头像已提交，正在等待管理员审核。审核期间展示的仍是当前头像。
            </Banner>
          )}
          {status === "rejected" && rejectReason && (
            <Banner tone="err">审核未通过：{rejectReason}</Banner>
          )}
          {avatarMsg && <Banner tone={avatarMsg.tone}>{avatarMsg.text}</Banner>}
        </section>

        <div className="h-px bg-app-border" />

        {/* 用户名 */}
        <section className="flex flex-col gap-3">
          <p className="text-[13px] font-medium text-app-fg">用户名</p>
          <div className="flex items-center gap-2">
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={30}
              className="wb-input h-9 max-w-xs"
            />
            <button
              type="button"
              onClick={handleSaveUsername}
              disabled={usernameBusy || !username.trim() || username.trim() === profile.username}
              className="wb-btn h-9"
            >
              {usernameBusy ? "保存中…" : "保存"}
            </button>
          </div>
          {usernameMsg && <Banner tone={usernameMsg.tone}>{usernameMsg.text}</Banner>}
        </section>

        <div className="h-px bg-app-border" />

        {/* 密码 */}
        <section className="flex flex-col gap-3">
          <p className="text-[13px] font-medium text-app-fg flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5 text-app-t3" />
            修改密码
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <PasswordInput
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="当前密码"
              autoComplete="current-password"
              containerClassName="sm:max-w-xs"
            />
            <PasswordInput
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="新密码（至少 6 位）"
              autoComplete="new-password"
              containerClassName="sm:max-w-xs"
            />
            <button
              type="button"
              onClick={handleChangePassword}
              disabled={passwordBusy || !oldPassword || !newPassword}
              className="wb-btn h-9"
            >
              {passwordBusy ? "提交中…" : "修改密码"}
            </button>
          </div>
          {passwordMsg && <Banner tone={passwordMsg.tone}>{passwordMsg.text}</Banner>}
        </section>
      </div>
    </div>
  );
}
