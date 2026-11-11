/**
 * 健康检查与日志服务
 * 注意：日志接口路径为 /health/log（无 s）
 */
import { request } from './request'
import type { HealthStatus, LogFile, LogContent } from '@/types'

export const healthService = {
  /** 健康检查 */
  check(): Promise<HealthStatus> {
    return request.get<HealthStatus>('/health/check')
  },
  /** 健康状态 */
  status(): Promise<HealthStatus> {
    return request.get<HealthStatus>('/health/status')
  },
  /** 日志文件列表 */
  getLogs(): Promise<LogFile[]> {
    return request.get<LogFile[]>('/health/log/')
  },
  /** 获取日志文件内容（后端只返回末尾若干行，避免大文件卡死） */
  getLogContent(filename: string, tailLines?: number): Promise<LogContent> {
    return request.get<LogContent>(`/health/log/${encodeURIComponent(filename)}`, {
      tailLines,
    })
  },
  /** 下载完整日志文件（大文件查看兜底） */
  downloadLog(filename: string): Promise<Blob> {
    return request.download(`/health/log/${encodeURIComponent(filename)}/download`)
  },
  /** 删除指定日志文件 */
  deleteLog(filename: string): Promise<void> {
    return request.del<void>(`/health/log/${encodeURIComponent(filename)}`)
  },
  /** 清空全部日志文件 */
  deleteAllLogs(): Promise<void> {
    return request.del<void>('/health/log/')
  },
}
