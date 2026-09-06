import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { X, Check, Copy, Heart, Eye, Send, Loader2 } from "lucide-react";
import {
  promptCategories,
  type PromptCategory,
  type PromptWork,
} from "../galleryData";
import {
  categoryMeta,
  authorGradient,
  timeAgo,
  fmtCount,
  copyToClipboard,
} from "./promptMeta";

/* ============================================================
 * 通用：遮罩 + 面板骨架（Esc / 点遮罩关闭；入场动效）
 * ============================================================ */
interface ShellProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}
function ModalShell({ title, subtitle, onClose, children, maxWidth = "max-w-2xl" }: ShellProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        role="dialog"
        aria-modal="true"
        className={`relative w-full ${maxWidth} bg-app-surface rounded-2xl border border-app-border shadow-[0_24px_80px_-16px_rgba(20,20,60,0.35)] flex flex-col max-h-[90vh]`}
      >
        {/* 头部 */}
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-3 border-b border-app-border shrink-0">
          <div className="min-w-0">
            <h2 className="font-display text-lg font-medium tracking-tight text-app-fg truncate">
              {title}
            </h2>
            {subtitle && <p className="text-xs text-app-t4 mt-0.5 truncate">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="关闭"
            className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-app-t4 hover:text-app-fg hover:bg-app-chrome transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容 */}
        <div className="px-6 py-4 overflow-y-auto min-h-0 flex-1">{children}</div>
      </motion.div>
    </div>,
    document.body
  );
}

/* ============================================================
 * 详情弹窗
 * ============================================================ */
interface DetailProps {
  work: PromptWork;
  onClose: () => void;
}
export function PromptDetailModal({ work, onClose }: DetailProps) {
  const meta = categoryMeta[work.category];
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    if (await copyToClipboard(work.content)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  return (
    <ModalShell
      title={work.title}
      subtitle={`${work.author} · ${timeAgo(work.createdAt)} · 已使用 ${fmtCount(work.uses)} 次`}
      onClose={onClose}
      maxWidth="max-w-2xl"
    >
      <div className="flex flex-col gap-4">
        {/* 分类 + 统计 */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className={`wb-badge ${meta.badge} gap-1`}>
            <meta.icon className="w-3.5 h-3.5" />
            {meta.label}
          </span>
          <div className="flex items-center gap-4 text-xs text-app-t4 tabular-nums">
            <span className="flex items-center gap-1">
              <Heart className="w-4 h-4 text-rose-400" />
              {fmtCount(work.likes)} 人喜欢
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-4 h-4 text-sky-400" />
              {fmtCount(work.uses)} 次使用
            </span>
          </div>
        </div>

        <p className="text-sm text-app-t3 leading-relaxed -mt-1">{work.description}</p>

        {/* 提示词正文 */}
        <div className="relative">
          <p className="text-[11px] font-medium tracking-[0.14em] text-app-t4 mb-1.5">
            提示词正文（点击复制即用）
          </p>
          <pre className="m-0 whitespace-pre-wrap break-words rounded-xl bg-app-chrome/80 border border-app-border px-4 py-3.5 text-[13px] leading-relaxed text-app-t2 font-mono max-h-[46vh] overflow-y-auto">
            {work.content}
          </pre>
          <button
            onClick={handleCopy}
            className={`absolute right-3 top-9 wb-btn !text-xs !px-3 !py-1.5 !rounded-lg shadow-sm ${
              copied
                ? "!text-emerald-600 !border-emerald-200 !bg-emerald-50"
                : "!bg-app-surface"
            }`}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "已复制" : "复制"}
          </button>
        </div>

        {/* 标签 */}
        {work.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {work.tags.map((tag) => (
              <span key={tag} className="text-xs text-app-t3 bg-app-chrome rounded-md px-2 py-0.5">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* 底部作者卡 + 主 CTA */}
        <div className="mt-1 flex items-center justify-between gap-3 rounded-xl border border-app-border bg-app-surface px-4 py-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-xs font-semibold text-white"
              style={{ background: authorGradient(work.author) }}
            >
              {work.author[0] ?? "?"}
            </span>
            <div className="min-w-0">
              <p className="text-sm text-app-fg truncate">{work.author}</p>
              <p className="text-[11px] text-app-t4">社区创作者</p>
            </div>
          </div>
          <button onClick={handleCopy} className="wb-btn wb-btn-primary !text-sm !px-5 !py-2 shrink-0">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "已复制" : "复制提示词"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

/* ============================================================
 * 上传弹窗（右下角 + 触发）
 * ============================================================ */
export interface UploadDraft {
  title: string;
  category: PromptCategory;
  description: string;
  tags: string[];
  content: string;
}
interface UploadProps {
  defaultAuthor: string;
  submitting?: boolean;
  onClose: () => void;
  onPublish: (draft: UploadDraft) => void;
}
const uploadPlaceholder = `你是{角色}。我提供{输入}，请帮我{目标}。

要求：
1. {具体约束 1}
2. {具体约束 2}
...

【输出格式】
{期望的格式说明}`;

export function PromptUploadModal({ defaultAuthor, submitting, onClose, onPublish }: UploadProps) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<PromptCategory | null>(null);
  const [description, setDescription] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [content, setContent] = useState("");
  const [hint, setHint] = useState("");

  const reset = () => {
    setTitle("");
    setCategory(null);
    setDescription("");
    setTagsText("");
    setContent("");
    setHint("");
  };

  const close = () => {
    reset();
    onClose();
  };

  const submit = () => {
    if (!title.trim()) return setHint("请先填写标题");
    if (!category) return setHint("请选择一个分类");
    if (content.trim().length < 10) return setHint("提示词正文太短，至少 10 个字");
    const tags = tagsText
      .split(/[,，、\s]+/)
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 6);
    onPublish({
      title: title.trim(),
      category,
      description: description.trim(),
      tags,
      content: content.trim(),
    });
    reset();
  };

  return (
    <ModalShell title="分享你的提示词" subtitle="发布后出现在灵感广场，供大家复制使用" onClose={close} maxWidth="max-w-xl">
      <div className="flex flex-col gap-4">
        {/* 标题 */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-app-t3">标题</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={40}
            placeholder="一句话说清这个提示词能做什么，如：周报结果导向重写器"
            className="wb-input !py-2.5 !text-[14px]"
          />
        </div>

        {/* 分类 */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-app-t3">分类</label>
          <div className="flex flex-wrap gap-2">
            {promptCategories.map((c) => {
              const meta = categoryMeta[c];
              const active = category === c;
              return (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`wb-btn wb-btn-ghost !text-xs !px-3 !py-1.5 gap-1.5 ${
                    active ? "!border-blue-500 !bg-blue-50 !text-blue-600" : ""
                  }`}
                >
                  <meta.icon className="w-3.5 h-3.5" />
                  {c}
                </button>
              );
            })}
          </div>
        </div>

        {/* 用途一句话 */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-app-t3">
            用途一句话 <span className="text-app-t4 font-normal">（可选）</span>
          </label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={60}
            placeholder="如：把流水账改写成领导爱看的周报"
            className="wb-input !py-2.5 !text-[14px]"
          />
        </div>

        {/* 标签 */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-app-t3">
            标签 <span className="text-app-t4 font-normal">（可选，用逗号分隔，最多 6 个）</span>
          </label>
          <input
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            placeholder="周报, 职场, 汇报"
            className="wb-input !py-2.5 !text-[14px]"
          />
        </div>

        {/* 正文 */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-app-t3">提示词正文 *</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={9}
            placeholder={uploadPlaceholder}
            className="wb-input !py-3 !text-[13px] font-mono leading-relaxed resize-y"
          />
          <p className="text-[11px] text-app-t4">
            建议用「{'{'}{'占位符'}{'}'}」标出需要使用者自己替换的地方，并写明角色 / 任务 / 输出格式。
          </p>
        </div>

        {hint && <p className="text-xs text-red-600 -mt-1">{hint}</p>}

        <div className="flex items-center justify-between gap-3 pt-1 border-t border-app-border">
          <span className="text-xs text-app-t4">将以「{defaultAuthor}」的名义发布</span>
          <div className="flex items-center gap-2">
            <button onClick={close} className="wb-btn wb-btn-ghost !text-sm !px-4 !py-2">
              取消
            </button>
            <button
              onClick={submit}
              disabled={submitting}
              className="wb-btn wb-btn-primary !text-sm !px-5 !py-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              发布到广场
            </button>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
