/**
 * 文档相关类型
 */

/** 文档实体 */
export interface Article {
  _id: string
  title: string
  content: string
  summary?: string
  category?: string
  tags?: string[]
  views: number
  slug?: string
  isDeleted?: boolean
  author?: string
  created?: string | number
  modified?: string | number
}

/** 创建文档入参 */
export interface CreateArticleDto {
  title: string
  content: string
  summary?: string
  category?: string
  tags?: string[]
  slug?: string
}

/** 更新文档入参（所有字段可选） */
export type UpdateArticleDto = Partial<CreateArticleDto> & {
  isDeleted?: boolean
}

/** 文档查询入参（使用 type 别名以获得隐式索引签名，便于传入 query 参数） */
export type QueryArticleDto = {
  category?: string
  tag?: string
  author?: string
  page?: number
  pageSize?: number
}
