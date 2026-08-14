import { useEffect, useState } from "react";
import {
  Star,
  Flame,
  CheckCircle2,
  Loader2,
  Lock,
  ChevronDown,
  Medal,
  Sprout,
  Rocket,
  Gem,
  Crown,
} from "lucide-react";
import { learningService } from "@/services/learningService";
import { CountUp } from "@/components/common/CountUp";
import { badgeService } from "@/services/badgeService";
import { useAuthStore } from "@/store/authStore";
import { useUiStore } from "@/store/uiStore";
import { mockLearningProgress, mockBadges } from "@/lib/mockData";
import type { LearningProgress, Badge, Stage, StageId } from "@/types";

const stageMeta: Record<StageId, { icon: typeof Sprout; color: string }> = {
  beginner: { icon: Sprout, color: "#22D3EE" },
  intermediate: { icon: Rocket, color: "#4B3FE3" },
  advanced: { icon: Gem, color: "#38BDF8" },
  master: { icon: Crown, color: "#EC4899" },
};

const stageStatusLabel: Record<Stage["status"], string> = {
  completed: "已完成",
  in_progress: "进行中",
  locked: "未解锁",
};

const kpStatusLabel: Record<string, string> = {
  mastered: "已掌握",
  learning: "学习中",
  locked: "未解锁",
};

function StatCard({
  icon: Icon,
  label,
  value,
  suffix,
  color,
}: {
  icon: typeof Star;
  label: string;
  value: number;
  suffix?: string;
  color: string;
}) {
  return (
    <div className="wb-card flex items-center gap-4 wb-card-hover">
      <div
        className="w-11 h-11 shrink-0 rounded-2xl flex items-center justify-center border"
        style={{ backgroundColor: `${color}1F`, borderColor: `${color}45`, color }}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-[#737373]">{label}</p>
        <p className="text-xl md:text-2xl font-semibold text-[#171717] mt-0.5">
          {value === 0 && label === "平均评分" ? "—" : <CountUp value={value} decimals={label === "平均评分" ? 1 : 0} />}
          {suffix && <span className="text-sm text-[#737373] font-normal ml-1">{suffix}</span>}
        </p>
      </div>
    </div>
  );
}

/** 阶段节点卡片（可展开知识点） */
function StageCard({ stage, isCurrent }: { stage: Stage; isCurrent: boolean }) {
  const meta = stageMeta[stage.id];
  const Icon = meta.icon;
  const [expanded, setExpanded] = useState(isCurrent || stage.status === "completed");

  return (
    <div className={`wb-card p-5 ${stage.status === "locked" ? "opacity-70" : ""}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 text-left"
      >
        <div
          className="w-10 h-10 shrink-0 rounded-2xl flex items-center justify-center border"
          style={{ backgroundColor: `${meta.color}1F`, borderColor: `${meta.color}45`, color: meta.color }}
        >
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#171717]">{stage.name}</p>
          <p className="text-[11px] text-[#A0A0A8] mt-0.5">
            {stage.knowledgePoints.filter((k) => k.status === "mastered").length}/{stage.knowledgePoints.length} 个知识点已掌握
          </p>
        </div>
        <span
          className={`wb-badge ${
            stage.status === "completed"
              ? "wb-badge-ok"
              : stage.status === "in_progress"
                ? "wb-badge-blue"
                : ""
          } ${stage.status === "locked" ? "opacity-60" : ""}`}
        >
          {stageStatusLabel[stage.status]}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-[#A0A0A8] transition-transform duration-150 ease-in-out ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-[#E5E6EA] flex flex-col gap-1">
          {stage.knowledgePoints.map((kp) => (
            <KnowledgePointRow key={kp.id} name={kp.name} status={kp.status} bestRating={kp.bestRating} />
          ))}
        </div>
      )}
    </div>
  );
}

function KnowledgePointRow({ name, status, bestRating }: { name: string; status: string; bestRating: number | null }) {
  const setActiveSection = useUiStore((s) => s.setActiveSection);

  const handleClick = () => {
    if (status === "locked") return;
    setActiveSection("chat");
  };

  return (
    <button
      onClick={handleClick}
      disabled={status === "locked"}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 ease-in-out ${
        status === "locked"
          ? "opacity-50 cursor-not-allowed"
          : "hover:bg-[#F0F1F4]/60 cursor-pointer"
      }`}
    >
      {status === "mastered" ? (
        <CheckCircle2 className="w-4 h-4 text-[#3A3A3A] shrink-0" />
      ) : status === "learning" ? (
        <span className="w-4 h-4 shrink-0 rounded-full bg-blue-400/60 border-2 border-blue-500 animate-pulse" />
      ) : (
        <Lock className="w-4 h-4 text-[#A0A0A8] shrink-0" />
      )}
      <span className={`flex-1 text-left ${status === "locked" ? "text-[#A0A0A8]" : "text-[#3A3A3A]"}`}>{name}</span>
      {status === "mastered" && bestRating !== null && (
        <span className="flex items-center gap-1 text-[11px] text-[#3A3A3A]">
          <Star className="w-3 h-3 fill-blue-500" />
          {bestRating}
        </span>
      )}
      {status !== "locked" && (
        <span className="text-[10px] text-[#A0A0A8]">{kpStatusLabel[status]}</span>
      )}
    </button>
  );
}

/** 徽章墙 */
function BadgeWall({ badges }: { badges: Badge[] }) {
  return (
    <div className="wb-card">
      <div className="flex items-center gap-2 mb-4">
        <Medal className="w-4 h-4 text-[#3A3A3A]" />
        <h3 className="text-sm font-semibold text-[#171717]">成就徽章</h3>
        <span className="ml-auto text-xs text-[#A0A0A8]">
          {badges.filter((b) => b.unlocked).length}/{badges.length} 已获得
        </span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {badges.map((badge) => (
          <div
            key={badge.id}
            title={`${badge.description}${badge.unlocked ? "" : "（未解锁）"}`}
            className={`shrink-0 w-20 flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all duration-150 ease-in-out ${
              badge.unlocked
                ? "bg-[#F0F1F4] border-[#D6D8DE]"
                : "bg-white border-[#E5E6EA] opacity-50 grayscale"
            }`}
          >
            <Medal className={`w-6 h-6 ${badge.unlocked ? "text-[#3A3A3A]" : "text-[#A0A0A8]"}`} />
            <p className={`text-[10px] text-center leading-tight ${badge.unlocked ? "text-[#3A3A3A]" : "text-[#A0A0A8]"}`}>
              {badge.name}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LearningMapPage() {
  const token = useAuthStore((s) => s.token);
  const isDemo = token === "demo-token";

  const [progress, setProgress] = useState<LearningProgress | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
        const [p, b] = await Promise.all([
          learningService.getProgress(),
          badgeService.list(),
        ]);
        if (!cancelled) {
          setProgress(p);
          setBadges(b.badges);
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
        <Loader2 className="w-6 h-6 text-[#3A3A3A] animate-spin" />
      </div>
    );
  }

  if (!progress) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 px-6">
        <p className="text-sm text-[#737373]">{error || "暂无学习进度数据"}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-8 flex flex-col gap-6">
      <div>
        <h1 className="wb-title text-2xl md:text-3xl">学习地图</h1>
        <p className="wb-text text-sm mt-1.5">
          通过对话练习掌握提示词工程，解锁你的 AI 成长路径
        </p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={Star}
          label="平均评分"
          value={progress.stats.averageRating}
          suffix="/5"
          color="#4B3FE3"
        />
        <StatCard
          icon={Flame}
          label="连续打卡"
          value={progress.stats.streakDays}
          suffix="天"
          color="#EC4899"
        />
        <StatCard
          icon={CheckCircle2}
          label="已掌握知识点"
          value={progress.stats.masteredCount}
          suffix="个"
          color="#22D3EE"
        />
      </div>

      {/* 四阶段技能树 */}
      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-medium text-[#3A3A3A]">成长路径</h2>
        {progress.stages.map((stage, i) => (
          <div key={stage.id} className="flex flex-col gap-4">
            <StageCard stage={stage} isCurrent={stage.id === progress.currentStage} />
            {i < progress.stages.length - 1 && (
              <div className="flex justify-center">
                <div className="w-px h-5 bg-[#E5E6EA]" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 徽章墙 */}
      <BadgeWall badges={badges} />
    </div>
  );
}
