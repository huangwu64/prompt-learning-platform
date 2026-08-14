import apiClient from "./apiClient";
import type { LoginRequest, RegisterRequest, AuthResponse } from "@/types";

export const authService = {
  /** 用户注册 POST /api/auth/register */
  register: (data: RegisterRequest) =>
    apiClient.post<AuthResponse>("/auth/register", data),

  /** 用户登录 POST /api/auth/login */
  login: (data: LoginRequest) =>
    apiClient.post<AuthResponse>("/auth/login", data),
};
