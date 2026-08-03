/**
 * 格式化工具：时间、文件大小
 */
import dayjs from 'dayjs'

/** 格式化时间，无效值返回 '-' */
export function formatTime(
  value?: string | number | Date | null,
  fmt = 'YYYY-MM-DD HH:mm:ss',
): string {
  if (value === null || value === undefined || value === '') return '-'
  const d = dayjs(value)
  return d.isValid() ? d.format(fmt) : '-'
}

/** 格式化文件大小（字节 -> 自适应单位） */
export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes < 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = bytes
  let i = 0
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024
    i++
  }
  const fractionDigits = size >= 100 ? 0 : size >= 10 ? 1 : 2
  return `${size.toFixed(fractionDigits)} ${units[i]}`
}
