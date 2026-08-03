/**
 * 主布局：Header + Content(Outlet)
 * 说明：文档树 Sider 由 Document 页内部自管理，故主布局仅保留 Header 与 Content。
 */
import { Layout } from 'antd'
import { Outlet } from 'react-router-dom'
import Header from './Header'

const { Content } = Layout

export default function BasicLayout() {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header />
      <Content>
        <Outlet />
      </Content>
    </Layout>
  )
}
