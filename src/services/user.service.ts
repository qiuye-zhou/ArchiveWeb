/**
 * 用户服务：获取当前用户资料、更新个人资料
 */
import { request } from './request'
import type { UserProfile, UserUpdateParams } from '@/types'

export const userService = {
  /** 获取当前登录用户资料 */
  getProfile(): Promise<UserProfile> {
    return request.get<UserProfile>('/user/profile')
  },
  /** 更新当前用户资料（修改密码时后端校验不能与原密码相同） */
  update(params: UserUpdateParams): Promise<unknown> {
    return request.patch<unknown>('/user/update', params)
  },
}
