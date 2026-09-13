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
  BarChart3,
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
import { SectionTitle } from "@/components/ui/SectionTitle";
import { learningService } from "@/services/learningService";
import { badgeService } from "@/services/badgeService";
import { useAuthStore } from "@/store/authStore";
import { AccountSettings } from "./components/AccountSettings";
import {
  mockProfile,
  mockSkillRadar,
  mockProfileStats,
  mockBadges,
} from "@/lib/mockData";
import type { Badge, Profile, RadarDimension } from "@/types";

/**
 * 五要素的改进建议。
 *
 * 维度来自后端返回的 radar 数据（key/label 由 PromptScorer 定义），
 * 这里不再另立一套维度名，避免与评分口径分叉。
 */
const ELEMENT_SUGGESTION: Record<string, string> = {
  role: "「角色设定」偏弱：试试在开头写明「你是一位……」，让 AI 先站对位置。",
  task: "「任务描述」偏弱：把「要做什么、达成什么结果」说清楚，输出会准很多。",
  context: "「上下文」偏弱：补上背景、场景、面向谁，回答会贴合得多。",
  format: "「输出格式」偏弱：指明分点 / 表格 / 字数等要求，结果更好用。",
  constraint: "「约束条件」偏弱：加上「不要……」「必须……」这类限制，能挡掉不想要的输出。",
};

function buildSuggestion(radar: RadarDimension[]): { dimension: string; text: string } | null {
  if (radar.length === 0) {
    return null;
  }
  const lowest = radar.reduce((min, dim) => (dim.score < min.score ? dim : min));
  return {
    dimension: lowest.label,
    text: ELEMENT_SUGGESTION[lowest.key] ?? "继续多练习，各要素都会稳步提升。",
  };
}

function StatItem({ icon: Icon, label, value, decimals = 0, suffix = "", color }: { icon: typeof Star; label: string; value: number; decimals?: number; suffix?: string; color: string }) {
  return (
    <div className="flex items-center gap-3 bg-app-surface border-app-border rounded-2xl px-4 py-3 transition duration-150 ease-in-out hover:border-blue-200 hover:-translate-y-px">
      <Icon className="w-4 h-4 shrink-0" style={{ color }} />
      <div className="min-w-0">
        <p className="text-[11px] text-app-t4">{label}</p>
        <p className="text-sm font-semibold text-app-fg tabular-nums">
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
  const [radar, setRadar] = useState<RadarDimension[]>([]);
  const [stats, setStats] = useState({
    totalConversations: 0,
    averageScore: 0,
    streakDays: 0,
    masteredCount: 0,
  });
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  /** 递增即触发整页重新拉取（账号设置里改完资料后调用） */
  const [refreshKey, setRefreshKey] = useState(0);

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
          // 头像审核通过后，authStore 里存的那份会过期（登录时快照的），
          // 同步一次让侧栏 / 顶栏的头像跟着更新，不必等重新登录
          const current = useAuthStore.getState().user;
          if (current && current.avatar !== p.avatar) {
            useAuthStore.setState({ user: { ...current, avatar: p.avatar } });
          }
          setBadges(b.badges);
          // 能力雷达与学习地图同源：都来自对话完成时算出的五要素分数
          setRadar(lp.radar ?? []);
          setStats({
            totalConversations: lp.stats.totalConversations,
            averageScore: lp.stats.averageScore ?? 0,
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
  }, [isDemo, refreshKey]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-app-t2 animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 px-6">
        <p className="text-sm text-app-t3">{error || "暂无个人数据"}</p>
      </div>
    );
  }

  // 维度直接用后端给的 key/label，不再本地维护一份
  const radarData = radar.map((dim) => ({
    dimension: dim.label,
    score: dim.score,
  }));
  const suggestion = buildSuggestion(radar);

  const daysRegistered = Math.max(
    1,
    Math.floor((Date.now() - new Date(profile.createdAt).getTime()) / 86_400_000)
  );
  const level =
    stats.masteredCount >= 20 ? "大师" : stats.masteredCount >= 12 ? "进阶" : stats.masteredCount >= 5 ? "入门" : "新手";

  return (
    <div className="wb-page">
      <div className="wb-page-head wb-reveal">
        <h1 className="font-display text-2xl md:text-3xl font-medium tracking-tight text-app-fg">能力雷达</h1>
        <p className="wb-text text-sm">你的提示词能力成长可视化</p>
      </div>

      {/* 用户信息 */}
      <div className="wb-card flex items-center gap-4 wb-reveal">
        <div className="w-14 h-14 shrink-0 rounded-2xl bg-blue-500 flex items-center justify-center shadow-[0_8px_24px_rgba(65,118,230,0.28)]">
          {profile.avatar ? (
            <img src={profile.avatar} alt={profile.username} className="w-full h-full rounded-2xl object-cover" />
          ) : (
            <User className="w-6 h-6 text-white" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-app-fg">{profile.username}</p>
          <p className="text-xs text-app-t4 mt-0.5 truncate">{profile.email}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="flex items-center gap-1.5 text-xs text-app-t3">
            <CalendarDays className="w-3.5 h-3.5 text-app-t2" />
            {daysRegistered} 天
          </span>
          <span className="wb-badge wb-badge-blue">{level}</span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 wb-reveal">
        {/* 雷达图 */}
        <div className="flex-1 wb-card">
          <SectionTitle icon={RadarIcon} className="mb-2">五维能力</SectionTitle>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="72%">
                <PolarGrid stroke="rgba(65,118,230,0.15)" />
                <PolarAngleAxis
                  dataKey="dimension"
                  tick={{ fill: "rgba(23,23,23,0.6)", fontSize: 12 }}
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
            <SectionTitle icon={BarChart3} className="mb-3">学习统计</SectionTitle>
            <div className="flex flex-col gap-2">
              <StatItem icon={MessageSquare} label="总对话数" value={stats.totalConversations} color="#9FA3D6" />
              <StatItem icon={Star} label="平均学习分" value={stats.averageScore} decimals={1} suffix=" / 100" color="#4B3FE3" />
              <StatItem icon={Flame} label="连续打卡" value={stats.streakDays} suffix=" 天" color="#7A6FF0" />
              <StatItem icon={CheckCircle2} label="已掌握知识点" value={stats.masteredCount} suffix=" 个" color="#00B983" />
            </div>
          </div>
        </div>
      </div>

      {/* 个性化建议 */}
      {suggestion && (
        <div className="wb-card flex items-start gap-3 border-app-border bg-app-surface wb-reveal">
          <span
            className="w-9 h-9 shrink-0 rounded-xl flex items-center justify-center text-white shadow-[0_4px_12px_-2px_rgba(94,106,210,0.5)]"
            style={{ background: "linear-gradient(135deg, #4B3FE3, #6B5BFF 60%, #7A6FF0)" }}
          >
            <Lightbulb className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-app-fg">
              个性化建议：<span className="text-app-t2">{suggestion.dimension}</span>
            </p>
            <p className="text-sm text-app-t3 mt-1 leading-relaxed">{suggestion.text}</p>
          </div>
        </div>
      )}

      {/* 徽章墙 */}
      <div className="wb-card wb-reveal">
        <SectionTitle
          icon={Medal}
          className="mb-4"
          right={
            <span className="text-xs text-app-t4 tabular-nums">
              {badges.filter((b) => b.unlocked).length}/{badges.length} 已获得
            </span>
          }
        >
          我的徽章
        </SectionTitle>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {badges.map((badge) => (
            <div
              key={badge.id}
              title={`${badge.description}${badge.unlocked ? "" : `（条件：${badge.unlockCriteria.type} ≥ ${badge.unlockCriteria.target}）`}`}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all duration-200 ease-out ${
                badge.unlocked
                  ? "bg-app-chrome border-app-borderStrong hover:-translate-y-0.5 hover:shadow-[0_6px_16px_-4px_rgba(65,118,230,0.18)]"
                  : "bg-app-surface border-app-border opacity-45 grayscale"
              }`}
            >
              <Medal className={`w-5 h-5 ${badge.unlocked ? "text-app-t2" : "text-app-t4"}`} />
              <p className={`text-[10px] text-center leading-tight ${badge.unlocked ? "text-app-t2" : "text-app-t4"}`}>
                {badge.name}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 账号设置：头像审核 / 用户名 / 密码 */}
      <AccountSettings profile={profile} onRefresh={() => setRefreshKey((k) => k + 1)} />
    </div>
  );
}
