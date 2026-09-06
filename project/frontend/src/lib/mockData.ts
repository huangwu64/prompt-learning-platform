import type {
  LearningProgress,
  Badge,
  Work,
  WorkType,
} from "@/types";

/**
 * 游客模式演示数据
 *
 * 说明：后端接口未开发完成时，游客体验（demo-token）使用本地演示数据渲染完整 UI。
 * 真实登录用户走真实接口，不使用这些数据。
 */

// ===== 学习地图 =====
export const mockLearningProgress: LearningProgress = {
  stats: {
    averageRating: 4.2,
    streakDays: 7,
    masteredCount: 12,
    totalConversations: 45,
  },
  currentStage: "intermediate",
  stages: [
    {
      id: "beginner",
      name: "入门",
      status: "completed",
      knowledgePoints: [
        { id: "topic_role", name: "角色设定", status: "mastered", bestRating: 5 },
        { id: "topic_task", name: "任务描述", status: "mastered", bestRating: 4 },
        { id: "topic_context", name: "上下文", status: "mastered", bestRating: 4 },
        { id: "topic_format", name: "输出格式", status: "mastered", bestRating: 3 },
        { id: "topic_constraint", name: "约束条件", status: "mastered", bestRating: 4 },
      ],
    },
    {
      id: "intermediate",
      name: "进阶",
      status: "in_progress",
      knowledgePoints: [
        { id: "topic_cot", name: "思维链", status: "learning", bestRating: 3 },
        { id: "topic_multi_turn", name: "多轮对话", status: "locked", bestRating: null },
        { id: "topic_reflection", name: "自我反思", status: "locked", bestRating: null },
      ],
    },
    {
      id: "advanced",
      name: "精通",
      status: "locked",
      knowledgePoints: [
        { id: "topic_code", name: "代码提示词", status: "locked", bestRating: null },
        { id: "topic_writing", name: "写作提示词", status: "locked", bestRating: null },
        { id: "topic_analysis", name: "分析提示词", status: "locked", bestRating: null },
      ],
    },
    {
      id: "master",
      name: "大师",
      status: "locked",
      knowledgePoints: [
        { id: "topic_workflow", name: "工作流构建", status: "locked", bestRating: null },
        { id: "topic_optimize", name: "模型性能调优", status: "locked", bestRating: null },
      ],
    },
  ],
};

// ===== 徽章 =====
export const mockBadges: Badge[] = [
  {
    id: "badge_001",
    name: "连续打卡7天",
    description: "连续 7 天完成至少一次对话练习",
    unlockCriteria: { type: "streak", target: 7 },
    unlocked: true,
    unlockedAt: "2026-08-07T10:00:00.000Z",
  },
  {
    id: "badge_002",
    name: "首次对话",
    description: "完成第一次苏格拉底对话练习",
    unlockCriteria: { type: "conversation_count", target: 1 },
    unlocked: true,
    unlockedAt: "2026-07-20T09:30:00.000Z",
  },
  {
    id: "badge_003",
    name: "入门完成",
    description: "完成入门阶段全部知识点练习",
    unlockCriteria: { type: "stage", target: 1 },
    unlocked: true,
    unlockedAt: "2026-08-01T14:00:00.000Z",
  },
  {
    id: "badge_004",
    name: "对话小达人",
    description: "累计完成 10 次苏格拉底对话练习",
    unlockCriteria: { type: "conversation_count", target: 10 },
    unlocked: false,
    unlockedAt: null,
  },
  {
    id: "badge_005",
    name: "挑战赛 90 分",
    description: "单次挑战赛评分达到 90 分",
    unlockCriteria: { type: "challenge_score", target: 90 },
    unlocked: false,
    unlockedAt: null,
  },
  {
    id: "badge_006",
    name: "作品大师",
    description: "累计创作 20 个作品",
    unlockCriteria: { type: "work_count", target: 20 },
    unlocked: false,
    unlockedAt: null,
  },
];

// ===== 作品工厂 =====
export const mockWorks: Work[] = [
  {
    id: "work_demo_1",
    workType: "email",
    title: "季度汇报邮件",
    content:
      "尊敬的张总：\n\n关于本季度项目进展，现汇报如下：\n\n一、项目概况\n\n本项目于本季度进入核心开发阶段，整体进度符合预期。\n\n二、关键成果\n1. 完成核心模块开发，通过内部测试\n2. 上线 3 个新功能，用户反馈良好\n\n三、下季度计划\n1. 推进性能优化\n2. 扩展新市场\n\n此致\n敬礼\n\n王小明",
    formData: { recipient: "直属上级张总", purpose: "汇报本季度项目进展", tone: "正式", attachment: "项目数据表.xlsx" },
    shareUrl: null,
    createdAt: "2026-08-11T10:00:00.000Z",
    updatedAt: "2026-08-11T10:05:00.000Z",
  },
  {
    id: "work_demo_2",
    workType: "ppt",
    title: "AI 科普分享 PPT 大纲",
    content:
      "# AI 科普分享\n\n## 一、什么是 AI\n- 人工智能的定义\n- 生活中的 AI 应用\n\n## 二、大语言模型\n- 原理简介\n- 常见模型对比\n\n## 三、如何用好 AI\n- 提示词基础\n- 实战演示\n\n## 四、未来展望",
    formData: { topic: "AI 科普", audience: "职场新人", duration: "20 分钟", keyPoints: ["什么是AI", "大语言模型", "用好AI"] },
    shareUrl: null,
    createdAt: "2026-08-10T09:00:00.000Z",
  },
  {
    id: "work_demo_3",
    workType: "social",
    title: "新品发布小红书文案",
    content:
      "姐妹们！这款护手霜真的绝了！💅\n\n✨ 质地轻薄不粘腻\n✨ 香味高级持久\n✨ 性价比超高\n\n秋冬必备，手部护理安排上！\n#护手霜 #秋冬护理 #好物推荐",
    formData: { platform: "小红书", product: "新品护手霜", style: "种草风", goal: "提升产品认知" },
    shareUrl: "http://localhost:8080/api/share/a3Kp9q",
    createdAt: "2026-08-08T15:30:00.000Z",
  },
];

// ===== 挑战赛 =====
export const mockChallenge = {
  id: "challenge_demo_1",
  title: "让 AI 扮演一位严苛的代码审查员",
  description:
    "编写一个提示词，让 AI 扮演资深代码审查员，能够指出代码中的安全隐患、性能问题并给出优化建议。",
  difficulty: 3,
  participantCount: 156,
  endTime: "2026-08-12T23:59:00.000Z",
};

export const mockChallengeResult = {
  scores: { effectiveness: 85, structure: 72, creativity: 90, constraint: 65 },
  total: 78,
  feedback:
    "角色设定清晰，创造性突出。但缺少输出格式要求（如：分条列出问题并标注严重等级），建议补充格式约束和字数限制，提升结构化得分。",
};

export const mockLeaderboard = {
  daily: [
    { rank: 1, username: "PromptMaster", score: 95 },
    { rank: 2, username: "AI先锋", score: 92 },
    { rank: 3, username: "体验用户", score: 78 },
    { rank: 4, username: "老王学AI", score: 74 },
    { rank: 5, username: "提示词学徒", score: 68 },
  ],
  weekly: [
    { rank: 1, username: "AI先锋", score: 88 },
    { rank: 2, username: "PromptMaster", score: 86 },
    { rank: 3, username: "体验用户", score: 72 },
    { rank: 4, username: "小白进阶中", score: 70 },
    { rank: 5, username: "提示词学徒", score: 65 },
  ],
  total: [
    { rank: 1, username: "PromptMaster", score: 450 },
    { rank: 2, username: "AI先锋", score: 432 },
    { rank: 3, username: "老王学AI", score: 380 },
    { rank: 4, username: "体验用户", score: 321 },
    { rank: 5, username: "小白进阶中", score: 298 },
  ],
};

// ===== 能力雷达 =====
export const mockSkillRadar = {
  accuracy: 85,
  structure: 78,
  creativity: 80,
  constraint: 68,
  iteration: 72,
};

export const mockProfileStats = {
  totalConversations: 45,
  averageRating: 4.2,
  streakDays: 7,
  masteredCount: 12,
};

export const mockProfile = {
  id: "user_demo",
  username: "体验用户",
  email: "demo@example.com",
  avatar: null,
  streakDays: 7,
  createdAt: "2026-07-01T08:00:00.000Z",
};

// ===== 作品类型配置（模板表单） =====
export interface WorkTemplateConfig {
  type: WorkType;
  label: string;
  emoji: string;
  desc: string;
  fields: { key: string; label: string; type: "text" | "select" | "textarea"; placeholder?: string; options?: string[] }[];
  titlePlaceholder: string;
}

export const workTemplates: WorkTemplateConfig[] = [
  {
    type: "ppt",
    label: "PPT 大纲",
    emoji: "📄",
    desc: "结构化章节—页面—要点",
    fields: [
      { key: "topic", label: "主题", type: "text", placeholder: "例如：AI 科普分享" },
      { key: "audience", label: "受众", type: "text", placeholder: "例如：职场新人" },
      { key: "duration", label: "时长", type: "text", placeholder: "例如：20 分钟" },
      { key: "keyPoints", label: "核心要点", type: "textarea", placeholder: "每行一个要点" },
    ],
    titlePlaceholder: "PPT 大纲标题",
  },
  {
    type: "report",
    label: "报告 / 文案",
    emoji: "📝",
    desc: "围绕要点展开论述",
    fields: [
      { key: "title", label: "标题", type: "text", placeholder: "报告标题" },
      { key: "keyPoints", label: "要点列表", type: "textarea", placeholder: "每行一个要点" },
      { key: "style", label: "风格", type: "select", options: ["正式", "专业", "通俗", "学术"], placeholder: "选择风格" },
      { key: "wordCount", label: "字数", type: "text", placeholder: "例如：1000 字" },
    ],
    titlePlaceholder: "报告标题",
  },
  {
    type: "email",
    label: "商务邮件",
    emoji: "📧",
    desc: "根据收件人调整称呼措辞",
    fields: [
      { key: "recipient", label: "收件人", type: "text", placeholder: "例如：直属上级张总" },
      { key: "purpose", label: "邮件目的", type: "text", placeholder: "例如：汇报项目进展" },
      { key: "tone", label: "语气风格", type: "select", options: ["正式", "礼貌", "亲切", "严肃"], placeholder: "选择语气" },
      { key: "attachment", label: "附件说明", type: "text", placeholder: "例如：项目数据表.xlsx" },
    ],
    titlePlaceholder: "邮件标题",
  },
  {
    type: "social",
    label: "社交媒体",
    emoji: "🌐",
    desc: "匹配平台调性",
    fields: [
      { key: "platform", label: "平台", type: "select", options: ["小红书", "抖音", "微博", "公众号"], placeholder: "选择平台" },
      { key: "product", label: "产品", type: "text", placeholder: "例如：新品护手霜" },
      { key: "style", label: "风格", type: "select", options: ["种草风", "专业风", "活泼风", "故事风"], placeholder: "选择风格" },
      { key: "goal", label: "目标", type: "text", placeholder: "例如：提升产品认知" },
    ],
    titlePlaceholder: "文案标题",
  },
];
