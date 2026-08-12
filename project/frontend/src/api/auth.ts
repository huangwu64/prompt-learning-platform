import request, { type ApiResult } from '../services/request'

/** 用户信息（与接口文档 UserVO 对应） */
export interface UserVO {
  id: string
  email: string
  username: string
  avatar: string | null
  streakDays: number
  createdAt: string
}

/** 登录/注册响应（与接口文档 LoginVO 对应） */
export interface LoginVO {
  user: UserVO
  token: string
}

export interface RegisterReq {
  email: string
  password: string
  username: string
}

export interface LoginReq {
  email: string
  password: string
}

/** 认证接口（对应接口文档「二、认证模块」） */
export const authApi = {
  register(data: RegisterReq): Promise<ApiResult<LoginVO>> {
    return request.post('/auth/register', data)
  },
  login(data: LoginReq): Promise<ApiResult<LoginVO>> {
    return request.post('/auth/login', data)
  },
}
