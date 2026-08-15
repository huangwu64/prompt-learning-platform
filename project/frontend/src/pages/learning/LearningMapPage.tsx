import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Star,
  Flame,
  CheckCircle2,
  Loader2,
  Lock,
  Medal,
  Sprout,
  Rocket,
  Gem,
  Crown,
  ArrowRight,
  Check,
  Sparkles,
  Route,
} from "lucide-react";
import { learningService } from "@/services/learningService";
import { CountUp } from "@/components/common/CountUp";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { badgeService } from "@/services/badgeService";
import { useAuthStore } from "@/store/authStore";
import { useUiStore } from "@/store/uiStore";
import { mockLearningProgress, mockBadges } from "@/lib/mockData";
import type { LearningProgress, Badge, Stage, StageId } from "@/types";

const stageMeta: Record<StageId, { icon: typeof Sprout; color: string }> = {
  beginner: { icon: Sprout, color: "#00B983" },
  intermediate: { icon: Rocket, color: "#4B3FE3" },
  advanced: { icon: Gem, color: "#9FA3D6" },
  master: { icon: Crown, color: "#7A6FF0" },
};

const kpStatusLabel: Record<string, string> = {
  mastered: "已掌握",
  learning: "学习中",
  locked: "未解锁",
};

const EASE = [0.4, 0, 0.2, 1] as const;

/**
 * 整体进度横幅（渐变带，非方框）：
 * 当前阶段 + 总进度 + 继续练习入口，页面视觉锚点。
 */
function ProgressBanner({
  currentStage,
  mastered,
  total,
  nextStageName,
  onContinue,
}: {
  currentStage: Stage;
  mastered: number;
  total: number;
  nextStageName?: string;
  onContinue: () => void;
}) {
  const meta = stageMeta[currentStage.id];
  const Icon = meta.icon;
  const pct = total > 0 ? Math.min(Math.round((mastered / total) * 100), 100) : 0;
  const masteredInStage = currentStage.knowledgePoints.filter((k) => k.status === "mastered").length;

  return (
    <div className="relative overflow-hidden rounded-[24px] p-6 md:p-8 text-[#F6F7F9] shadow-[0_24px_60px_-20px_rgba(20,20,19,0.45)]"
      style={{
        background:
          "linear-gradient(120deg, #4B3FE3 0%, #6B5BFF 100%)",
      }}
    >
      {/* 细节：顶部内高光 + 陶土光晕 */}
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0) 30%)",
      }} />
      {/* 有机光点装饰（陶土 / 琥珀） */}
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 w-64 h-64 rounded-full bg-[#4B3FE3]/25 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -left-20 -bottom-24 w-56 h-56 rounded-full bg-[#7A6FF0]/15 blur-3xl" />
      <motion.span
        aria-hidden
        className="pointer-events-none absolute right-12 bottom-6 w-16 h-16 rounded-full bg-[#4B3FE3]/20"
        animate={{ scale: [1, 1.18, 1], opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative flex flex-col lg:flex-row lg:items-center gap-6">
        {/* 当前阶段 */}
        <div className="flex items-center gap-4 shrink-0">
          <motion.span
            className="w-12 h-12 shrink-0 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <Icon className="w-6 h-6" />
          </motion.span>
          <div className="min-w-0">
            <p className="text-xs text-white/70">当前阶段</p>
            <p className="text-xl font-bold tracking-tight">{currentStage.name}阶段</p>
            <p className="text-xs text-white/80 mt-0.5 truncate">
              {masteredInStage}/{currentStage.knowledgePoints.length} 个知识点已掌握
              {nextStageName ? ` · 下一步：${nextStageName}` : " · 已是最终阶段"}
            </p>
          </div>
        </div>

        {/* 整体进度 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between mb-2 gap-4">
            <span className="text-xs text-white/75">整体进度</span>
            <span className="text-sm font-semibold tabular-nums">
              {mastered}/{total} 已掌握 · {pct}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-white/20 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-white"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.9, ease: EASE }}
            />
          </div>
        </div>

        <button
          onClick={onContinue}
          className="shrink-0 self-start lg:self-auto inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-blue-600 shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md active:scale-[0.97]"
        >
          继续练习
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/**
 * 统计数字（Linear 细节：渐变图标容器 + 精修排版）
 */
function StatFigure({
  icon: Icon,
  label,
  value,
  suffix,
  decimals = 0,
}: {
  icon: typeof Star;
  label: string;
  value: number;
  suffix?: string;
  decimals?: number;
  color: string;
}) {
  return (
    <div className="group relative px-1 py-2">
      {/* 渐变图标容器（Linear 三色） */}
      <span className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-lg text-white shadow-[0_4px_14px_-2px_rgba(94,106,210,0.5)] transition-transform duration-200 ease-out group-hover:scale-110 group-hover:shadow-[0_6px_20px_-2px_rgba(139,92,246,0.55)]"
        style={{ background: "linear-gradient(135deg, #4B3FE3, #6B5BFF 60%, #7A6FF0)" }}
      >
        <Icon className="h-4 w-4" />
      </span>
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-app-t4">{label}</p>
      <p className="mt-1.5 text-3xl md:text-4xl font-semibold leading-none tracking-tight text-app-fg tabular-nums transition-colors duration-200 group-hover:text-white">
        {value === 0 && label === "平均评分" ? "—" : <CountUp value={value} decimals={decimals} />}
        {suffix && <span className="text-sm md:text-base text-app-t3 font-normal ml-1">{suffix}</span>}
      </p>
    </div>
  );
}

/**
 * 知识点 pill（圆角胶囊，非卡片）
 */
function KnowledgePill({ name, status, bestRating }: { name: string; status: string; bestRating: number | null }) {
  const setActiveSection = useUiStore((s) => s.setActiveSection);

  return (
    <button
      onClick={() => {
        if (status !== "locked") setActiveSection("chat");
      }}
      disabled={status === "locked"}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all duration-200 ease-out ${
        status === "mastered"
          ? "border-accent-300/35 bg-accent-300/10 text-accent-200 hover:-translate-y-0.5 hover:border-accent-300/60 hover:shadow-[0_0_18px_-4px_rgba(126,226,184,0.45)]"
          : status === "learning"
            ? "border-blue-400/35 bg-blue-500/10 text-blue-300 hover:-translate-y-0.5 hover:border-blue-400/60 hover:shadow-[0_0_18px_-4px_rgba(94,106,210,0.5)]"
            : "border-app-border bg-app-surface text-app-t4 cursor-not-allowed opacity-60"
      }`}
    >
      {status === "mastered" ? (
        <Check className="w-3 h-3" />
      ) : status === "learning" ? (
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
      ) : (
        <Lock className="w-3 h-3" />
      )}
      {name}
      {status === "mastered" && bestRating !== null && (
        <span className="text-[10px] opacity-70 tabular-nums">· {bestRating}★</span>
      )}
      {status !== "locked" && <span className="text-[10px] opacity-60">{kpStatusLabel[status]}</span>}
    </button>
  );
}

/**
 * 蜿蜒时间线阶段行：
 * 中心线 + 圆形有机节点（左右交错内容），无方框。
 */
function TimelineStage({
  stage,
  isCurrent,
  align,
  index,
  activeId,
  onToggle,
}: {
  stage: Stage;
  isCurrent: boolean;
  align: "left" | "right";
  index: number;
  activeId: StageId;
  onToggle: (id: StageId) => void;
}) {
  const meta = stageMeta[stage.id];
  const Icon = meta.icon;
  const masteredInStage = stage.knowledgePoints.filter((k) => k.status === "mastered").length;
  const isDone = stage.status === "completed";
  const isLocked = stage.status === "locked";
  const expanded = activeId === stage.id;
  // align=left → 内容在右；align=right → 内容在左（节点始终居中）
  const contentOnRight = align === "left";

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.12, ease: EASE }}
      className="relative flex items-start py-5"
    >
      {/* 内容区（左右交替） */}
      <div
        className={`flex-1 min-w-0 ${isLocked ? "opacity-60" : ""} ${
          contentOnRight ? "pl-16 md:pl-24" : "pr-16 md:pr-24"
        }`}
      >
        <div className={`flex flex-col gap-3 ${!contentOnRight ? "md:items-end md:text-right" : ""}`}>
          <div className={`flex flex-wrap items-center gap-2.5 ${!contentOnRight ? "md:justify-end" : ""}`}>
            <h3 className={`text-lg md:text-xl font-bold tracking-tight ${isCurrent ? "text-blue-600" : "text-app-fg"}`}>
              {stage.name}阶段
            </h3>
            {isCurrent && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[10px] font-medium text-blue-700">
                <Sparkles className="w-3 h-3" />
                进行中
              </span>
            )}
            {isDone && <CheckCircle2 className="w-4 h-4 text-accent-500" />}
          </div>

          <p className="text-xs text-app-t4 tabular-nums">
            {isLocked ? "完成上一阶段后开启" : `${masteredInStage}/${stage.knowledgePoints.length} 个知识点已掌握`}
          </p>

          {/* 知识点 pills（当前/展开时显示） */}
          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                key="pills"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.28, ease: EASE }}
                className="overflow-hidden"
              >
                <div className={`flex flex-wrap gap-2 pt-1 ${!contentOnRight ? "md:justify-end" : ""}`}>
                  {stage.knowledgePoints.map((kp) => (
                    <KnowledgePill key={kp.id} name={kp.name} status={kp.status} bestRating={kp.bestRating} />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 圆形节点（居中于中心线） */}
      <div className="absolute left-1/2 top-5 -translate-x-1/2">
        <button
          onClick={() => onToggle(stage.id)}
          aria-label={`${stage.name}阶段${expanded ? "收起" : "展开"}`}
          className={`relative flex items-center justify-center rounded-full border transition-all duration-300 ease-out ${
            isLocked
              ? "w-14 h-14 md:w-16 md:h-16 border-dashed border-app-borderStrong bg-app-surface/60 text-app-t4"
              : isDone
                ? "w-14 h-14 md:w-16 md:h-16 bg-app-surface text-accent-300 hover:scale-105 hover:shadow-[0_0_22px_-4px_rgba(126,226,184,0.45)]"
                : "w-16 h-16 md:w-20 md:h-20 border-transparent text-white"
          } ${isCurrent ? "shadow-[0_16px_40px_-12px_rgba(94,106,210,0.65)] ring-4 ring-blue-500/25" : ""}`}
          style={
            isLocked
              ? undefined
              : isDone
                ? { borderColor: "rgba(126,226,184,0.35)" }
                : { background: "linear-gradient(135deg, #4B3FE3 0%, #6B5BFF 60%, #7A6FF0 100%)" }
          }
        >
          {isDone ? <Check className="w-6 h-6 md:w-7 md:h-7" /> : <Icon className="w-5 h-5 md:w-6 md:h-6" />}
          {isCurrent && (
            <motion.span
              aria-hidden
              className="absolute inset-0 rounded-full border-2 border-accent-300/70"
              animate={{ scale: [1, 1.22], opacity: [0.7, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
            />
          )}
        </button>
      </div>
    </motion.div>
  );
}

/** 阶段间连接线（SVG 蜿蜒曲线，非方框） */
function TimelineConnector({ completed, align }: { completed: boolean; align: "left" | "right" }) {
  const from = 40; // 上端 x（中心）
  const to = align === "right" ? 12 : 68; // 下端偏向下一节点侧
  return (
    <div className="relative mx-auto w-full h-9 max-w-2xl" aria-hidden>
      <svg viewBox="0 0 80 36" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
        <path
          d={`M ${from} 0 C ${from} 18, ${to} 18, ${to} 36`}
          fill="none"
          stroke={completed ? "#4B3FE3" : "#333B4A"}
          strokeWidth={2}
          strokeDasharray={completed ? "none" : "2 6"}
          strokeLinecap="round"
          opacity={completed ? 0.55 : 1}
        />
      </svg>
    </div>
  );
}

/** 徽章横排（圆形徽章，无容器边框） */
function BadgeRow({ badges }: { badges: Badge[] }) {
  return (
    <div>
      <SectionTitle
        icon={Medal}
        className="mb-4"
        right={
          <span className="text-xs text-app-t4 tabular-nums">
            {badges.filter((b) => b.unlocked).length}/{badges.length} 已获得
          </span>
        }
      >
        成就徽章
      </SectionTitle>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {badges.map((badge) => (
          <motion.div
            key={badge.id}
            title={`${badge.description}${badge.unlocked ? "" : "（未解锁）"}`}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: EASE }}
            className={`shrink-0 flex flex-col items-center gap-1.5 ${
              badge.unlocked ? "" : "opacity-40 grayscale"
            }`}
          >
            <span
              className={`w-14 h-14 rounded-full flex items-center justify-center border transition-all duration-200 ease-out ${
                badge.unlocked
                  ? "bg-app-chrome border-app-borderStrong hover:-translate-y-1 hover:shadow-[0_10px_24px_-8px_rgba(65,118,230,0.3)]"
                  : "bg-app-surface border-dashed border-app-border"
              }`}
            >
              <Medal className={`w-6 h-6 ${badge.unlocked ? "text-blue-500" : "text-app-t4"}`} />
            </span>
            <p className={`text-[10px] text-center leading-tight ${badge.unlocked ? "text-app-t2" : "text-app-t4"}`}>
              {badge.name}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default function LearningMapPage() {
  const token = useAuthStore((s) => s.token);
  const isDemo = token === "demo-token";
  const setActiveSection = useUiStore((s) => s.setActiveSection);

  const [progress, setProgress] = useState<LearningProgress | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeId, setActiveId] = useState<StageId>("intermediate");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (isDemo) {
        setProgress(mockLearningProgress);
        setBadges(mockBadges);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      try {
        const [p, b] = await Promise.all([learningService.getProgress(), badgeService.list()]);
        if (!cancelled) {
          setProgress(p);
          setBadges(b.badges);
          setActiveId(p.currentStage);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "加载失败");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [isDemo]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-app-t2 animate-spin" />
      </div>
    );
  }

  if (!progress) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 px-6">
        <p className="text-sm text-app-t3">{error || "暂无学习进度数据"}</p>
      </div>
    );
  }

  const totalKps = progress.stages.reduce((n, s) => n + s.knowledgePoints.length, 0);
  const currentStage = progress.stages.find((s) => s.id === progress.currentStage) ?? progress.stages[0];
  const currentIdx = progress.stages.findIndex((s) => s.id === currentStage.id);
  const nextStageName = progress.stages[currentIdx + 1]?.name;

  return (
    <div className="wb-page">
      {/* 页头（编辑式） */}
      <div className="wb-page-head wb-reveal">
        <h1 className="font-display text-2xl md:text-3xl font-medium tracking-tight text-app-fg">学习地图</h1>
        <p className="wb-text text-sm">通过对话练习掌握提示词工程，解锁你的 AI 成长路径</p>
      </div>

      {/* 整体进度横幅（渐变带） */}
      <ProgressBanner
        currentStage={currentStage}
        mastered={progress.stats.masteredCount}
        total={totalKps}
        nextStageName={nextStageName}
        onContinue={() => setActiveSection("chat")}
      />

      {/* 编辑式统计数字（无卡片） */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 wb-reveal">
        <StatFigure icon={Star} label="平均评分" value={progress.stats.averageRating} suffix="/5" decimals={1} color="#4B3FE3" />
        <StatFigure icon={Flame} label="连续打卡" value={progress.stats.streakDays} suffix="天" color="#7A6FF0" />
        <StatFigure icon={CheckCircle2} label="已掌握知识点" value={progress.stats.masteredCount} suffix="个" color="#00B983" />
      </div>

      {/* 蜿蜒时间线技能树 */}
      <div className="wb-reveal">
        <SectionTitle icon={Route} className="mb-1">成长路径</SectionTitle>
        <div className="relative mt-4">
          {/* 中心线（渐变） */}
          <div
            aria-hidden
            className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-gradient-to-b from-blue-400/40 via-app-border to-transparent"
          />
          {progress.stages.map((stage, i) => (
            <div key={stage.id}>
              <TimelineStage
                stage={stage}
                isCurrent={stage.id === progress.currentStage}
                align={i % 2 === 0 ? "left" : "right"}
                index={i}
                activeId={activeId}
                onToggle={setActiveId}
              />
              {i < progress.stages.length - 1 && (
                <TimelineConnector completed={stage.status === "completed"} align={i % 2 === 0 ? "right" : "left"} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 徽章横排 */}
      <div className="wb-reveal">
        <BadgeRow badges={badges} />
      </div>
    </div>
  );
}
