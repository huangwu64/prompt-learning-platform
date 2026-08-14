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
 * 对话完成后的结果面板 — 中性灰体系
 */
export function ResultView({ conversation, rated, submitting, onRate }: Props) {
  const { improvedPrompt, comparisonResult } = conversation;
  const improvements = comparisonResult?.improvements ?? [];

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-4 px-6 pb-4">
      {/* 优化后的提示词 */}
      <div className="wb-card rounded-2xl">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-[#3A3A3A]" />
          <h3 className="text-sm font-semibold text-[#171717]">优化后的提示词</h3>
        </div>
        <div className="bg-white border border-[#E5E6EA] rounded-xl p-4 text-sm text-[#3A3A3A] leading-relaxed whitespace-pre-wrap">
          {improvedPrompt ?? "暂无优化结果"}
        </div>
      </div>

      {/* 改进点对比 */}
      <div className="wb-card rounded-2xl">
        <div className="flex items-center gap-2 mb-3">
          <ArrowRight className="w-4 h-4 text-[#3A3A3A]" />
          <h3 className="text-sm font-semibold text-[#171717]">AI 做了什么改进</h3>
        </div>
        {improvements.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {improvements.map((item, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-[#3A3A3A]">
                <CheckCircle2 className="w-4 h-4 text-[#737373] shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[#A0A0A8]">暂无改进分析</p>
        )}
      </div>

      {/* 评分 */}
      <div className="wb-card rounded-2xl flex flex-col items-center py-5">
        <h3 className="text-sm font-semibold text-[#171717] mb-3">评价本次学习体验</h3>
        {rated ? (
          <p className="text-sm text-[#3A3A3A]">已评分，感谢反馈！评分已同步到学习地图</p>
        ) : (
          <RatingStars onRate={onRate} disabled={submitting} submitting={submitting} />
        )}
      </div>
    </div>
  );
}
