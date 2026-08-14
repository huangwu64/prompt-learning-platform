import apiClient from "./apiClient";
import type { BadgeListResponse } from "@/types";

export const badgeService = {
  /** 获取徽章定义列表 GET /api/badges */
  list: () =>
    apiClient.get<BadgeListResponse>("/badges"),
};
