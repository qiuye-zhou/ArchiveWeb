/**
 * 备份服务
 */
import { request } from './request'
import type { BackupItem } from '@/types'

export const backupService = {
  /** 立即创建备份（下载 zip，返回 Blob） */
  new(): Promise<Blob> {
    return request.download('/backup/new')
  },
  /** 备份列表 */
  list(): Promise<BackupItem[]> {
    return request.get<BackupItem[]>('/backup/all')
  },
  /** 下载指定备份 */
  download(filename: string): Promise<Blob> {
    return request.download(`/backup/${encodeURIComponent(filename)}`)
  },
  /** 上传备份文件（字段名 file） */
  uploadBackup(file: File): Promise<unknown> {
    return request.upload<unknown>('/backup/uploadbackup', file)
  },
  /** 从备份恢复（restoreFilePath 传备份文件名） */
  restore(filename: string): Promise<unknown> {
    return request.post<unknown>('/backup/restore', { restoreFilePath: filename })
  },
  /** 删除全部备份 */
  deleteAll(): Promise<void> {
    return request.del<void>('/backup/all')
  },
  /** 删除指定备份 */
  deleteOne(filename: string): Promise<void> {
    return request.del<void>(`/backup/${encodeURIComponent(filename)}`)
  },
}
