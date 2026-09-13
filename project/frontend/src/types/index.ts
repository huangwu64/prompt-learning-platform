// ========================================
// 统一响应格式 & 通用类型
// ========================================

/** 统一响应包装 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  error: string | null;
}

/** 分页请求参数 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

/** 分页响应结构 */
export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ========================================
// 认证模块
// ========================================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  username: string;
}

/** 角色：决定能否进入管理后台（后端路由级 hasRole("ADMIN") 兜底） */
export type UserRole = "USER" | "ADMIN";

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  /** 已审核通过的头像 URL；为空时前端回落默认占位 */
  avatar: string | null;
  streakDays: number;
  createdAt: string;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
}

// ========================================
// 苏格拉底对话模块
// ========================================

export interface CreateChatRequest {
  originalPrompt: string;
  topicId?: string;
}

export interface SendMessageRequest {
  content: string;
}

/** chat 由全局 AI 助手使用（苏格拉底只用 question/answer/summary） */
export type MessageType = "question" | "answer" | "summary" | "chat";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  messageType: MessageType;
  createdAt: string;
}

export type ConversationStatus = "active" | "completed";

export interface ComparisonResult {
  improvements: string[];
}

export interface Conversation {
  id: string;
  userId: string;
  originalPrompt: string;
  improvedPrompt: string | null;
  comparisonResult: ComparisonResult | null;
  /** 用户满意度星级 1-5（仅体验反馈，不影响学习进度） */
  rating: number | null;
  /** 系统综合评分 0-100（完整度 70% + 轮数 30%），完成对话时算出 */
  score: number | null;
  status: ConversationStatus;
  currentRound: number;
  maxRounds: number;
  createdAt: string;
  updatedAt?: string;
}

/** 对话历史列表项（精简） */
export interface ConversationHistoryItem {
  id: string;
  originalPrompt: string;
  improvedPrompt: string | null;
  rating: number | null;
  status: ConversationStatus;
  currentRound: number;
  createdAt: string;
  updatedAt: string;
}

/** 创建对话响应 */
export interface CreateChatResponse {
  conversation: Conversation;
  message: Message;
}

/** 对话详情响应 */
export interface ChatDetailResponse {
  conversation: Conversation;
  messages: Message[];
}

/** 发送消息响应 */
export interface SendMessageResponse {
  /**
   * 本轮 AI 的追问。
   *
   * ⚠️ **触发「完成」的那一轮为 null** —— 后端此时不返回消息，结果放在
   * improvedPrompt / comparisonResult 里。消费方必须先判空，
   * 否则会把 null 塞进消息列表，渲染时 `msg.id` 抛错导致整页白屏。
   */
  message: Message | null;
  conversationStatus: ConversationStatus;
  currentRound: number;
  maxRounds: number;
  improvedPrompt?: string;
  comparisonResult?: ComparisonResult;
}

/** 完成对话响应 */
export interface CompleteChatResponse {
  conversation: Conversation;
}

/** 评分响应（用户满意度星级，仅作体验反馈） */
export interface RateChatResponse {
  conversationId: string;
  rating: number;
  /** 近期对话的**系统综合评分**均值 0-100（注意不是星级均值） */
  averageScore: number | null;
  masteredTopics: number;
}

// ========================================
// 学习路径模块
// ========================================

export type KnowledgePointStatus = "locked" | "learning" | "mastered";
export type StageStatus = "locked" | "in_progress" | "completed";
export type StageId = "beginner" | "intermediate" | "advanced" | "master";

export interface LearningStats {
  /** 近期对话的**系统综合评分**均值 0-100，无数据时为 null */
  averageScore: number | null;
  streakDays: number;
  masteredCount: number;
  totalConversations: number;
}

export interface KnowledgePoint {
  id: string;
  name: string;
  status: KnowledgePointStatus;
  /** 历史最好成绩，0-100（系统综合评分口径） */
  bestScore: number | null;
}

/** 能力雷达的一个维度（提示词五要素之一），score 为 0-100 */
export interface RadarDimension {
  key: "role" | "task" | "context" | "format" | "constraint" | string;
  label: string;
  score: number;
}

export interface Stage {
  id: StageId;
  name: string;
  status: StageStatus;
  knowledgePoints: KnowledgePoint[];
}

export interface LearningProgress {
  stats: LearningStats;
  currentStage: StageId;
  stages: Stage[];
  /** 能力雷达：提示词五要素的近期均值。与学习地图同源（都来自对话完成时的五要素评分） */
  radar: RadarDimension[];
}

export interface UpdateProgressRequest {
  topicId: string;
  rating: number;
  conversationId?: string;
}

export interface UpdateProgressResponse {
  topicId: string;
  status: KnowledgePointStatus;
  bestRating: number;
  stageUnlocked: boolean;
}

// ========================================
// 作品工厂模块
// ========================================

export type WorkType = "ppt" | "report" | "email" | "social";

export interface Work {
  id: string;
  userId?: string;
  workType: WorkType;
  title: string;
  content: string;
  formData?: Record<string, unknown>;
  shareUrl: string | null;
  shareCode?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateWorkRequest {
  workType: WorkType;
  title: string;
  formData: Record<string, unknown>;
}

export interface ShareWorkResponse {
  id: string;
  shareCode: string;
  shareUrl: string;
}

export interface UnshareWorkResponse {
  id: string;
  shareCode: null;
  shareUrl: null;
}

/** 公开分享的作品（免登录） */
export interface SharedWork {
  work: {
    id: string;
    workType: WorkType;
    title: string;
    content: string;
    author: string;
    createdAt: string;
  };
}

// ========================================
// 智能对比模块
// ========================================

export interface CompareRequest {
  originalPrompt: string;
  comparedPrompt: string;
}

export interface CompareImprovement {
  dimension: string;
  original: string;
  improved: string;
  impact: "high" | "medium" | "low";
}

export interface ScoreComparison {
  originalScore: number;
  comparedScore: number;
  improvement: number;
}

export interface CompareAnalysis {
  improvements: CompareImprovement[];
  scoreComparison: ScoreComparison;
}

export interface CompareResult {
  id: string;
  originalPrompt: string;
  comparedPrompt: string;
  analysis: CompareAnalysis;
  createdAt: string;
}

/** 对比历史列表项（精简） */
export interface CompareHistoryItem {
  id: string;
  originalPrompt: string;
  comparedPrompt: string;
  scoreComparison: ScoreComparison;
  createdAt: string;
}

// ========================================
// 积木构建器模板模块
// ========================================

export type BlockType = "role" | "task" | "context" | "format" | "constraint";

export interface Block {
  type: BlockType;
  content: string;
  order: number;
}

export interface Template {
  id: string;
  name: string;
  blocks: Block[];
  createdAt: string;
  updatedAt: string;
}

export interface SaveTemplateRequest {
  name: string;
  blocks: Block[];
}

// ========================================
// 徽章模块
// ========================================

export interface BadgeUnlockCriteria {
  type: string;
  target: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  unlockCriteria: BadgeUnlockCriteria;
  unlocked: boolean;
  unlockedAt: string | null;
}

export interface BadgeListResponse {
  badges: Badge[];
}

// ========================================
// 个人资料模块
// ========================================

/** 头像审核状态：none=从未提交 / pending=待审 / approved=已通过 / rejected=已驳回 */
export type AvatarStatus = "none" | "pending" | "approved" | "rejected";

export interface Profile {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  /** 当前对外可见的头像（仅审核通过的） */
  avatar: string | null;
  avatarStatus: AvatarStatus;
  /** 最近一次驳回理由，供用户端展示 */
  avatarRejectReason: string | null;
  streakDays: number;
  lastLoginAt: string | null;
  createdAt: string;
}

/**
 * 更新个人资料。
 * 刻意不含 avatar —— 头像必须走「上传 + 后台审核」，允许在这里直接改就绕过了审核。
 */
export interface UpdateProfileRequest {
  username: string;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

/** 头像状态（上传 / 查询接口的返回） */
export interface AvatarStatusInfo {
  status: AvatarStatus;
  /** 当前生效的头像 */
  avatar: string | null;
  /** 待审头像，仅 pending 时有值 */
  pendingAvatar: string | null;
  rejectReason: string | null;
  submittedAt: string | null;
}

// ========================================
// 管理后台 · 头像审核
// ========================================

/** 审核状态（不含 none —— 那是「用户从未提交」的状态，不是一条审核记录） */
export type ReviewStatus = "pending" | "approved" | "rejected";

export interface AdminAvatarReview {
  reviewId: string;
  userId: string;
  username: string | null;
  email: string | null;
  /** 本次提交的头像 */
  avatarUrl: string;
  /** 该用户当前生效的头像（审核员可对比） */
  currentAvatar: string | null;
  status: ReviewStatus;
  rejectReason: string | null;
  reviewerId: string | null;
  reviewerName: string | null;
  submittedAt: string;
  reviewedAt: string | null;
}

export type AdminAvatarStats = Record<ReviewStatus, number>;

// ========================================
// 管理后台 · 用户管理
// ========================================

export type UserStatus = "active" | "disabled" | "deleted";

export interface AdminUser {
  /** 主键，只读 —— 后台不提供修改用户 ID 的入口 */
  id: string;
  email: string;
  username: string;
  role: UserRole;
  status: UserStatus;
  avatar: string | null;
  avatarStatus: AvatarStatus;
  streakDays: number;
  conversationCount: number;
  workCount: number;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface CreateUserRequest {
  email: string;
  username: string;
  password: string;
  role?: UserRole;
}

export interface UpdateUserRequest {
  email: string;
  username: string;
}

// ========================================
// 管理后台 · AI 配置
// ========================================

export interface AiConfig {
  provider: string;
  baseUrl: string;
  /** 形如 sk-****abcd，永不返回原文 */
  apiKeyMasked: string;
  apiKeyConfigured: boolean;
  /** "数据库" 或 "环境变量"，便于排查「改了不生效」 */
  apiKeySource: string;
  model: string;
  dailyLimit: number;
  assistantDailyLimit: number;
  timeoutSeconds: number;
  streamTimeoutSeconds: number;
  maxTokens: number;
  enabled: boolean;
  updatedBy: string | null;
  updatedAt: string | null;
}

/** 更新配置的请求体。apiKey 留空或传脱敏串表示不修改 */
export interface UpdateAiConfigRequest {
  baseUrl: string;
  apiKey?: string;
  model: string;
  dailyLimit: number;
  assistantDailyLimit: number;
  timeoutSeconds: number;
  streamTimeoutSeconds: number;
  maxTokens: number;
  enabled: boolean;
}

export interface AiConfigTestResult {
  ok: boolean;
  latencyMs: number;
  model: string | null;
  error: string | null;
}

// ========================================
// 管理后台 · 监控与日志
// ========================================

export interface MonitorKpi {
  calls: number;
  /** 无数据时为 null（不是 0）—— 要能区分「没有数据」与「成功率 0%」 */
  successRate: number | null;
  avgLatencyMs: number | null;
  tokens: number;
  todayCalls: number;
  totalUsers: number;
  activeUsers7d: number;
  totalConversations: number;
  totalWorks: number;
  pendingAvatarReviews: number;
}

export interface AiUsageRow {
  statDate?: string;
  scope?: string;
  calls: number;
  success?: number;
  failure?: number;
  tokens: number;
  totalCostMs?: number;
}

export interface AiQuota {
  todayCalls: number;
  dailyLimit: number;
  assistantDailyLimit: number;
  model: string;
  enabled: boolean;
  apiKeyConfigured: boolean;
}

export interface SystemMetrics {
  uptimeSeconds: number;
  heapUsedMb: number;
  heapMaxMb: number;
  heapUsagePercent: number;
  threads: number;
  hikariActive?: number;
  hikariIdle?: number;
  hikariWaiting?: number;
  hikariTotal?: number;
}

export interface ContentStats {
  users: { total: number; today: number; active7d: number; active30d: number };
  conversations: { socratic: number; assistant: number };
  works: { total: number };
  pendingAvatarReviews: number;
}

export interface RecentError {
  traceId: string | null;
  path: string | null;
  statusCode: number | null;
  costMs: number | null;
  message: string | null;
  createdAt: string | null;
}

export interface MonitorOverview {
  days: number;
  kpi: MonitorKpi;
  ai: { byDay: AiUsageRow[]; byScope: AiUsageRow[]; quota: AiQuota };
  health: Record<string, string>;
  system: SystemMetrics;
  content: ContentStats;
  recentErrors: RecentError[];
}

export type LogLevel = "ERROR" | "WARN" | "SLOW";

export interface SystemLogItem {
  id: number;
  traceId: string | null;
  level: LogLevel;
  method: string | null;
  path: string | null;
  statusCode: number | null;
  userId: string | null;
  ip: string | null;
  costMs: number | null;
  message: string | null;
  createdAt: string;
}

export interface TrendPoint {
  date: string;
  count: number;
}

export type TrendMetric = "users" | "conversations" | "works";

// ========================================
// 健康检查
// ========================================

export interface HealthStatus {
  status: string;
  timestamp: string;
  services: {
    database: string;
    redis: string;
    deepseek: string;
  };
  version: string;
}

// ========================================
// 挑战赛模块（接口文档未定义，保留类型供后续扩展）
// ========================================

export interface Challenge {
  id: string;
  title: string;
  description: string;
  difficulty: number;
  participantCount: number;
  endTime: string;
}

export interface ChallengeSubmission {
  id: string;
  challengeId: string;
  prompt: string;
  score: number;
  feedback: string;
  scores: {
    effectiveness: number;
    structure: number;
    creativity: number;
    constraint: number;
  };
  rank?: number;
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  score: number;
}

// ========================================
// 全局 AI 助手
// ========================================

export interface AssistantConversation {
  id: string;
  /** 首条用户消息自动回填，未发过消息时为 null */
  title: string | null;
  messageCount: number;
  lastMessageAt: string;
  createdAt: string;
}

export interface AssistantConversationDetail {
  id: string;
  title: string | null;
  messages: Message[];
}

/** 助手 SSE 事件名。完成/失败由 done / error 显式告知，不靠连接关闭推断 */
export type AssistantSseEvent = "meta" | "delta" | "done" | "error";
