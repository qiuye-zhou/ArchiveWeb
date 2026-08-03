/**
 * 通用响应类型定义
 * 后端统一响应格式：{ code, message, data }
 */

/** 后端统一响应结构 */
export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

/** 分页响应结构（data 字段） */
export interface Paginated<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}
