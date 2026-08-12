import axios from 'axios'

/** 后端统一响应结构：{ success, data, error } */
export interface ApiResult<T> {
  success: boolean
  data: T
  error: string | null
}

/**
 * 统一请求封装：
 * - 自动携带 JWT（Authorization: Bearer <token>）
 * - 统一错误处理（401 清空并跳登录）
 */
const request = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

request.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

request.interceptors.response.use(
  (res) => res.data,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.clear()
      window.location.href = '/login'
    }
    const msg = err.response?.data?.error || '网络异常，请稍后重试'
    return Promise.reject(new Error(msg))
  },
)

export default request
