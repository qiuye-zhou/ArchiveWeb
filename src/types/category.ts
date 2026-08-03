/**
 * 分类相关类型
 */

/** 分类类型：0=目录，1=标签 */
export enum CategoryType {
  Folder = 0,
  Tag = 1,
}

/** 分类实体 */
export interface Category {
  _id: string
  name: string
  type: CategoryType
  sign?: string
  parentId?: string | null
  children?: Category[]
  created?: string | number
  modified?: string | number
}

/** 创建分类入参 */
export interface CreateCategoryDto {
  name: string
  type: CategoryType
  sign?: string
  parentId?: string
  /** 排序值（可选，后端按 order 升序） */
  order?: number
}

/** 更新分类入参 */
export type UpdateCategoryDto = Partial<CreateCategoryDto>

/** 分类查询入参（使用 type 别名以获得隐式索引签名，便于传入 query 参数） */
export type QueryCategoryDto = {
  istag?: boolean
  page?: number
  pageSize?: number
}

/** 通用树节点（用于前端树形渲染） */
export interface TreeNode<T> {
  key: string
  title: string
  data: T
  children?: TreeNode<T>[]
}
