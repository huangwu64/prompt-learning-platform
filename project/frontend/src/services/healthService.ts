import apiClient from "./apiClient";
import type { HealthStatus } from "@/types";

export const healthService = {
  /** 服务健康检查 GET /api/health（无需认证） */
  check: () =>
    apiClient.get<HealthStatus>("/health"),
};
