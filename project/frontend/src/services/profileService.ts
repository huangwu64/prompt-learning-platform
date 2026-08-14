import apiClient from "./apiClient";
import type { Profile, UpdateProfileRequest } from "@/types";

export const profileService = {
  /** 获取个人资料 GET /api/profile */
  get: () =>
    apiClient.get<Profile>("/profile"),

  /** 更新个人资料 PUT /api/profile */
  update: (data: UpdateProfileRequest) =>
    apiClient.put<Profile>("/profile", data),
};
