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

export interface AuthUser {
  id: string;
  email: string;
  username: string;
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

export type MessageType = "question" | "answer" | "summary";

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
  rating: number | null;
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
  message: Message;
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

/** 评分响应 */
export interface RateChatResponse {
  conversationId: string;
  rating: number;
  averageRating: number;
  masteredTopics: number;
}

// ========================================
// 学习路径模块
// ========================================

export type KnowledgePointStatus = "locked" | "learning" | "mastered";
export type StageStatus = "locked" | "in_progress" | "completed";
export type StageId = "beginner" | "intermediate" | "advanced" | "master";

export interface LearningStats {
  averageRating: number;
  streakDays: number;
  masteredCount: number;
  totalConversations: number;
}

export interface KnowledgePoint {
  id: string;
  name: string;
  status: KnowledgePointStatus;
  bestRating: number | null;
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

export interface Profile {
  id: string;
  username: string;
  email: string;
  avatar: string | null;
  streakDays: number;
  createdAt: string;
}

export interface UpdateProfileRequest {
  username?: string;
  avatar?: string;
}

// ========================================
// 健康检查
// ========================================

export interface HealthStatus {
  status: string;
  timestamp: string;
  services: {
    database: string;
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
