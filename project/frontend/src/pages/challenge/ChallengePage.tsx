import { useState } from "react";
import {
  Trophy,
  Star,
  Users,
  Clock,
  Loader2,
  Send,
  TrendingUp,
  Crown,
} from "lucide-react";
import { challengeService } from "@/services/challengeService";
import { useAuthStore } from "@/store/authStore";
import {
  mockChallenge,
  mockChallengeResult,
  mockLeaderboard,
} from "@/lib/mockData";

type RankTab = "daily" | "weekly" | "total";

const tabLabels: Record<RankTab, string> = {
  daily: "今日",
  weekly: "本周",
  total: "总榜",
};

const dimensionMeta = [
  { key: "effectiveness", label: "有效性", weight: "30%" },
  { key: "structure", label: "结构化", weight: "25%" },
  { key: "creativity", label: "创造性", weight: "25%" },
  { key: "constraint", label: "约束性", weight: "20%" },
] as const;

export default function ChallengePage() {
  const token = useAuthStore((s) => s.token);
  const isDemo = token === "demo-token";

  const [prompt, setPrompt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<typeof mockChallengeResult | null>(null);
  const [error, setError] = useState("");
  const [rankTab, setRankTab] = useState<RankTab>("daily");

  const handleSubmit = async () => {
    const trimmed = prompt.trim();
    if (trimmed.length < 10) {
      setError("提示词过短，请补充更多细节（至少 10 个字符）");
      return;
    }
    setError("");
    setSubmitting(true);

    const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

    try {
      if (isDemo) {
        await delay(1500);
        setResult(mockChallengeResult);
      } else {
        const data = await challengeService.submit(mockChallenge.id, trimmed);
        setResult({
          scores: data.scores,
          total: data.score,
          feedback: data.feedback,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI 评分失败，请重试");
    } finally {
      setSubmitting(false);
    }
  };

  const leaderboard = mockLeaderboard[rankTab];

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-8 flex flex-col gap-6">
      <div>
        <h1 className="wb-title text-2xl md:text-3xl">提示词挑战赛</h1>
        <p className="wb-text text-sm mt-1.5">
          每日一题，写出更好的提示词，赢取排行榜名次
        </p>
      </div>

      {/* 今日挑战卡片 */}
      <div className="wb-card">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-4 h-4 text-[#3A3A3A]" />
          <h3 className="text-sm font-semibold text-[#171717]">今日挑战</h3>
        </div>
        <p className="text-base text-[#3A3A3A] leading-relaxed">{mockChallenge.title}</p>
        <p className="text-sm text-[#737373] mt-2 leading-relaxed">{mockChallenge.description}</p>
        <div className="flex items-center gap-4 mt-4 text-xs text-[#737373] flex-wrap">
          <span className="flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 text-[#3A3A3A] fill-blue-500" />
            难度 {"★".repeat(mockChallenge.difficulty)}{"☆".repeat(5 - mockChallenge.difficulty)}
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            {mockChallenge.participantCount} 人参与
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            截止 {new Date(mockChallenge.endTime).toLocaleString("zh-CN")}
          </span>
        </div>
      </div>

      {/* 提示词输入区 */}
      <div className="wb-card">
        <h3 className="text-sm font-semibold text-[#171717] mb-3">写出你的提示词</h3>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={5}
          placeholder="根据今日任务编写提示词，包含角色、任务、格式等要素会获得更高分数…"
          className="wb-input"
        />
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-[#A0A0A8]">{prompt.length} / 2000</span>
          <button
            onClick={handleSubmit}
            disabled={submitting || prompt.trim().length < 10}
            className="wb-btn wb-btn-primary"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {submitting ? "AI 评分中…" : "提交评分"}
          </button>
        </div>
        {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
      </div>

      {/* 评分结果 */}
      {result && (
        <div className="wb-card">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-[#3A3A3A]" />
            <h3 className="text-sm font-semibold text-[#171717]">评分结果</h3>
            <span className="ml-auto text-2xl font-semibold text-[#3A3A3A]">{result.total}/100</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {dimensionMeta.map((dim) => {
              const score = result.scores[dim.key];
              return (
                <div key={dim.key} className="bg-white border-[#E5E6EA] rounded-xl p-3 text-center">
                  <p className="text-[11px] text-[#737373]">
                    {dim.label} <span className="text-[#A0A0A8]">({dim.weight})</span>
                  </p>
                  <p className="text-xl font-semibold text-[#171717] mt-1">{score}</p>
                  <div className="mt-1.5 h-1 rounded-full bg-[#F0F1F4] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-600 transition-all duration-150 ease-in-out"
                      style={{ width: `${score}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-white border-[#E5E6EA] rounded-xl p-4 text-sm text-[#3A3A3A] leading-relaxed">
            <p className="text-[11px] text-[#3A3A3A] mb-1.5">AI 反馈</p>
            {result.feedback}
          </div>
        </div>
      )}

      {/* 排行榜 */}
      <div className="wb-card">
        <div className="flex items-center gap-2 mb-4">
          <Crown className="w-4 h-4 text-[#3A3A3A]" />
          <h3 className="text-sm font-semibold text-[#171717]">排行榜</h3>
          <span className="ml-auto text-[10px] text-[#A0A0A8]">数据可能有 5 分钟延迟</span>
        </div>

        {/* Tab 切换 */}
        <div className="flex gap-1 mb-4 p-1 rounded-2xl bg-white border-[#E5E6EA] w-fit">
          {(Object.keys(tabLabels) as RankTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setRankTab(tab)}
              className={`px-4 py-1.5 rounded-xl text-xs transition-all duration-150 ease-in-out ${
                rankTab === tab
                  ? "bg-blue-600 text-white border-blue-600"
                  : "text-[#737373] hover:text-[#3A3A3A] border border-transparent"
              }`}
            >
              {tabLabels[tab]}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-1.5">
          {leaderboard.map((entry) => (
            <div
              key={entry.rank}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm ${
                entry.username === "体验用户"
                  ? "bg-[#F0F1F4] border border-[#D6D8DE]"
                  : "bg-white border-[#E5E6EA]"
              }`}
            >
              <span
                className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-xs font-semibold ${
                  entry.rank === 1
                    ? "bg-blue-600 text-white"
                    : entry.rank <= 3
                      ? "bg-[#F0F1F4] text-[#3A3A3A]"
                      : "text-[#737373]"
                }`}
              >
                {entry.rank}
              </span>
              <span className="flex-1 text-[#3A3A3A] truncate">{entry.username}</span>
              <span className="font-semibold text-[#3A3A3A]">{entry.score}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
