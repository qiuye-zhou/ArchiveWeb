/**
 * 站点配置相关类型
 * 与后端 /config/* 接口契约对齐（IConfig: { seo, url, adminExtra }）
 */

/** SEO 子配置 */
export interface SeoConfig {
  title?: string
  /** 关键字列表 */
  keywords?: string[]
  description?: string
}

/** URL 子配置 */
export interface UrlConfig {
  /** 前端地址 */
  webUrl?: string
  /** API 地址 */
  serverUrl?: string
  /** Gateway 地址 */
  wsUrl?: string
}

/** 后台附加设置 */
export interface AdminExtraConfig {
  /** 登录页面背景 */
  backgroundUrl?: string
}

/** 站点配置（与后端 IConfig 对齐） */
export interface SiteConfig {
  seo?: SeoConfig
  url?: UrlConfig
  adminExtra?: AdminExtraConfig
}

/** 配置项 key */
export type ConfigKey = 'seo' | 'url' | 'adminExtra'

/** 单个配置更新项 */
export interface ConfigUpdateItem {
  key: ConfigKey
  data: Partial<SeoConfig & UrlConfig & AdminExtraConfig>
}

/** 批量更新配置入参 */
export interface ConfigBatchUpdate {
  updates: ConfigUpdateItem[]
}
