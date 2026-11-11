/**
 * 用户服务：获取当前用户资料、更新个人资料、用户管理（管理员）
 */
import { request } from './request'
import type {
  AdminUserItem,
  CreateUserParams,
  UserProfile,
  UserUpdateParams,
} from '@/types'

export const userService = {
  /** 获取当前登录用户资料 */
  getProfile(): Promise<UserProfile> {
    return request.get<UserProfile>('/user/profile')
  },
  /** 更新当前用户资料（修改密码时后端校验不能与原密码相同） */
  update(params: UserUpdateParams): Promise<unknown> {
    return request.patch<unknown>('/user/update', params)
  },
  /** 用户管理：全部用户列表（仅管理员） */
  listAll(): Promise<AdminUserItem[]> {
    return request.get<AdminUserItem[]>('/user/all')
  },
  /** 用户管理：创建用户（仅管理员） */
  createUser(params: CreateUserParams): Promise<unknown> {
    return request.post<unknown>('/user/create', params)
  },
  /** 用户管理：删除用户（仅管理员，不能删除自己） */
  deleteUser(id: string): Promise<unknown> {
    return request.del<unknown>(`/user/${id}`)
  },
  /** 用户管理：重置用户密码（仅管理员） */
  resetPassword(id: string, password: string): Promise<unknown> {
    return request.patch<unknown>(`/user/${id}/password`, { password })
  },
}
