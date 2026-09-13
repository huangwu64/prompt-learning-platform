import apiClient from "./apiClient";
import type {
  AdminAvatarReview,
  AdminAvatarStats,
  AdminUser,
  AiConfig,
  AiConfigTestResult,
  ContentStats,
  CreateUserRequest,
  LogLevel,
  MonitorOverview,
  PaginatedData,
  PaginationParams,
  ReviewStatus,
  SystemLogItem,
  TrendMetric,
  TrendPoint,
  UpdateAiConfigRequest,
  UpdateUserRequest,
  UserRole,
  UserStatus,
} from "@/types";

export interface AdminUserQuery extends PaginationParams {
  keyword?: string;
  role?: UserRole;
  status?: UserStatus;
}

export interface LogQuery extends PaginationParams {
  level?: LogLevel;
  path?: string;
  traceId?: string;
  userId?: string;
  from?: string;
  to?: string;
}

/**
 * 管理端接口。全部需要 ADMIN 角色 —— 后端在 SecurityConfig 做了路由级鉴权，
 * 前端只是不把入口暴露给普通用户，不是安全边界。
 */
export const adminService = {
  // ============ 头像审核 ============

  /** 头像审核列表 GET /api/admin/avatars */
  listAvatarReviews: (params: PaginationParams & { status?: ReviewStatus }) =>
    apiClient.get<PaginatedData<AdminAvatarReview>>("/admin/avatars", { params }),

  avatarStats: () => apiClient.get<AdminAvatarStats>("/admin/avatars/stats"),

  approveAvatar: (reviewId: string) =>
    apiClient.post<AdminAvatarReview>(`/admin/avatars/${reviewId}/approve`, {}),

  rejectAvatar: (reviewId: string, reason: string) =>
    apiClient.post<AdminAvatarReview>(`/admin/avatars/${reviewId}/reject`, { reason }),

  // ============ 用户管理 ============

  listUsers: (params: AdminUserQuery) =>
    apiClient.get<PaginatedData<AdminUser>>("/admin/users", { params }),

  getUser: (id: string) => apiClient.get<AdminUser>(`/admin/users/${id}`),

  createUser: (data: CreateUserRequest) => apiClient.post<AdminUser>("/admin/users", data),

  updateUser: (id: string, data: UpdateUserRequest) =>
    apiClient.put<AdminUser>(`/admin/users/${id}`, data),

  updateUserRole: (id: string, role: UserRole) =>
    apiClient.put<AdminUser>(`/admin/users/${id}/role`, { role }),

  updateUserStatus: (id: string, status: Exclude<UserStatus, "deleted">) =>
    apiClient.put<AdminUser>(`/admin/users/${id}/status`, { status }),

  /** 重置密码。管理员自行输入新密码，响应不回显任何密码信息 */
  resetPassword: (id: string, newPassword: string) =>
    apiClient.post<null>(`/admin/users/${id}/password`, { newPassword }),

  /** 直接设定头像（跳过审核的特权通道） */
  setUserAvatar: (id: string, avatar: string) =>
    apiClient.put<AdminUser>(`/admin/users/${id}/avatar`, { avatar }),

  /** 软删：置 deleted 并混淆邮箱用户名，保留历史数据 */
  deleteUser: (id: string) => apiClient.delete<null>(`/admin/users/${id}`),

  // ============ AI 配置 ============

  getAiConfig: () => apiClient.get<AiConfig>("/admin/config/ai"),

  updateAiConfig: (data: UpdateAiConfigRequest) =>
    apiClient.put<AiConfig>("/admin/config/ai", data),

  /** 试连。失败返回 ok=false 而非抛错，前端直接把 error 显示出来 */
  testAiConfig: (data: Partial<UpdateAiConfigRequest>) =>
    apiClient.post<AiConfigTestResult>("/admin/config/ai/test", data),

  // ============ 监控与日志 ============

  monitorOverview: (days = 7) =>
    apiClient.get<MonitorOverview>("/admin/monitor/overview", { params: { days } }),

  monitorHealth: () =>
    apiClient.get<{
      services: Record<string, string>;
      system: Record<string, number>;
    }>("/admin/monitor/health"),

  monitorContent: () => apiClient.get<ContentStats>("/admin/monitor/content"),

  monitorTrends: (metric: TrendMetric, days = 30) =>
    apiClient.get<TrendPoint[]>("/admin/monitor/trends", { params: { metric, days } }),

  listLogs: (params: LogQuery) =>
    apiClient.get<PaginatedData<SystemLogItem>>("/admin/logs", { params }),

  logStats: (days = 7) =>
    apiClient.get<Record<LogLevel, number>>("/admin/logs/stats", { params: { days } }),
};

export default adminService;
