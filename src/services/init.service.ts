/**
 * 系统初始化引导服务
 */
import { request } from './request'
import type { InitParams, InitResult, InitStatus } from '@/types'

export const initService = {
  /** 检查是否已初始化 */
  checkInit(): Promise<InitStatus> {
    return request.get<InitStatus>('/init/')
  },
  /** 获取初始化状态（同义接口） */
  status(): Promise<InitStatus> {
    return request.get<InitStatus>('/init/status')
  },
  /** 执行初始化 */
  init(data: InitParams): Promise<InitResult> {
    return request.post<InitResult>('/init/', data)
  },
}
