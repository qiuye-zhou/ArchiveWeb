/**
 * 用户与鉴权相关类型
 */

/** 登录入参 */
export interface LoginParams {
  username: string
  password: string
}

/** 用户资料 */
export interface UserProfile {
  id: string
  name: string
  username: string
  mail: string
  avatar: string
  createdTime?: string | number
  lastLoginTime?: string | number
  lastLoginIp?: string
}

/** 用户资料更新入参（字段均可选，留空表示不修改） */
export interface UserUpdateParams {
  name?: string
  mail?: string
  avatar?: string
  password?: string
}

/** 登录返回结果（含 token） */
export interface LoginResult {
  token: string
  name: string
  username: string
  createdTime?: string | number
  mail: string
  avatar: string
  id: string
}

/** 初始化引导入参 */
export interface InitParams {
  username: string
  name: string
  password: string
  introduce?: string
  avatar?: string
  config?: Record<string, unknown>
}

/** 初始化引导返回结果 */
export interface InitResult {
  token: string
  username: string
}

/** 初始化状态 */
export interface InitStatus {
  isInit: boolean
}
