import apiClient from "./apiClient";
import type { PaginationParams, PaginatedData, WorkType } from "@/types";
import type {
  Work,
  CreateWorkRequest,
  ShareWorkResponse,
  UnshareWorkResponse,
  SharedWork,
} from "@/types";

export const worksService = {
  /** 作品列表 GET /api/works */
  list: (params?: PaginationParams & { workType?: WorkType }) =>
    apiClient.get<PaginatedData<Work>>("/works", { params }),

  /** 生成作品 POST /api/works */
  create: (data: CreateWorkRequest) =>
    apiClient.post<Work>("/works", data),

  /** 作品详情 GET /api/works/:id */
  getDetail: (id: string) =>
    apiClient.get<Work>(`/works/${id}`),

  /** 删除作品 DELETE /api/works/:id */
  delete: (id: string) =>
    apiClient.delete<{ id: string; deleted: boolean }>(`/works/${id}`),

  /** 生成分享链接 POST /api/works/:id/share */
  share: (id: string) =>
    apiClient.post<ShareWorkResponse>(`/works/${id}/share`),

  /** 取消分享 DELETE /api/works/:id/share */
  unshare: (id: string) =>
    apiClient.delete<UnshareWorkResponse>(`/works/${id}/share`),

  /** 公开访问分享作品（免登录） GET /api/share/:shareCode */
  getShared: (shareCode: string) =>
    apiClient.get<SharedWork>(`/share/${shareCode}`),
};
