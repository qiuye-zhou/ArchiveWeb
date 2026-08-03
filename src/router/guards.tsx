/**
 * 路由守卫组件
 */
import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuthStore } from '@/store/useAuthStore'

/** 受保护路由守卫：未登录跳 /login，并记录来源路径 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const token = useAuthStore((s) => s.token)
  const location = useLocation()
  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <>{children}</>
}

/** 已登录则重定向到首页 */
export function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const token = useAuthStore((s) => s.token)
  if (token) {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}
