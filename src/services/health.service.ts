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
  /** 获取日志文件内容 */
  getLogContent(filename: string): Promise<LogContent> {
    return request.get<LogContent>(`/health/log/${encodeURIComponent(filename)}`)
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
