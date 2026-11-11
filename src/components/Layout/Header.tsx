/**
 * 顶部导航：logo + 横向菜单 + 用户下拉菜单
 */
import { useMemo } from 'react'
import { Layout, Menu, Dropdown, Avatar, Space, type MenuProps } from 'antd'
import { UserOutlined, LogoutOutlined, SettingOutlined } from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'

/** 顶部导航项配置；adminOnly 的项仅管理员可见 */
const NAV_CONFIG: Array<{ key: string; label: string; adminOnly?: boolean }> = [
  { key: '/document', label: '文档' },
  { key: '/recycle', label: '回收站', adminOnly: true },
  { key: '/analyze', label: '数据分析' },
  { key: '/backup', label: '备份', adminOnly: true },
  { key: '/logs', label: '日志' },
  { key: '/settings', label: '设置', adminOnly: true },
]

export default function Header() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  // 历史账号无 role 字段，视为管理员
  const isAdmin = user?.role !== 'editor'

  // 顶部导航项（按角色过滤）
  const navItems: MenuProps['items'] = useMemo(
    () =>
      NAV_CONFIG.filter((item) => !item.adminOnly || isAdmin).map((item) => ({
        key: item.key,
        label: item.label,
        onClick: () => navigate(item.key),
      })),
    [navigate, isAdmin],
  )

  // 根据一级路径高亮菜单
  const selectedKey = '/' + (location.pathname.split('/')[1] ?? '')

  // 用户下拉菜单（个人设置指向 /settings，仅管理员可见）
  const userItems: MenuProps['items'] = [
    ...(isAdmin
      ? [
          {
            key: 'profile',
            icon: <SettingOutlined />,
            label: '个人设置',
            onClick: () => navigate('/settings'),
          },
          { type: 'divider' as const },
        ]
      : []),
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: async () => {
        await logout()
        navigate('/login', { replace: true })
      },
    },
  ]

  return (
    <Layout.Header style={{ display: 'flex', alignItems: 'center', padding: '0 24px' }}>
      <div
        style={{
          color: '#fff',
          fontWeight: 700,
          fontSize: 18,
          marginRight: 32,
          whiteSpace: 'nowrap',
        }}
      >
        ArchiveDoc
      </div>
      <Menu
        theme="dark"
        mode="horizontal"
        selectedKeys={[selectedKey]}
        items={navItems}
        style={{ flex: 1, minWidth: 0 }}
      />
      <Dropdown menu={{ items: userItems }} placement="bottomRight">
        <Space style={{ cursor: 'pointer', color: '#fff', marginLeft: 16 }}>
          <Avatar size="small" src={user?.avatar} icon={<UserOutlined />} />
          <span>{user?.name || user?.username || '用户'}</span>
        </Space>
      </Dropdown>
    </Layout.Header>
  )
}
