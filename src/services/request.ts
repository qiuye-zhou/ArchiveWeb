/**
 * axios 实例与统一请求封装
 * - baseURL: /api（由 vite proxy 转发到后端 127.0.0.1:3666）
 * - 请求拦截：注入 Authorization Bearer token
 * - 响应拦截：统一解包 { code, message, data }；401 清除登录态并跳转登录
 *
 * 说明：axios 1.19 的泛型返回类型（AxiosResponseResult）不再能通过 <T,T> 直接收窄为 T，
 * 故各方法对返回值做 `as unknown as Promise<T>` 转型；运行时由响应拦截器返回解包后的 data。
 */
import axios, { type AxiosRequestConfig, type AxiosProgressEvent } from 'axios'
import { message } from 'antd'
import type { ApiResponse } from '@/types'
import { useAuthStore } from '@/store/useAuthStore'

const service = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

// 请求拦截：注入 token
service.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

// 响应拦截：统一解包与错误处理
service.interceptors.response.use(
  (response) => {
    const data = response.data
    // 后端统一包装 { code, message, data }
    if (data && typeof data === 'object' && !(data instanceof Blob) && 'code' in data) {
      const res = data as ApiResponse<unknown>
      // 约定 code 为 0 或 200 表示成功
      if (res.code === 0 || res.code === 200) {
        return res.data
      }
      message.error(res.message || '请求失败')
      return Promise.reject(new Error(res.message || '请求失败'))
    }
    // 二进制或非标准结构直接返回
    return data
  },
  (error) => {
    const status = error?.response?.status
    if (status === 401) {
      // 401：清除登录态并跳转登录页（避免再次调用 logout 接口导致递归）
      useAuthStore.setState({ token: null, user: null })
      message.error('登录已过期，请重新登录')
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
      return Promise.reject(error)
    }
    const msg = error?.response?.data?.message || error?.message || '网络错误'
    message.error(msg)
    return Promise.reject(error)
  },
)

type Params = Record<string, unknown> | undefined

export const request = {
  /** GET 请求 */
  get<T>(url: string, params?: Params, config?: AxiosRequestConfig): Promise<T> {
    return service.get(url, { params, ...config }) as unknown as Promise<T>
  },
  /** POST 请求 */
  post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return service.post(url, data, config) as unknown as Promise<T>
  },
  /** PATCH 请求 */
  patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return service.patch(url, data, config) as unknown as Promise<T>
  },
  /** DELETE 请求 */
  del<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return service.delete(url, config) as unknown as Promise<T>
  },
  /** 文件上传（默认字段名 file，可携带额外字段） */
  upload<T>(
    url: string,
    file: File,
    opts?: {
      field?: string
      extra?: Record<string, string>
      onUploadProgress?: (event: AxiosProgressEvent) => void
    },
  ): Promise<T> {
    const form = new FormData()
    form.append(opts?.field ?? 'file', file)
    if (opts?.extra) {
      Object.entries(opts.extra).forEach(([k, v]) => form.append(k, v))
    }
    return service.post(url, form, {
      onUploadProgress: opts?.onUploadProgress,
    }) as unknown as Promise<T>
  },
  /** 文件下载（返回 Blob，调用方自行触发保存） */
  download(url: string, config?: AxiosRequestConfig): Promise<Blob> {
    return service.get(url, { responseType: 'blob', ...config }) as unknown as Promise<Blob>
  },
}

export default service
