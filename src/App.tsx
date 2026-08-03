/**
 * 应用根组件：ConfigProvider（中文 zhCN）+ RouterProvider
 */
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { RouterProvider } from 'react-router-dom'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import { router } from '@/router'

dayjs.locale('zh-cn')

export default function App() {
  return (
    <ConfigProvider locale={zhCN} theme={{ token: { colorPrimary: '#1677ff' } }}>
      <RouterProvider router={router} />
    </ConfigProvider>
  )
}
