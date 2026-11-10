/**
 * 路由守卫组件
 */
import { Navigate, useLocation, useSearchParams } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuthStore } from '@/store/useAuthStore'

/** 受保护路由守卫：未登录跳 /login，并记录来源路径（含查询参数，如分享链接跳转的文档） */
export function RequireAuth({ children }: { children: ReactNode }) {
  const token = useAuthStore((s) => s.token)
  const location = useLocation()
  if (!token) {
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    )
  }
  return <>{children}</>
}

/** 已登录则重定向到首页；带 redirect 参数时优先跳到目标页 */
export function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const token = useAuthStore((s) => s.token)
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect')
  if (token) {
    const target = redirect && redirect.startsWith('/') ? redirect : '/'
    return <Navigate to={target} replace />
  }
  return <>{children}</>
}
