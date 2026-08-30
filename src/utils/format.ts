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

/** 格式化文件大小（字节 -> 自适应单位）
 *  对后端可能返回的 string / null / undefined / NaN / BigInt 等做统一兜底，避免 toFixed 非函数异常。
 */
export function formatFileSize(bytes?: unknown): string {
  // 空值、非法值直接返回占位
  if (bytes === null || bytes === undefined || bytes === '') return '-'
  // 强制转 number（string -> 数字, BigInt -> number, boolean -> 0/1 等）
  const n = Number(bytes)
  if (!Number.isFinite(n) || n < 0) {
    if (n < 0) return '0 B'
    return '-'
  }
  if (n === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = n
  let i = 0
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024
    i++
  }
  const fractionDigits = size >= 100 ? 0 : size >= 10 ? 1 : 2
  return `${size.toFixed(fractionDigits)} ${units[i]}`
}

