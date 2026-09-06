import { useState } from "react";
import { Check, Copy, Heart, Eye } from "lucide-react";
import type { PromptWork } from "../galleryData";
import {
  categoryMeta,
  authorGradient,
  timeAgo,
  fmtCount,
  copyToClipboard,
} from "./promptMeta";

interface Props {
  work: PromptWork;
  liked?: boolean;
  onOpen: (work: PromptWork) => void;
  onLike?: (id: string) => void;
}

/** 灵感广场 · 提示词卡片 */
export function PromptCard({ work, liked, onOpen, onLike }: Props) {
  const meta = categoryMeta[work.category];
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await copyToClipboard(work.content);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    onLike?.(work.id);
  };

  return (
    <article
      onClick={() => onOpen(work)}
      className="wb-card wb-card-hover p-5 flex flex-col gap-3 cursor-pointer select-none"
    >
      {/* 头部：分类徽章 + 提交时间 */}
      <div className="flex items-center justify-between gap-2">
        <span className={`wb-badge ${meta.badge} gap-1`}>
          <meta.icon className="w-3 h-3" />
          {meta.label}
        </span>
        <span className="text-[11px] text-app-t4 whitespace-nowrap">{timeAgo(work.createdAt)}</span>
      </div>

      {/* 标题 + 一句话用途 */}
      <div className="flex flex-col gap-1">
        <h3 className="font-display text-[15px] font-medium text-app-fg leading-snug tracking-tight">
          {work.title}
        </h3>
        <p className="text-xs text-app-t3 leading-snug">{work.description}</p>
      </div>

      {/* 提示词正文预览 */}
      <pre className="m-0 whitespace-pre-wrap break-words rounded-lg bg-app-chrome/70 border border-app-border px-3 py-2.5 text-[12px] leading-relaxed text-app-t4 font-mono [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3] overflow-hidden">
        {work.content}
      </pre>

      {/* 标签 */}
      {work.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {work.tags.map((tag) => (
            <span key={tag} className="text-[11px] text-app-t3 bg-app-chrome rounded-md px-1.5 py-0.5">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* 底部：作者 + 数据 + 复制 */}
      <div className="mt-auto pt-1 flex items-center justify-between gap-2 border-t border-app-border">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className="w-5 h-5 shrink-0 rounded-full flex items-center justify-center text-[9px] font-semibold text-white"
            style={{ background: authorGradient(work.author) }}
          >
            {work.author[0] ?? "?"}
          </span>
          <span className="text-xs text-app-t3 truncate">{work.author}</span>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-app-t4 tabular-nums shrink-0">
          <button
            onClick={handleLike}
            aria-label={liked ? "取消点赞" : "点赞"}
            className={`flex items-center gap-1 transition-colors ${
              liked ? "text-rose-500" : "hover:text-rose-500"
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${liked ? "fill-current" : ""}`} />
            {fmtCount(work.likes)}
          </button>
          <span className="flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" />
            {fmtCount(work.uses)}
          </span>
        </div>

        <button
          onClick={handleCopy}
          className={`wb-btn wb-btn-ghost !text-[11px] !px-2.5 !py-1 !rounded-lg shrink-0 ${
            copied ? "!text-emerald-600 !border-emerald-200 !bg-emerald-50" : ""
          }`}
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "已复制" : "复制"}
        </button>
      </div>
    </article>
  );
}
