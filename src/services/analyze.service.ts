/**
 * 数据分析服务
 */
import { request } from './request'
import type {
  OverviewStats,
  ArticleStat,
  CategoryStat,
  RecentActivity,
  SystemStats,
  AllStats,
} from '@/types'

export const analyzeService = {
  /** 总览统计 */
  overview(): Promise<OverviewStats> {
    return request.get<OverviewStats>('/analyze/overview')
  },
  /** 文章维度统计（按月聚合） */
  article(): Promise<ArticleStat[]> {
    return request.get<ArticleStat[]>('/analyze/article')
  },
  /** 分类维度统计 */
  category(): Promise<CategoryStat[]> {
    return request.get<CategoryStat[]>('/analyze/category')
  },
  /** 近期活跃（按天，可指定天数） */
  recent(days?: number): Promise<RecentActivity[]> {
    return request.get<RecentActivity[]>('/analyze/recent', days ? { days } : undefined)
  },
  /** 近期活跃（recent 别名，语义更明确） */
  recentActivity(days?: number): Promise<RecentActivity[]> {
    return this.recent(days)
  },
  /** 系统运行指标 */
  system(): Promise<SystemStats> {
    return request.get<SystemStats>('/analyze/system')
  },
  /** 全部分析数据（一次取全量） */
  all(): Promise<AllStats> {
    return request.get<AllStats>('/analyze/all')
  },
  /** 全部分析数据（all 别名） */
  getAllStats(): Promise<AllStats> {
    return this.all()
  },
}
