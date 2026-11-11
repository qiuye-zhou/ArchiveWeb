/**
 * 健康检查与日志相关类型
 * 与后端 /health/* 接口契约对齐
 */

/** 健康检查组件状态 */
export interface HealthComponent {
  status: string
  message?: string
  details?: unknown
}

/** 健康状态（/health/check、/health/status 返回） */
export interface HealthStatus {
  status: string
  timestamp?: string | number
  components?: {
    database?: HealthComponent
    system?: HealthComponent
    memory?: HealthComponent
    directories?: HealthComponent
  }
}

/** 日志文件项 */
export interface LogFile {
  filename: string
  size: number | string
  path?: string
  modifiedAt?: string | number
}

/** 日志文件内容 */
export interface LogContent {
  filename: string
  content: string
  /** 文件总字节数 */
  size?: number
  /** 实际返回的行数 */
  shownLines?: number
  /** 是否因文件过大只返回了末尾内容 */
  truncated?: boolean
}

