/**
 * 鉴权状态 store（zustand + persist）
 * 持久化到 localStorage key 'archive-web-auth'
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authService } from '@/services/auth.service'
import { userService } from '@/services/user.service'
import type { LoginParams, UserProfile } from '@/types'

interface AuthState {
  token: string | null
  user: UserProfile | null
  /** 设置 token */
  setToken: (token: string | null) => void
  /** 设置用户信息 */
  setUser: (user: UserProfile | null) => void
  /** 登录：调用登录接口并写入 token / user */
  login: (params: LoginParams) => Promise<void>
  /** 登出：调用登出接口并清空状态 */
  logout: () => Promise<void>
  /** 拉取当前用户资料 */
  fetchProfile: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setToken: (token) => set({ token }),
      setUser: (user) => set({ user }),
      login: async (params) => {
        const result = await authService.login(params)
        // LoginResult 结构兼容 UserProfile（多出 token 字段），直接写入
        set({ token: result.token, user: result })
      },
      logout: async () => {
        try {
          await authService.logout()
        } catch {
          // 登出接口失败不阻塞本地清空
        }
        set({ token: null, user: null })
      },
      fetchProfile: async () => {
        const profile = await userService.getProfile()
        set({ user: profile })
      },
    }),
    {
      name: 'archive-web-auth',
    },
  ),
)
