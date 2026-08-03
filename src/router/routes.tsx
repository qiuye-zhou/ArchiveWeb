/**
 * 路由配置
 * - /login 登录页（已登录重定向 /）
 * - /init 初始化引导页
 * - / 主布局（需登录），子路由：document/analyze/backup/logs/settings
 * - * 404
 */
import { Navigate, type RouteObject } from 'react-router-dom'
import BasicLayout from '@/components/Layout/BasicLayout'
import Login from '@/pages/Login'
import Init from '@/pages/Init'
import Document from '@/pages/Document'
import Analyze from '@/pages/Analyze'
import Backup from '@/pages/Backup'
import Logs from '@/pages/Logs'
import Settings from '@/pages/Settings'
import NotFound from '@/pages/NotFound'
import { RequireAuth, RedirectIfAuthed } from './guards'

export const routes: RouteObject[] = [
  {
    path: '/login',
    element: (
      <RedirectIfAuthed>
        <Login />
      </RedirectIfAuthed>
    ),
  },
  { path: '/init', element: <Init /> },
  {
    path: '/',
    element: (
      <RequireAuth>
        <BasicLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/document" replace /> },
      { path: 'document', element: <Document /> },
      { path: 'analyze', element: <Analyze /> },
      { path: 'backup', element: <Backup /> },
      { path: 'logs', element: <Logs /> },
      { path: 'settings', element: <Settings /> },
    ],
  },
  { path: '*', element: <NotFound /> },
]
