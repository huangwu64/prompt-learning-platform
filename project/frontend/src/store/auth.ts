import { create } from 'zustand'
import { authApi, type LoginReq, type RegisterReq, type UserVO } from '../api/auth'

interface AuthState {
  token: string | null
  user: UserVO | null
  login: (data: LoginReq) => Promise<void>
  register: (data: RegisterReq) => Promise<void>
  logout: () => void
}

/** 登录状态（token 持久化到 localStorage） */
export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('token'),
  user: null,

  async login(data) {
    const res = await authApi.login(data)
    if (!res.success) throw new Error(res.error || '登录失败')
    localStorage.setItem('token', res.data.token)
    set({ token: res.data.token, user: res.data.user })
  },

  async register(data) {
    const res = await authApi.register(data)
    if (!res.success) throw new Error(res.error || '注册失败')
    localStorage.setItem('token', res.data.token)
    set({ token: res.data.token, user: res.data.user })
  },

  logout() {
    localStorage.clear()
    set({ token: null, user: null })
  },
}))
