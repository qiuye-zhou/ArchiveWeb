/**
 * 鉴权服务：登录 / 登出 / 刷新 token
 */
import { request } from './request'
import type { LoginParams, LoginResult } from '@/types'

export const authService = {
  /** 登录 */
  login(data: LoginParams): Promise<LoginResult> {
    return request.post<LoginResult>('/user/login', data)
  },
  /** 登出 */
  logout(): Promise<void> {
    return request.post<void>('/user/logout')
  },
  /** 刷新 token */
  refresh(token: string): Promise<{ token: string }> {
    return request.post<{ token: string }>('/auth/refresh', { token })
  },
}
