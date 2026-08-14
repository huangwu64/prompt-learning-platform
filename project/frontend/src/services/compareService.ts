import apiClient from "./apiClient";
import type { PaginationParams, PaginatedData } from "@/types";
import type {
  CompareRequest,
  CompareResult,
  CompareHistoryItem,
} from "@/types";

export const compareService = {
  /** 创建智能对比 POST /api/compare */
  create: (data: CompareRequest) =>
    apiClient.post<CompareResult>("/compare", data),

  /** 对比历史列表 GET /api/compare/history */
  getHistory: (params?: PaginationParams) =>
    apiClient.get<PaginatedData<CompareHistoryItem>>("/compare/history", {
      params,
    }),
};
