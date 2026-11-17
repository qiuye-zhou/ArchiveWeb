/**
 * 应用根组件：ConfigProvider（中文 zhCN）+ RouterProvider
 * - 启动时先用 /user/profile 校验本地 token，校验通过后才渲染路由
 * - 避免刷新后先展示受保护页面、直到切换页面才跳登录的问题
 */
import { useEffect, useState } from 'react'
import { ConfigProvider, Spin } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { RouterProvider } from 'react-router-dom'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import { router } from '@/router'
import { useAuthStore } from '@/store/useAuthStore'

dayjs.locale('zh-cn')

export default function App() {
  const token = useAuthStore((s) => s.token)
  const fetchProfile = useAuthStore((s) => s.fetchProfile)
  // 有 token 时需先完成鉴权校验，才允许渲染路由
  const [ready, setReady] = useState(!token)

  useEffect(() => {
    if (!token) {
      setReady(true)
      return
    }
    let alive = true
    // 校验失败（401）由响应拦截器统一清除登录态并跳转登录页
    fetchProfile()
      .catch(() => {
        /* 错误已在拦截器处理 */
      })
      .finally(() => {
        if (alive) setReady(true)
      })
    return () => {
      alive = false
    }
  }, [token, fetchProfile])

  return (
    <ConfigProvider locale={zhCN} theme={{ token: { colorPrimary: '#1677ff' } }}>
      {ready ? (
        <RouterProvider router={router} />
      ) : (
        <div
          style={{
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Spin size="large" tip="正在验证登录状态..." />
        </div>
      )}
    </ConfigProvider>
  )
}
