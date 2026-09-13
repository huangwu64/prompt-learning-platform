import apiClient from "./apiClient";
import type {
  AvatarStatusInfo,
  ChangePasswordRequest,
  Profile,
  UpdateProfileRequest,
} from "@/types";

export const profileService = {
  /** 获取个人资料 GET /api/profile */
  get: () => apiClient.get<Profile>("/profile"),

  /** 更新用户名 PUT /api/profile（头像不在此接口） */
  update: (data: UpdateProfileRequest) => apiClient.put<Profile>("/profile", data),

  /** 修改密码 PUT /api/profile/password */
  changePassword: (data: ChangePasswordRequest) =>
    apiClient.put<null>("/profile/password", data),

  /** 查询头像状态 GET /api/profile/avatar */
  getAvatarStatus: () => apiClient.get<AvatarStatusInfo>("/profile/avatar"),

  /**
   * 提交头像审核 POST /api/profile/avatar
   *
   * 直接传 FormData 即可：apiClient 的请求拦截器会在检测到 FormData 时
   * 删掉默认的 Content-Type，让浏览器自己生成带 boundary 的请求头。
   */
  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient.post<AvatarStatusInfo>("/profile/avatar", formData);
  },
};

export default profileService;
