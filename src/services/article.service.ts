/**
 * 文章服务
 * 说明：article 后端正在改造（新增 md 导入导出），此处按契约封装。
 */
import { request } from './request'
import type {
  Article,
  ArticleRevision,
  ArticleRevisionDetail,
  CreateArticleDto,
  UpdateArticleDto,
  QueryArticleDto,
  Paginated,
} from '@/types'

export const articleService = {
  /** 文章列表（分页） */
  list(params: QueryArticleDto): Promise<Paginated<Article>> {
    return request.get<Paginated<Article>>('/article/all', params)
  },
  /** 根据 id 获取文章 */
  getById(id: string): Promise<Article> {
    return request.get<Article>(`/article/${id}`)
  },
  /** 根据 slug 获取文章 */
  getBySlug(slug: string): Promise<Article> {
    return request.get<Article>(`/article/slug/${slug}`)
  },
  /** 新建文章 */
  create(data: CreateArticleDto): Promise<Article> {
    return request.post<Article>('/article/add', data)
  },
  /** 更新文章 */
  update(id: string, data: UpdateArticleDto): Promise<Article> {
    return request.patch<Article>(`/article/${id}`, data)
  },
  /** 删除文章（软删除） */
  remove(id: string): Promise<void> {
    return request.del<void>(`/article/${id}`)
  },
  /** 永久删除文章 */
  removePermanent(id: string): Promise<void> {
    return request.del<void>(`/article/${id}/permanent`)
  },
  /** 文章阅读量 +1 */
  incrementViews(id: string): Promise<void> {
    return request.post<void>(`/article/${id}/views`)
  },
  /** 草稿列表 */
  listDrafts(): Promise<Article[]> {
    return request.get<Article[]>('/article/drafts')
  },
  /** 导入 Markdown（FormData 字段 file，可带 categoryId） */
  importMarkdown(file: File, categoryId?: string): Promise<Article> {
    return request.upload<Article>('/article/import', file, {
      extra: categoryId ? { categoryId } : undefined,
    })
  },
  /** 导出单篇文章 */
  exportOne(id: string): Promise<Blob> {
    return request.download(`/article/${id}/export`)
  },
  /** 导出全部文章 */
  exportAll(): Promise<Blob> {
    return request.download('/article/export/all')
  },
  /** 历史版本列表 */
  listRevisions(id: string): Promise<ArticleRevision[]> {
    return request.get<ArticleRevision[]>(`/article/${id}/revisions`)
  },
  /** 历史版本详情（含正文） */
  getRevision(id: string, revisionId: string): Promise<ArticleRevisionDetail> {
    return request.get<ArticleRevisionDetail>(
      `/article/${id}/revisions/${revisionId}`,
    )
  },
  /** 回溯到指定历史版本 */
  restoreRevision(id: string, revisionId: string): Promise<Article> {
    return request.post<Article>(`/article/${id}/revisions/${revisionId}/restore`)
  },
}
