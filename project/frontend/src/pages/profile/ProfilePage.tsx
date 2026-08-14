import { useEffect, useState } from "react";
import {
  Radar as RadarIcon,
  Medal,
  Lightbulb,
  Loader2,
  User,
  MessageSquare,
  Star,
  Flame,
  CheckCircle2,
  CalendarDays,
} from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";
import { profileService } from "@/services/profileService";
import { CountUp } from "@/components/common/CountUp";
import { learningService } from "@/services/learningService";
import { badgeService } from "@/services/badgeService";
import { useAuthStore } from "@/store/authStore";
import {
  mockProfile,
  mockSkillRadar,
  mockProfileStats,
  mockBadges,
} from "@/lib/mockData";
import type { Badge, Profile } from "@/types";

const radarDimensions = [
  { key: "accuracy", label: "精确度" },
  { key: "structure", label: "结构化" },
  { key: "creativity", label: "创造力" },
  { key: "constraint", label: "约束性" },
  { key: "iteration", label: "迭代力" },
] as const;

function buildSuggestion(radar: Record<string, number>): { dimension: string; text: string } {
  const suggestions: Record<string, string> = {
    accuracy: "精确度偏低，建议多练习明确的任务描述，让 AI 更准确地理解你的需求。",
    structure: "结构化偏低，建议在提示词中补充角色设定、任务、格式等结构要素。",
    creativity: "创造力偏低，建议尝试不同的表达方式和策略，比如对比法、类比法。",
    constraint: "约束性偏低，建议多练习输出格式、字数、语气等约束条件的设定。",
    iteration: "迭代力偏低，建议多进行多轮对话练习，通过反馈不断优化提示词。",
  };

  const lowest = radarDimensions.reduce((min, dim) =>
    (radar[dim.key] ?? 0) < (radar[min.key] ?? 0) ? dim : min
  );
  return { dimension: lowest.label, text: suggestions[lowest.key] };
}

function StatItem({ icon: Icon, label, value, decimals = 0, suffix = "", color }: { icon: typeof Star; label: string; value: number; decimals?: number; suffix?: string; color: string }) {
  return (
    <div className="flex items-center gap-3 bg-white border-[#E5E6EA] rounded-2xl px-4 py-3">
      <Icon className="w-4 h-4 shrink-0" style={{ color }} />
      <div className="min-w-0">
        <p className="text-[11px] text-[#A0A0A8]">{label}</p>
        <p className="text-sm font-semibold text-[#171717]">
          <CountUp value={value} decimals={decimals} />
          {suffix}
        </p>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const token = useAuthStore((s) => s.token);
  const isDemo = token === "demo-token";

  const [profile, setProfile] = useState<Profile | null>(null);
  const [radar, setRadar] = useState<Record<string, number> | null>(null);
  const [stats, setStats] = useState({
    totalConversations: 0,
    averageRating: 0,
    streakDays: 0,
    masteredCount: 0,
  });
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (isDemo) {
        setProfile(mockProfile);
        setRadar(mockSkillRadar);
        setStats(mockProfileStats);
        setBadges(mockBadges);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      try {
        const [p, b, lp] = await Promise.all([
          profileService.get(),
          badgeService.list(),
          learningService.getProgress(),
        ]);
        if (!cancelled) {
          setProfile(p);
          setBadges(b.badges);
          // 五维能力雷达数据后端接口待开发（对话+挑战赛加权计算），暂无真实数据源
          setRadar({ accuracy: 0, structure: 0, creativity: 0, constraint: 0, iteration: 0 });
          setStats({
            totalConversations: lp.stats.totalConversations,
            averageRating: lp.stats.averageRating,
            streakDays: lp.stats.streakDays,
            masteredCount: lp.stats.masteredCount,
          });
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "加载失败");
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

  if (!profile) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 px-6">
        <p className="text-sm text-[#737373]">{error || "暂无个人数据"}</p>
      </div>
    );
  }

  const radarData = radarDimensions.map((dim) => ({
    dimension: dim.label,
    score: radar?.[dim.key] ?? 0,
  }));
  const suggestion = radar ? buildSuggestion(radar) : null;

  const daysRegistered = Math.max(
    1,
    Math.floor((Date.now() - new Date(profile.createdAt).getTime()) / 86_400_000)
  );
  const level =
    stats.masteredCount >= 20 ? "大师" : stats.masteredCount >= 12 ? "进阶" : stats.masteredCount >= 5 ? "入门" : "新手";

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-8 flex flex-col gap-6">
      <div>
        <h1 className="wb-title text-2xl md:text-3xl">AI 能力雷达</h1>
        <p className="wb-text text-sm mt-1.5">你的提示词能力成长可视化</p>
      </div>

      {/* 用户信息 */}
      <div className="wb-card flex items-center gap-4">
        <div className="w-14 h-14 shrink-0 rounded-2xl bg-blue-600 flex items-center justify-center shadow-[0_8px_24px_rgba(129,140,248,0.3)]">
          {profile.avatar ? (
            <img src={profile.avatar} alt={profile.username} className="w-full h-full rounded-2xl object-cover" />
          ) : (
            <User className="w-6 h-6 text-white" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-[#171717]">{profile.username}</p>
          <p className="text-xs text-[#A0A0A8] mt-0.5 truncate">{profile.email}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="flex items-center gap-1.5 text-xs text-[#737373]">
            <CalendarDays className="w-3.5 h-3.5 text-[#3A3A3A]" />
            {daysRegistered} 天
          </span>
          <span className="wb-badge wb-badge-blue">{level}</span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* 雷达图 */}
        <div className="flex-1 wb-card">
          <div className="flex items-center gap-2 mb-2">
            <RadarIcon className="w-4 h-4 text-[#3A3A3A]" />
            <h3 className="text-sm font-semibold text-[#171717]">五维能力</h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="72%">
                <PolarGrid stroke="rgba(255,255,255,0.15)" />
                <PolarAngleAxis
                  dataKey="dimension"
                  tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 12 }}
                />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Radar
                  dataKey="score"
                  stroke="#4B3FE3"
                  fill="#4B3FE3"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 学习统计 */}
        <div className="w-full lg:w-72 shrink-0 flex flex-col gap-3">
          <div className="wb-card flex-1">
            <h3 className="text-sm font-semibold text-[#171717] mb-3">学习统计</h3>
            <div className="flex flex-col gap-2">
              <StatItem icon={MessageSquare} label="总对话数" value={stats.totalConversations} color="#38BDF8" />
              <StatItem icon={Star} label="平均评分" value={stats.averageRating} decimals={1} suffix=" / 5" color="#4B3FE3" />
              <StatItem icon={Flame} label="连续打卡" value={stats.streakDays} suffix=" 天" color="#EC4899" />
              <StatItem icon={CheckCircle2} label="已掌握知识点" value={stats.masteredCount} suffix=" 个" color="#22D3EE" />
            </div>
          </div>
        </div>
      </div>

      {/* 个性化建议 */}
      {suggestion && (
        <div className="wb-card flex items-start gap-3 border-[#E5E6EA] bg-white">
          <div className="w-9 h-9 shrink-0 rounded-xl bg-[#F0F1F4] border border-[#D6D8DE] flex items-center justify-center">
            <Lightbulb className="w-4 h-4 text-[#3A3A3A]" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-[#171717]">
              个性化建议：<span className="text-[#3A3A3A]">{suggestion.dimension}</span>
            </p>
            <p className="text-sm text-[#737373] mt-1 leading-relaxed">{suggestion.text}</p>
          </div>
        </div>
      )}

      {/* 徽章墙 */}
      <div className="wb-card">
        <div className="flex items-center gap-2 mb-4">
          <Medal className="w-4 h-4 text-[#3A3A3A]" />
          <h3 className="text-sm font-semibold text-[#171717]">我的徽章</h3>
          <span className="ml-auto text-xs text-[#A0A0A8]">
            {badges.filter((b) => b.unlocked).length}/{badges.length} 已获得
          </span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {badges.map((badge) => (
            <div
              key={badge.id}
              title={`${badge.description}${badge.unlocked ? "" : `（条件：${badge.unlockCriteria.type} ≥ ${badge.unlockCriteria.target}）`}`}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all duration-150 ease-in-out ${
                badge.unlocked
                  ? "bg-[#F0F1F4] border-[#D6D8DE] hover:bg-[#F0F1F4]"
                  : "bg-white border-[#E5E6EA] opacity-45 grayscale"
              }`}
            >
              <Medal className={`w-5 h-5 ${badge.unlocked ? "text-[#3A3A3A]" : "text-[#A0A0A8]"}`} />
              <p className={`text-[10px] text-center leading-tight ${badge.unlocked ? "text-[#3A3A3A]" : "text-[#A0A0A8]"}`}>
                {badge.name}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
