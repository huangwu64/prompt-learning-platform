import apiClient from "./apiClient";
import type { PaginationParams, PaginatedData } from "@/types";
import type { Template, SaveTemplateRequest } from "@/types";

export const templateService = {
  /** 模板列表 GET /api/templates */
  list: (params?: PaginationParams) =>
    apiClient.get<PaginatedData<Template>>("/templates", { params }),

  /** 模板详情 GET /api/templates/:id */
  getDetail: (id: string) =>
    apiClient.get<Template>(`/templates/${id}`),

  /** 保存模板 POST /api/templates */
  create: (data: SaveTemplateRequest) =>
    apiClient.post<Template>("/templates", data),

  /** 更新模板 PUT /api/templates/:id */
  update: (id: string, data: SaveTemplateRequest) =>
    apiClient.put<Template>(`/templates/${id}`, data),

  /** 删除模板 DELETE /api/templates/:id */
  delete: (id: string) =>
    apiClient.delete<{ id: string; deleted: boolean }>(`/templates/${id}`),
};
