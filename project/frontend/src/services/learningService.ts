import apiClient from "./apiClient";
import type {
  LearningProgress,
  UpdateProgressRequest,
  UpdateProgressResponse,
} from "@/types";

export const learningService = {
  /** 获取学习进度 GET /api/learning/progress */
  getProgress: () =>
    apiClient.get<LearningProgress>("/learning/progress"),

  /** 更新学习进度 POST /api/learning/progress（内部接口，通常由对话评分自动触发） */
  updateProgress: (data: UpdateProgressRequest) =>
    apiClient.post<UpdateProgressResponse>("/learning/progress", data),
};
