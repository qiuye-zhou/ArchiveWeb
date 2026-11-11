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
  lastModifiedBy?: string
  lastModifiedByName?: string
  /** 移入回收站时间 */
  deletedAt?: string | number
  /** 删除操作人用户 id */
  deletedBy?: string
  /** 删除操作人显示名 */
  deletedByName?: string
  created?: string | number
  modified?: string | number
}

/** 历史版本列表项（不含正文） */
export interface ArticleRevision {
  id: string
  title: string
  editorId?: string
  editorName: string
  created?: string | number
}

/** 历史版本详情（含正文） */
export interface ArticleRevisionDetail extends ArticleRevision {
  articleId: string
  content: string
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
