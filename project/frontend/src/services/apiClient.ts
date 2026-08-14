import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import type { ApiResponse } from "@/types";
import { useAuthStore } from "@/store/authStore";

// 模块增强：响应拦截器已拆包 { success, data, error }，
// 使 apiClient.get/post/put/delete<T>() 直接返回 Promise<T>（即 data 字段）
declare module "axios" {
  export interface AxiosInstance {
    request<T = unknown>(config: AxiosRequestConfig): Promise<T>;
    get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T>;
    delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T>;
    head<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T>;
    post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>;
    put<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>;
    patch<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>;
  }
}

const apiClient = axios.create({
  baseURL: "/api",
  timeout: 30_000,
  headers: {
    "Content-Type": "application/json",
  },
});

// 请求拦截器：自动携带 JWT
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().token;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器：拆包 { success, data, error } 统一格式
apiClient.interceptors.response.use(
  (response) => {
    const body = response.data as ApiResponse;

    // 兼容非标准响应（如文件下载）
    if (body === undefined || body.success === undefined) {
      return response.data;
    }

    // 业务失败：抛出错误，由 catch 统一处理
    if (!body.success) {
      return Promise.reject(new Error(body.error || "请求失败"));
    }

    // 业务成功：直接返回 data 字段
    return body.data;
  },
  (error: AxiosError<ApiResponse>) => {
    // 401 未认证：清除登录状态并跳转
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = "/login";
      return Promise.reject(new Error("登录已过期，请重新登录"));
    }

    // 优先使用后端返回的 error 字段
    const body = error.response?.data;
    const message = (body && body.error) || error.message || "请求失败";
    return Promise.reject(new Error(message));
  }
);

export default apiClient;
