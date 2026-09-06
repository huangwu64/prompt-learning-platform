import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Flame, Clock, Sparkles, Inbox } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import {
  promptCategories,
  promptGallerySeed,
  type PromptCategory,
  type PromptWork,
} from "./galleryData";
import { categoryMeta } from "./components/promptMeta";
import { PromptCard } from "./components/PromptCard";
import {
  PromptDetailModal,
  PromptUploadModal,
  type UploadDraft,
} from "./components/PromptModals";

type SortKey = "hot" | "new";

/**
 * 作品工厂（灵感广场 · 第一版原型）：
 * 浏览社区分享的现成提示词 + 右下角 + 上传自己的投稿。
 * 数据契约见 galleryData.ts；后续此页改为调后端社区接口。
 */
export default function WorksPage() {
  const user = useAuthStore((s) => s.user);

  // —— 数据（种子 + 本地上传，先看效果）——
  const [items, setItems] = useState<PromptWork[]>(promptGallerySeed);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

  // —— 筛选 / 排序 / 搜索 ——
  const [category, setCategory] = useState<PromptCategory | "全部">("全部");
  const [sort, setSort] = useState<SortKey>("hot");
  const [keyword, setKeyword] = useState("");

  // —— UI 状态 ——
  const [detail, setDetail] = useState<PromptWork | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const visible = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    let list = items.filter((w) => {
      const inCat = category === "全部" || w.category === category;
      if (!inCat) return false;
      if (!kw) return true;
      const hay = [w.title, w.description, w.author, ...w.tags, w.content].join(" ").toLowerCase();
      return hay.includes(kw);
    });
    list = [...list].sort((a, b) =>
      sort === "hot" ? b.likes - a.likes : b.createdAt.localeCompare(a.createdAt)
    );
    return list;
  }, [items, category, keyword, sort]);

  const publish = (draft: UploadDraft) => {
    const name = user?.username?.trim() || "体验用户";
    const item: PromptWork = {
      id: `local_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      title: draft.title,
      category: draft.category,
      description: draft.description,
      tags: draft.tags,
      content: draft.content,
      author: name,
      likes: 0,
      favorites: 0,
      uses: 0,
      createdAt: new Date().toISOString(),
    };
    setItems((prev) => [item, ...prev]);
    setUploadOpen(false);
    setCategory("全部");
    setToast("已发布到灵感广场 🎉");
  };

  const toggleLike = (id: string) => {
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        setItems((all) => all.map((w) => (w.id === id ? { ...w, likes: w.likes - 1 } : w)));
      } else {
        next.add(id);
        setItems((all) => all.map((w) => (w.id === id ? { ...w, likes: w.likes + 1 } : w)));
      }
      return next;
    });
  };

  const countPer = (c: PromptCategory) => items.filter((w) => w.category === c).length;

  return (
    <div className="w-full max-w-7xl mx-auto px-5 md:px-8 py-8 md:py-10 flex flex-col gap-6">
      {/* 页头 */}
      <div className="wb-reveal">
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-[0_6px_18px_-4px_rgba(75,63,227,0.5)]"
            style={{ background: "linear-gradient(135deg,#4B3FE3,#6B5BFF 60%,#7A6FF0)" }}
          >
            <Sparkles className="w-5 h-5" />
          </span>
          <div>
            <h1 className="font-display text-2xl md:text-[26px] font-medium tracking-tight text-app-fg">
              灵感广场
            </h1>
            <p className="wb-text text-sm">
              发现别人打磨好的现成提示词，一键复制即用；也欢迎分享你的作品
            </p>
          </div>
        </div>
      </div>

      {/* 工具栏：搜索 + 排序 */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center wb-reveal">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-app-t4" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索提示词 / 标签 / 作者…"
            className="wb-input !pl-10 !py-2.5 !text-[14px]"
          />
        </div>
        <div className="flex items-center gap-1 shrink-0 rounded-xl border border-app-border bg-app-chrome p-1">
          {(
            [
              { key: "hot", label: "最热", icon: Flame },
              { key: "new", label: "最新", icon: Clock },
            ] as { key: SortKey; label: string; icon: typeof Flame }[]
          ).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setSort(key)}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm transition ${
                sort === key
                  ? "bg-blue-500 text-white shadow-sm"
                  : "text-app-t3 hover:text-app-fg"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 分类筛选 */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 wb-reveal">
        <button
          onClick={() => setCategory("全部")}
          className={`wb-btn wb-btn-ghost !text-xs !px-3 !py-1.5 whitespace-nowrap ${
            category === "全部" ? "!border-blue-500 !bg-blue-50 !text-blue-600" : ""
          }`}
        >
          全部
          <span className="ml-1 text-app-t4 tabular-nums">{items.length}</span>
        </button>
        {promptCategories.map((c) => {
          const meta = categoryMeta[c];
          const active = category === c;
          return (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`wb-btn wb-btn-ghost !text-xs !px-3 !py-1.5 whitespace-nowrap gap-1.5 ${
                active ? "!border-blue-500 !bg-blue-50 !text-blue-600" : ""
              }`}
            >
              <meta.icon className="w-3.5 h-3.5" />
              {c}
              <span className={`${active ? "text-blue-400" : "text-app-t4"} tabular-nums`}>
                {countPer(c)}
              </span>
            </button>
          );
        })}
      </div>

      {/* 画廊 */}
      {visible.length === 0 ? (
        <div className="wb-card flex flex-col items-center justify-center gap-3 py-20 text-center">
          <span className="w-14 h-14 rounded-2xl bg-app-chrome border border-app-border flex items-center justify-center text-app-t3">
            <Inbox className="w-6 h-6" />
          </span>
          <div>
            <p className="text-[15px] text-app-fg font-medium">没有匹配的提示词</p>
            <p className="text-xs text-app-t4 mt-1">换个关键词试试，或点右下角 + 分享你的第一条</p>
          </div>
        </div>
      ) : (
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5">
          <AnimatePresence>
            {visible.map((w) => (
              <motion.div
                key={w.id}
                layout
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              >
                <PromptCard
                  work={w}
                  liked={likedIds.has(w.id)}
                  onOpen={(cur) => {
                    setItems((all) =>
                      all.map((x) => (x.id === cur.id ? { ...x, uses: x.uses + 1 } : x))
                    );
                    setDetail(cur);
                  }}
                  onLike={toggleLike}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* 右下角：上传入口 */}
      <button
        onClick={() => setUploadOpen(true)}
        aria-label="分享提示词"
        title="分享你的提示词"
        className="fixed bottom-6 right-6 z-50 group flex items-center gap-2"
      >
        <span className="hidden group-hover:flex items-center whitespace-nowrap rounded-full bg-app-fg/85 text-app-surface text-xs px-3 py-1.5 backdrop-blur">
          分享你的提示词
        </span>
        <span className="w-14 h-14 rounded-full flex items-center justify-center text-white shadow-[0_10px_30px_-6px_rgba(75,63,227,0.65)] transition-transform group-hover:scale-105 active:scale-95"
          style={{ background: "linear-gradient(135deg,#4B3FE3,#6B5BFF 60%,#7A6FF0)" }}
        >
          <Plus className="w-6 h-6" />
        </span>
      </button>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            className="fixed bottom-24 right-6 z-[90] flex items-center gap-2 rounded-full bg-app-fg text-app-surface text-sm px-5 py-2.5 shadow-xl"
          >
            <Sparkles className="w-4 h-4 text-blue-300" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 弹窗 */}
      {detail && <PromptDetailModal work={detail} onClose={() => setDetail(null)} />}
      {uploadOpen && (
        <PromptUploadModal
          defaultAuthor={user?.username?.trim() || "体验用户"}
          submitting={false}
          onClose={() => setUploadOpen(false)}
          onPublish={publish}
        />
      )}
    </div>
  );
}
