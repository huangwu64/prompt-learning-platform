import { Sparkles, CheckCircle2, ArrowRight } from "lucide-react";
import type { Conversation } from "@/types";
import { RatingStars } from "./RatingStars";

interface Props {
  conversation: Conversation;
  rated: boolean;
  submitting?: boolean;
  onRate: (rating: number) => void;
}

/**
 * 对话完成后的结果面板。
 *
 * 注意两种「分」的区别 ——
 * - **系统综合评分**（score）：由算法按「五要素完整度 70% + 轮数效率 30%」算出，
 *   决定学习地图掌握度与能力雷达，是本页的主角。
 * - **用户星级**（rating）：用户主观的体验反馈，仅作产品改进参考，不影响学习进度。
 */
export function ResultView({ conversation, rated, submitting, onRate }: Props) {
  const { improvedPrompt, comparisonResult, score } = conversation;
  const improvements = comparisonResult?.improvements ?? [];

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-4 px-6 pb-4">
      {/* 系统综合评分 */}
      <div className="wb-card rounded-2xl flex items-center gap-5">
        <div className="shrink-0 flex flex-col items-center min-w-[76px]">
          <span className="font-display text-[40px] leading-none font-medium text-app-fg tabular-nums">
            {score ?? "—"}
          </span>
          <span className="text-[11px] text-app-t4 mt-1.5 whitespace-nowrap">综合评分 / 100</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-app-fg mb-1">本轮学习分</p>
          <p className="text-[12px] text-app-t3 leading-relaxed">
            系统按「五要素完整度 70% + 轮数效率 30%」综合计算，本次共追问{" "}
            <span className="tabular-nums">
              {Math.min(conversation.currentRound, conversation.maxRounds)}/{conversation.maxRounds}
            </span>{" "}
            轮。
          </p>
          <p className="text-[11px] text-app-t4 mt-1 leading-relaxed">
            该分数决定学习地图的知识点掌握度，并用于生成能力雷达。
          </p>
        </div>
      </div>

      {/* 优化后的提示词 */}
      <div className="wb-card rounded-2xl">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-semibold text-app-fg">优化后的提示词</h3>
        </div>
        <div className="bg-app-surface border border-app-border rounded-xl p-4 text-sm text-app-t2 leading-relaxed whitespace-pre-wrap">
          {improvedPrompt ?? "暂无优化结果"}
        </div>
      </div>

      {/* 改进点对比 */}
      <div className="wb-card rounded-2xl">
        <div className="flex items-center gap-2 mb-3">
          <ArrowRight className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-semibold text-app-fg">AI 做了什么改进</h3>
        </div>
        {improvements.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {improvements.map((item, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-app-t2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-app-t4">暂无改进分析</p>
        )}
      </div>

      {/* 体验反馈：与学习分无关 */}
      <div className="wb-card rounded-2xl flex flex-col items-center py-5">
        <h3 className="text-sm font-semibold text-app-fg mb-1">这次体验怎么样？</h3>
        <p className="text-[11px] text-app-t4 mb-3">仅作产品体验反馈，不影响你的学习分</p>
        {rated ? (
          <p className="text-sm text-app-t2">已收到，感谢反馈！</p>
        ) : (
          <RatingStars onRate={onRate} disabled={submitting} submitting={submitting} />
        )}
      </div>
    </div>
  );
}
