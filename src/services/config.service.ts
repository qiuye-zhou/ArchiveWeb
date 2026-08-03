/**
 * 站点配置服务
 */
import { request } from './request'
import type { SiteConfig, ConfigKey, ConfigBatchUpdate } from '@/types'

export const configService = {
  /** 获取全部配置 */
  getConfig(): Promise<SiteConfig> {
    return request.get<SiteConfig>('/config/getconfig')
  },
  /** 获取配置键列表 */
  getKeys(): Promise<string[]> {
    return request.get<string[]>('/config/keys')
  },
  /** 按 key 获取配置 */
  getByKey(key: string): Promise<unknown> {
    return request.get<unknown>(`/config/getconfig/${key}`)
  },
  /** 按 key 更新配置 */
  update(key: string, body: unknown): Promise<unknown> {
    return request.patch<unknown>(`/config/${key}`, body)
  },
  /** 批量更新配置 */
  batchUpdate(data: ConfigBatchUpdate): Promise<unknown> {
    return request.post<unknown>('/config/batch', data)
  },
  /** 重置指定 key 配置 */
  reset(key: ConfigKey | string): Promise<unknown> {
    return request.del<unknown>(`/config/reset/${key}`)
  },
  /** 重置全部配置 */
  resetAll(): Promise<unknown> {
    return request.del<unknown>('/config/reset')
  },
  /** 重新加载配置 */
  reload(): Promise<unknown> {
    return request.post<unknown>('/config/reload')
  },
}
