/**
 * 数据分析相关类型
 * 与后端 /analyze/* 接口契约对齐
 */

/** 总览统计：文档数 / 分类数 / 用户数 */
export interface OverviewStats {
  articles: number
  categories: number
  users: number
}

/** 文章维度统计（按月份聚合，_id 形如 'YYYY-MM'） */
export interface ArticleStat {
  _id: string
  count: number
}

/** 分类维度统计 */
export interface CategoryStat {
  name: string
  count: number
}

/** 近期活跃（按天聚合） */
export interface RecentActivity {
  date: string
  articles: number
}

/** 系统运行指标（后端已格式化为字符串） */
export interface SystemStats {
  os: string
  platform: string
  arch: string
  nodeVersion: string
  /** 系统运行时长（已格式化，如 '1 天 2 小时'） */
  uptime: string
  /** 内存占用（已格式化，如 '2.50 GB'） */
  memoryUsage: string
  totalMemory: string
  freeMemory: string
  cpuModel: string
  /** CPU 核心数 */
  cpus: number
  hostname: string
  version: string
  env: string
}

/** /analyze/all 全量聚合返回 */
export interface AllStats {
  overview: OverviewStats
  article: ArticleStat[]
  category: CategoryStat[]
  system: SystemStats
}
