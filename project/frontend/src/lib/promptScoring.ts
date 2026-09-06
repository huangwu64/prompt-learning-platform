import type { Conversation, Message } from "@/types";

/**
 * 苏格拉底对话 · 学习评分（启发式实时预估）
 *
 * 口径：提示词五要素 角色设定 / 任务描述 / 上下文 / 输出格式 / 约束条件，
 * 每要素满分 20 分；再按"所用补充轮次"折算效率分（补全前提下提前完成加分）。
 * 完成对话后即为本轮"学习分"，后续同步学习地图与能力雷达。
 */

export type ElementKey = "role" | "task" | "context" | "format" | "constraint";

export interface ElementMeta {
  key: ElementKey;
  label: string;
  /** 缺失时的引导语 */
  ask: string;
  strong: string[];
  weak: string[];
}

export const PROMPT_ELEMENTS: ElementMeta[] = [
  {
    key: "role",
    label: "角色设定",
    ask: "让 AI 扮演什么角色 / 以什么身份来完成？",
    strong: ["扮演", "你是一位", "你是一个", "你作为", "作为", "以……的身份", "以一名", "角色", "身份", "专家", "教练", "agent", "as a"],
    weak: ["人设", "口吻", "请以", "定位"],
  },
  {
    key: "task",
    label: "任务描述",
    ask: "希望 AI 具体做什么？达成什么结果？",
    strong: ["帮我", "请帮我", "完成", "生成", "撰写", "制作", "总结", "翻译", "分析", "设计", "提炼", "改写", "规划", "评估", "目标", "任务"],
    weak: ["想要", "想得到", "希望"],
  },
  {
    key: "context",
    label: "上下文",
    ask: "有什么背景 / 场景 / 资料需要补充？",
    strong: ["背景", "上下文", "现状", "场景", "资料", "数据", "人群", "对象", "面向", "在……", "参考", "前情"],
    weak: ["相关", "语境", "行业"],
  },
  {
    key: "format",
    label: "输出格式",
    ask: "期望以什么形式输出？分点 / 表格 / 字数 / 模板？",
    strong: ["格式", "表格", "分点", "逐条", "编号", "列表", "字数", "字以内", "不超过", "结构", "标题", "段落", "模板", "json", "markdown", "排版", "层级"],
    weak: ["形式", "样子"],
  },
  {
    key: "constraint",
    label: "约束条件",
    ask: "有什么必须避免 / 必须遵守的要求？",
    strong: ["避免", "不要", "禁止", "不能", "不可", "必须", "限制", "严禁", "不允许", "防止", "严谨", "简洁", "正式", "避免使用"],
    weak: ["注意", "切记", "请勿"],
  },
];

export const ELEMENT_LABEL: Record<ElementKey, string> = PROMPT_ELEMENTS.reduce(
  (acc, el) => {
    acc[el.key] = el.label;
    return acc;
  },
  {} as Record<ElementKey, string>
);

export interface ElementScore {
  key: ElementKey;
  label: string;
  /** 0 缺失 / 0.5 部分具备 / 1 已补全 */
  coverage: number;
  /** 0-1 具体度（来自相应回答的充实程度） */
  detail: number;
  /** 0-20 */
  score: number;
}

export interface LiveScore {
  elements: ElementScore[];
  /** 五要素补全数 0-5 */
  filledCount: number;
  /** 补全度 %（覆盖度换算） */
  completeness: number;
  /** 实时预估分 0-100（补全*结构 + 具体度） */
  overall: number;
  /** 效率加分（仅补全前提下提前完成才 +） */
  bonus: number;
  /** 最终学习分 = overall + bonus（进行中 = 预估） */
  final: number;
  /** 全部补全？ */
  complete: boolean;
  /** 下一个建议补全的要素 */
  next: ElementMeta | null;
  /** 当前 AI 正在引导的要素 */
  active: ElementKey | null;
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** 文本命中某要素：强命中 → 1，弱命中 → 0.5 */
function coverageIn(text: string, el: ElementMeta): number {
  const t = text.toLowerCase();
  const hit = (list: string[]) => list.some((w) => t.includes(w.toLowerCase()));
  if (hit(el.strong)) return 1;
  if (hit(el.weak)) return 0.5;
  return 0;
}

/** 一段回答的"具体度"：长度 + 是否分点/含数字 */
function detailOf(text: string): number {
  const len = text.trim().length;
  const base = clamp01(len / 40);
  const structured = /[，。；、\n]/.test(text) || /\d/.test(text) ? 0.12 : 0;
  return clamp01(base * 0.88 + structured);
}

/** 从一段提问/回答文本里挑出最相关的要素（命中强词数量最多） */
function bestMatch(text: string, ignore?: ElementKey[]): ElementKey | null {
  const t = text.toLowerCase();
  let best: ElementKey | null = null;
  let bestN = 0;
  for (const el of PROMPT_ELEMENTS) {
    if (ignore?.includes(el.key)) continue;
    const n = el.strong.filter((w) => t.includes(w.toLowerCase())).length;
    if (n > bestN) {
      bestN = n;
      best = el.key;
    }
  }
  return bestN > 0 ? best : null;
}

/**
 * 对"原始提示词 + 逐条消息"评估。
 * 原理：
 * - 原始提示词本身已具备的要素作为基线；
 * - AI 每个追问会点名下一要素（pending），用户作答即补全该要素；
 * - 作答文本里若顺带命中其他要素强词，也一并补全。
 */
export function evaluateLive(
  conversation: Pick<Conversation, "originalPrompt" | "status" | "currentRound" | "maxRounds">,
  messages: Message[]
): LiveScore {
  const coverage: Record<ElementKey, number> = { role: 0, task: 0, context: 0, format: 0, constraint: 0 };
  const detail: Record<ElementKey, number> = { role: 0, task: 0, context: 0, format: 0, constraint: 0 };

  // 基线：原始提示词里已写明的要素
  for (const el of PROMPT_ELEMENTS) {
    const c = coverageIn(conversation.originalPrompt, el);
    if (c > 0) coverage[el.key] = c;
  }

  let pending: ElementKey | null = null; // 最近一次 AI 追问点名要补的要素
  let active: ElementKey | null = null;

  for (const msg of messages) {
    if (msg.role === "assistant") {
      // 追问消息 → 记下引导目标；summary/最终结果消息忽略
      if (msg.messageType === "question") {
        pending = bestMatch(msg.content);
        if (pending) active = pending;
      }
      continue;
    }

    // 用户消息
    const c = msg.content;
    // 顺带命中
    for (const el of PROMPT_ELEMENTS) {
      const hit = coverageIn(c, el);
      if (hit > coverage[el.key]) coverage[el.key] = hit;
    }
    // 归属：优先算作回答了最近的追问（若该要素其实已由顺带命中覆盖，则按命中最强者归属）
    const target: ElementKey | null = pending ? (coverage[pending] > 0 ? bestMatch(c) ?? pending : pending) : bestMatch(c);
    if (target) {
      coverage[target] = Math.max(coverage[target], 1);
      detail[target] = Math.max(detail[target], detailOf(c));
    }
    pending = null; // 本轮已作答
  }

  const elements: ElementScore[] = PROMPT_ELEMENTS.map((el) => {
    const cov = coverage[el.key];
    const det = cov > 0 ? detail[el.key] : 0;
    return {
      key: el.key,
      label: el.label,
      coverage: cov,
      detail: det,
      score: Math.round(cov * (10 + 10 * det) * 10) / 10,
    };
  });

  const filledCount = elements.filter((e) => e.coverage > 0).length;
  const complete = elements.every((e) => e.coverage > 0);
  const overall = elements.reduce((s, e) => s + e.score, 0);

  // 效率分：全部补全的前提下，用更少轮次完成 → 加分
  const done = conversation.status === "completed";
  const maxRounds = conversation.maxRounds;
  const used = Math.max(1, Math.min(conversation.currentRound, maxRounds));
  const roundsSaved = maxRounds - used;
  const bonus = done && complete && roundsSaved > 0 ? roundsSaved * 2 : 0;
  const final = Math.min(100, Math.round(overall + bonus));

  const next = complete ? null : PROMPT_ELEMENTS.find((el) => coverage[el.key] === 0) ?? null;

  return {
    elements,
    filledCount,
    completeness: Math.round((filledCount / PROMPT_ELEMENTS.length) * 100),
    overall: Math.round(overall),
    bonus,
    final: Math.round(final),
    complete,
    next,
    active,
  };
}
