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


/**
 * 统计文本字数
 * - 中文：按字符计（每个汉字/标点算 1 字）
 * - 英文/数字：连续字母数字组合算 1 词，单个也算 1
 * - 忽略空白字符（空格、制表符、换行）
 * - 忽略 Markdown 语法符号（# * - > ` 等），只统计可见内容
 *
 * @param text 原始文本（markdown 字符串）
 * @returns 字数
 */
export function countWords(text?: string | null): number {
  if (!text) return 0
  // 去除 markdown 语法：代码块、行内代码、链接、图片、标题符号、列表符号、引用、粗体斜体删除线、水平线
  let cleaned = text
    // 代码块 ```...```
    .replace(/```[\s\S]*?```/g, '')
    // 行内代码 `...`
    .replace(/`[^`]*`/g, '')
    // 图片 ![alt](url) 和 链接 [text](url) -> 保留 text
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    // 标题符号 #
    .replace(/^#{1,6}\s+/gm, '')
    // 列表符号 - * + 数字.
    .replace(/^[\s]*([-*+]|\d+\.)\s+/gm, '')
    // 引用符号 >
    .replace(/^>\s?/gm, '')
    // 粗体/斜体/删除线标记 ** * __ _ ~~
    .replace(/(\*\*|__|\*|_|~~)/g, '')
    // 水平线 --- *** ___
    .replace(/^[-*_]{3,}$/gm, '')
    // 表格分隔线 |---|
    .replace(/^\|?[\s:|-]+\|?$/gm, '')

  // 去除所有空白后统计字符数（中英文混排时每个非空白字符算 1 字）
  return cleaned.replace(/\s/g, '').length
}
