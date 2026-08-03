/**
 * Blob 下载工具：在浏览器端触发文件保存
 */

/** 将 Blob 以指定文件名保存（兼容 URL.createObjectURL 与 msSaveBlob） */
export function downloadBlob(blob: Blob, filename: string): void {
  if (typeof window === 'undefined') return
  // IE/Edge 旧版兼容
  const nav = window.navigator as Navigator & {
    msSaveBlob?: (b: Blob, name: string) => boolean
  }
  if (typeof nav.msSaveBlob === 'function') {
    nav.msSaveBlob(blob, filename)
    return
  }
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  // 释放 URL，避免内存泄漏
  window.URL.revokeObjectURL(url)
}
