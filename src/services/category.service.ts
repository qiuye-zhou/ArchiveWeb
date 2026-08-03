/**
 * 分类服务
 * 说明：category 后端正在改造（新增 parentId 树形与 /category/tree），此处按契约封装。
 */
import { request } from './request'
import type {
  Category,
  CreateCategoryDto,
  UpdateCategoryDto,
  QueryCategoryDto,
  Paginated,
} from '@/types'

export const categoryService = {
  /** 分类列表（分页） */
  list(params: QueryCategoryDto): Promise<Paginated<Category>> {
    return request.get<Paginated<Category>>('/category/all', params)
  },
  /** 按 id 或 sign 查询分类 */
  getByQuery(query: string): Promise<Category> {
    return request.get<Category>(`/category/${query}`)
  },
  /** 新建分类 */
  create(data: CreateCategoryDto): Promise<Category> {
    return request.post<Category>('/category/add', data)
  },
  /** 更新分类 */
  update(id: string, data: UpdateCategoryDto): Promise<Category> {
    return request.patch<Category>(`/category/${id}`, data)
  },
  /** 删除分类 */
  remove(id: string): Promise<void> {
    return request.del<void>(`/category/${id}`)
  },
  /** 获取分类树（仅 Folder 类型进树，节点含 children） */
  tree(): Promise<Category[]> {
    return request.get<Category[]>('/category/tree')
  },
  /** 获取扁平分类列表（全部，含 Folder 与 Tag） */
  flat(): Promise<Category[]> {
    return request.get<Category[]>('/category/flat')
  },
}
