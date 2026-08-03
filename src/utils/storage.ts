/**
 * localStorage 封装：带命名前缀，避免与其他应用冲突
 */

const PREFIX = 'archive-web:'

export const storage = {
  /** 读取并 JSON 解析，失败或不存在返回 defaultValue */
  get<T>(key: string, defaultValue?: T): T | undefined {
    const raw = localStorage.getItem(PREFIX + key)
    if (raw === null) return defaultValue
    try {
      return JSON.parse(raw) as T
    } catch {
      return defaultValue
    }
  },

  /** JSON 序列化后写入 */
  set<T>(key: string, value: T): void {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  },

  /** 移除指定键 */
  remove(key: string): void {
    localStorage.removeItem(PREFIX + key)
  },

  /** 清空本应用前缀下的所有键 */
  clear(): void {
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(PREFIX)) keys.push(k)
    }
    keys.forEach((k) => localStorage.removeItem(k))
  },
}
