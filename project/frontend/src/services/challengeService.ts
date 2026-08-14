import apiClient from "./apiClient";
import type { Challenge, ChallengeSubmission, LeaderboardEntry } from "@/types";

/**
 * 挑战赛模块
 *
 * 注意：接口文档 v2.0 中未定义挑战赛相关接口（标注为待开发）。
 * 以下路径基于需求文档设计，后端实现后可能需要调整。
 */
export const challengeService = {
  /** 获取今日挑战 GET /api/challenges（待开发） */
  getToday: () =>
    apiClient.get<Challenge>("/challenges"),

  /** 提交挑战作品 POST /api/challenges/:id/submit（待开发） */
  submit: (challengeId: string, prompt: string) =>
    apiClient.post<ChallengeSubmission>(`/challenges/${challengeId}/submit`, {
      prompt,
    }),

  /** 获取排行榜 GET /api/challenges/leaderboard（待开发） */
  getLeaderboard: (type: "daily" | "weekly" | "total") =>
    apiClient.get<LeaderboardEntry[]>(`/challenges/leaderboard`, {
      params: { type },
    }),
};
