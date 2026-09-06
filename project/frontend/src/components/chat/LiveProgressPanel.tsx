import { X, CheckCircle2, Circle, Sparkles, Trophy, TrendingUp } from "lucide-react";
import type { Conversation, Message } from "@/types";
import { evaluateLive, type ElementScore } from "@/lib/promptScoring";

interface Props {
  conversation: Conversation;
  messages: Message[];
  onHide: () => void;
}

function ElementRow({ el, active, done }: { el: ElementScore; active: boolean; done: boolean }) {
  const isFilled = el.coverage >= 1;
  const isPartial = !isFilled && el.coverage > 0;

  const dot =
    isFilled ? (
      <span className="w-5 h-5 shrink-0 rounded-full bg-emerald-500/10 flex items-center justify-center">
        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
      </span>
    ) : isPartial ? (
      <span className="w-5 h-5 shrink-0 rounded-full bg-amber-500/10 flex items-center justify-center">
        <Circle className="w-4 h-4 text-amber-500 fill-amber-500/30" />
      </span>
    ) : (
      <span className="w-5 h-5 shrink-0 rounded-full border border-dashed border-app-borderStrong flex items-center justify-center">
        <Circle className="w-3 h-3 text-app-t4" />
      </span>
    );

  const stateText = isFilled
    ? { text: "已具备", cls: "text-emerald-600" }
    : isPartial
    ? { text: "部分", cls: "text-amber-600" }
    : active && !done
    ? { text: "引导中", cls: "text-blue-600" }
    : { text: "待补全", cls: "text-app-t4" };

  return (
    <div
      className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 transition ${
        active && !isFilled && !done ? "bg-blue-50/70 ring-1 ring-blue-100" : ""
      }`}
    >
      {dot}
      <span className="text-[13px] text-app-t2 flex-1 min-w-0 truncate">{el.label}</span>
      {done && isFilled && (
        <span className="text-[11px] text-app-t4 tabular-nums">{Math.round(el.score)}/20</span>
      )}
      <span className={`text-[11px] shrink-0 ${stateText.cls}`}>{stateText.text}</span>
    </div>
  );
}

/** 对话右侧 · 实时学习评分面板（启发式） */
export function LiveProgressPanel({ conversation, messages, onHide }: Props) {
  const score = evaluateLive(conversation, messages);
  const done = conversation.status === "completed";

  return (
    <aside className="w-[300px] shrink-0 border-l border-app-border bg-app-surface/50 flex flex-col min-h-0 overflow-y-auto">
      {/* 头部 */}
      <div className="shrink-0 px-4 pt-4 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5" />
          </span>
          <div>
            <p className="text-[13px] font-medium text-app-fg leading-none">学习评分</p>
            <p className="text-[10px] text-app-t4 mt-1">苏格拉底 · 提示词五要素</p>
          </div>
        </div>
        <button
          onClick={onHide}
          title="收起评分面板"
          className="w-6 h-6 rounded-md flex items-center justify-center text-app-t4 hover:text-app-fg hover:bg-app-chrome transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-col gap-3 px-4 pb-5">
        {/* 大分卡 */}
        <div
          className="rounded-2xl px-4 py-5 text-white flex flex-col gap-1 relative overflow-hidden"
          style={{ background: "linear-gradient(135deg,#4B3FE3 0%,#6B5BFF 55%,#7A6FF0 100%)" }}
        >
          <div className="absolute -right-6 -top-8 w-28 h-28 rounded-full bg-white/10" />
          <div className="absolute -right-1 bottom-2 w-14 h-14 rounded-full bg-white/10" />
          <div className="flex items-center gap-1.5 text-[11px] text-white/80">
            {done ? <Trophy className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
            {done ? "本轮学习分" : "当前实时预估"}
          </div>
          <p className="font-display text-[44px] font-semibold leading-none tabular-nums mt-1">
            {score.final}
          </p>
          <div className="flex items-center gap-2 mt-1.5 text-[11px] text-white/85">
            <span>五要素补全 {score.filledCount}/5</span>
            {score.bonus > 0 && (
              <span className="rounded-full bg-white/20 px-2 py-0.5 tabular-nums">提前收尾 +{score.bonus}</span>
            )}
          </div>
        </div>

        {/* 完成提示 */}
        {done && (
          <p className="text-[11px] text-app-t4 leading-relaxed">
            {score.complete
              ? "五要素已齐全，得分计入本轮学习（后续同步学习地图与能力雷达）。"
              : "对话已结束，但部分要素仍未补全，得分受完整度影响。"}
          </p>
        )}

        {/* 五要素 */}
        <div className="flex flex-col gap-0.5">
          {score.elements.map((el) => (
            <ElementRow
              key={el.key}
              el={el}
              active={score.active === el.key}
              done={done}
            />
          ))}
        </div>

        {/* 下一步引导 */}
        {!done && score.next && (
          <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2.5 text-[12px] text-app-t2 leading-relaxed">
            <p className="text-blue-600 font-medium mb-0.5">接下来补「{score.next.label}」</p>
            {score.next.ask}
          </div>
        )}
        {!done && score.complete && (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-2.5 text-[12px] text-app-t2 leading-relaxed">
            五要素已齐全。若想拿更高分，可直接收尾（少用轮次有加成），或继续补充细节提升具体度。
          </div>
        )}
      </div>
    </aside>
  );
}
