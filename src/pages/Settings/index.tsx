/**
 * 设置页
 * - 站点配置：SEO（title / keywords / description）、URL（admin/server/web/ws）
 *   支持批量保存与按 key 重置
 * - 个人信息：name / username(只读) / mail / avatar / 新密码(可选)
 *   展示 lastLoginTime / lastLoginIp / createdTime
 */
import { useCallback, useEffect, useState } from 'react'
import {
  Typography,
  Card,
  Tabs,
  Form,
  Input,
  Button,
  Space,
  Select,
  Descriptions,
  Spin,
  message,
  Popconfirm,
  Table,
  Modal,
  Tag,
} from 'antd'
import {
  RedoOutlined,
  SaveOutlined,
  PlusOutlined,
  KeyOutlined,
} from '@ant-design/icons'
import { configService } from '@/services/config.service'
import { userService } from '@/services/user.service'
import { useAuthStore } from '@/store/useAuthStore'
import type {
  AdminUserItem,
  CreateUserParams,
  SiteConfig,
  UserProfile,
  ConfigKey,
} from '@/types'
import { formatTime } from '@/utils/format'

/** URL 校验规则 */
const urlRule = { type: 'url' as const, message: '请输入合法的 URL' }

export default function Settings() {
  const role = useAuthStore((s) => s.user?.role)
  const isAdmin = role !== 'editor'
  const items = [
    { key: 'site', label: '站点配置', children: <SiteConfigPanel /> },
    { key: 'profile', label: '个人信息', children: <ProfilePanel /> },
  ]
  if (isAdmin) {
    items.push({ key: 'users', label: '用户管理', children: <UserManagePanel /> })
  }
  return (
    <div style={{ padding: 24 }}>
      <Typography.Title level={3}>设置</Typography.Title>
      <Card>
        <Tabs items={items} />
      </Card>
    </div>
  )
}

/** 用户管理面板（仅管理员可见）：列表 / 新建 / 删除 / 重置密码 */
function UserManagePanel() {
  const [users, setUsers] = useState<AdminUserItem[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [resetTarget, setResetTarget] = useState<AdminUserItem | null>(null)
  const [resetting, setResetting] = useState(false)
  const [createForm] = Form.useForm<CreateUserParams>()
  const [resetForm] = Form.useForm<{ password: string }>()
  const currentUserId = useAuthStore((s) => s.user?.id)

  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      const list = await userService.listAll()
      setUsers(list)
    } catch {
      // 拦截器已报错
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadUsers()
  }, [loadUsers])

  const handleCreate = useCallback(async () => {
    try {
      const values = await createForm.validateFields()
      setCreating(true)
      await userService.createUser(values)
      message.success('用户已创建')
      setCreateOpen(false)
      createForm.resetFields()
      await loadUsers()
    } catch {
      // 校验失败或接口错误，拦截器已处理
    } finally {
      setCreating(false)
    }
  }, [createForm, loadUsers])

  const handleDelete = useCallback(
    async (user: AdminUserItem) => {
      try {
        await userService.deleteUser(user.id)
        message.success(`已删除用户 ${user.username}`)
        await loadUsers()
      } catch {
        // 拦截器已报错
      }
    },
    [loadUsers],
  )

  const handleResetPassword = useCallback(async () => {
    if (!resetTarget) return
    try {
      const { password } = await resetForm.validateFields()
      setResetting(true)
      await userService.resetPassword(resetTarget.id, password)
      message.success(`已重置 ${resetTarget.username} 的密码`)
      setResetTarget(null)
      resetForm.resetFields()
    } catch {
      // 校验失败或接口错误，拦截器已处理
    } finally {
      setResetting(false)
    }
  }, [resetTarget, resetForm])

  return (
    <Spin spinning={loading}>
      <div style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setCreateOpen(true)}
        >
          新建用户
        </Button>
      </div>
      <Table<AdminUserItem>
        rowKey="id"
        dataSource={users}
        pagination={false}
        size="middle"
        columns={[
          { title: '用户名', dataIndex: 'username' },
          { title: '昵称', dataIndex: 'name' },
          {
            title: '角色',
            dataIndex: 'role',
            render: (role: string) =>
              role === 'admin' ? (
                <Tag color="gold">管理员</Tag>
              ) : (
                <Tag>协作者</Tag>
              ),
          },
          {
            title: '最近登录',
            dataIndex: 'lastLoginTime',
            render: (v: AdminUserItem['lastLoginTime']) => formatTime(v),
          },
          {
            title: '操作',
            key: 'actions',
            width: 220,
            render: (_, record) => (
              <Space size={4}>
                <Button
                  size="small"
                  type="link"
                  icon={<KeyOutlined />}
                  onClick={() => setResetTarget(record)}
                >
                  重置密码
                </Button>
                {record.id !== currentUserId ? (
                  <Popconfirm
                    title={`确认删除用户 ${record.username}？`}
                    okText="删除"
                    cancelText="取消"
                    onConfirm={() => void handleDelete(record)}
                  >
                    <Button size="small" type="link" danger>
                      删除
                    </Button>
                  </Popconfirm>
                ) : (
                  <Tag color="blue">当前账号</Tag>
                )}
              </Space>
            ),
          },
        ]}
      />

      {/* 新建用户 */}
      <Modal
        title="新建用户"
        open={createOpen}
        onOk={() => void handleCreate()}
        onCancel={() => setCreateOpen(false)}
        confirmLoading={creating}
        okText="创建"
        cancelText="取消"
        destroyOnHidden
      >
        <Form form={createForm} layout="vertical" preserve={false}>
          <Form.Item
            label="用户名"
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input placeholder="登录用户名" autoComplete="off" />
          </Form.Item>
          <Form.Item label="昵称" name="name">
            <Input placeholder="展示名称，默认同用户名" />
          </Form.Item>
          <Form.Item
            label="密码"
            name="password"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码至少 6 位' },
            ]}
          >
            <Input.Password placeholder="至少 6 位" autoComplete="new-password" />
          </Form.Item>
          <Form.Item label="角色" name="role" initialValue="editor">
            <Select
              options={[
                { value: 'editor', label: '协作者（可编辑文档）' },
                { value: 'admin', label: '管理员（可管理用户）' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 重置密码 */}
      <Modal
        title={`重置密码：${resetTarget?.username ?? ''}`}
        open={!!resetTarget}
        onOk={() => void handleResetPassword()}
        onCancel={() => setResetTarget(null)}
        confirmLoading={resetting}
        okText="重置"
        cancelText="取消"
        destroyOnHidden
      >
        <Form form={resetForm} layout="vertical" preserve={false}>
          <Form.Item
            label="新密码"
            name="password"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码至少 6 位' },
            ]}
          >
            <Input.Password placeholder="至少 6 位" autoComplete="new-password" />
          </Form.Item>
        </Form>
      </Modal>
    </Spin>
  )
}

/** 站点配置面板 */
function SiteConfigPanel() {
  const [seoForm] = Form.useForm<{ title: string; keywords: string[]; description: string }>()
  const [urlForm] = Form.useForm<{
    adminUrl: string
    serverUrl: string
    webUrl: string
    wsUrl: string
  }>()
  const [loading, setLoading] = useState<boolean>(true)
  const [saving, setSaving] = useState<boolean>(false)

  /** 加载配置并回填表单 */
  const loadConfig = useCallback(async () => {
    setLoading(true)
    try {
      const config: SiteConfig = await configService.getConfig()
      seoForm.setFieldsValue({
        title: config.seo?.title ?? '',
        keywords: config.seo?.keywords ?? [],
        description: config.seo?.description ?? '',
      })
      urlForm.setFieldsValue({
        serverUrl: config.url?.serverUrl ?? '',
        webUrl: config.url?.webUrl ?? '',
        wsUrl: config.url?.wsUrl ?? '',
      })
    } catch {
      // 拦截器已报错
    } finally {
      setLoading(false)
    }
  }, [seoForm, urlForm])

  useEffect(() => {
    void loadConfig()
  }, [loadConfig])

  /** 批量保存 SEO + URL */
  const handleSave = useCallback(async () => {
    try {
      const seo = await seoForm.validateFields()
      const url = await urlForm.validateFields()
      setSaving(true)
      await configService.batchUpdate({
        updates: [
          { key: 'seo', data: seo },
          { key: 'url', data: url },
        ],
      })
      message.success('配置已保存')
    } catch {
      // 校验失败或接口错误，拦截器已处理
    } finally {
      setSaving(false)
    }
  }, [seoForm, urlForm])

  /** 按 key 重置配置 */
  const handleReset = useCallback(
    async (key: ConfigKey) => {
      try {
        await configService.reset(key)
        message.success(`配置项 ${key} 已重置`)
        await loadConfig()
      } catch {
        // 拦截器已报错
      }
    },
    [loadConfig],
  )

  return (
    <Spin spinning={loading}>
      <Typography.Title level={5}>SEO 设置</Typography.Title>
      <Form form={seoForm} layout="vertical" preserve={false}>
        <Form.Item
          label="站点标题"
          name="title"
          rules={[{ required: true, message: '请输入站点标题' }]}
        >
          <Input placeholder="请输入站点标题" maxLength={100} />
        </Form.Item>
        <Form.Item label="关键字" name="keywords">
          <Select
            mode="tags"
            placeholder="输入关键字后回车，可多选"
            tokenSeparators={[',', ' ']}
            open={false}
          />
        </Form.Item>
        <Form.Item label="站点描述" name="description">
          <Input.TextArea rows={3} placeholder="请输入站点描述" maxLength={300} showCount />
        </Form.Item>
      </Form>

      <Typography.Title level={5} style={{ marginTop: 16 }}>
        URL 设置
      </Typography.Title>
      <Form form={urlForm} layout="vertical" preserve={false}>
        <Form.Item label="前端地址" name="webUrl" rules={[{ ...urlRule, required: false }]}>
          <Input placeholder="https://example.com" />
        </Form.Item>
        <Form.Item label="API 地址" name="serverUrl" rules={[{ ...urlRule, required: false }]}>
          <Input placeholder="https://api.example.com" />
        </Form.Item>
        <Form.Item label="Gateway 地址" name="wsUrl" rules={[{ ...urlRule, required: false }]}>
          <Input placeholder="wss://gateway.example.com" />
        </Form.Item>
      </Form>

      <Space style={{ marginTop: 8 }}>
        <Button
          type="primary"
          icon={<SaveOutlined />}
          loading={saving}
          onClick={() => void handleSave()}
        >
          保存配置
        </Button>
        <Popconfirm
          title="确认重置 SEO 配置？"
          okText="重置"
          cancelText="取消"
          onConfirm={() => void handleReset('seo')}
        >
          <Button icon={<RedoOutlined />}>重置 SEO</Button>
        </Popconfirm>
        <Popconfirm
          title="确认重置 URL 配置？"
          okText="重置"
          cancelText="取消"
          onConfirm={() => void handleReset('url')}
        >
          <Button icon={<RedoOutlined />}>重置 URL</Button>
        </Popconfirm>
        <Button onClick={() => void loadConfig()}>重新加载</Button>
      </Space>
    </Spin>
  )
}

/** 个人信息面板 */
function ProfilePanel() {
  const [form] = Form.useForm<{
    name: string
    username: string
    mail: string
    avatar: string
    password: string
  }>()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [saving, setSaving] = useState<boolean>(false)
  const fetchProfile = useAuthStore((s) => s.fetchProfile)

  /** 加载个人资料 */
  const loadProfile = useCallback(async () => {
    setLoading(true)
    try {
      const data = await userService.getProfile()
      setProfile(data)
      form.setFieldsValue({
        name: data.name ?? '',
        username: data.username ?? '',
        mail: data.mail ?? '',
        avatar: data.avatar ?? '',
        password: '',
      })
    } catch {
      // 拦截器已报错
    } finally {
      setLoading(false)
    }
  }, [form])

  useEffect(() => {
    void loadProfile()
  }, [loadProfile])

  /** 保存个人资料 */
  const handleSave = useCallback(async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)
      const payload: Record<string, string> = {
        name: values.name,
        mail: values.mail,
        avatar: values.avatar,
      }
      // 密码留空表示不修改
      if (values.password) {
        payload.password = values.password
      }
      await userService.update(payload)
      message.success('资料已更新')
      // 同步更新全局用户状态
      await fetchProfile()
      await loadProfile()
    } catch {
      // 拦截器已报错
    } finally {
      setSaving(false)
    }
  }, [form, fetchProfile, loadProfile])

  return (
    <Spin spinning={loading}>
      <Form form={form} layout="vertical" preserve={false} style={{ maxWidth: 560 }}>
        <Form.Item
          label="昵称"
          name="name"
          rules={[{ required: true, message: '请输入昵称' }]}
        >
          <Input placeholder="请输入昵称" />
        </Form.Item>
        <Form.Item label="用户名" name="username">
          <Input readOnly disabled />
        </Form.Item>
        <Form.Item
          label="邮箱"
          name="mail"
          rules={[
            { required: true, message: '请输入邮箱' },
            { type: 'email', message: '邮箱格式不正确' },
          ]}
        >
          <Input placeholder="user@example.com" />
        </Form.Item>
        <Form.Item
          label="头像 URL"
          name="avatar"
          rules={[{ ...urlRule, required: false }]}
        >
          <Input placeholder="https://example.com/avatar.png" />
        </Form.Item>
        <Form.Item
          label="新密码"
          name="password"
          rules={[{ min: 6, message: '密码至少 6 位' }]}
          extra="留空表示不修改密码"
        >
          <Input.Password placeholder="不修改请留空" autoComplete="new-password" />
        </Form.Item>
        <Form.Item>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={saving}
            onClick={() => void handleSave()}
          >
            保存资料
          </Button>
        </Form.Item>
      </Form>

      {profile ? (
        <Descriptions title="账号信息" bordered column={1} size="small">
          <Descriptions.Item label="注册时间">
            {formatTime(profile.createdTime)}
          </Descriptions.Item>
          <Descriptions.Item label="最近登录时间">
            {formatTime(profile.lastLoginTime)}
          </Descriptions.Item>
          <Descriptions.Item label="最近登录 IP">
            {profile.lastLoginIp || '-'}
          </Descriptions.Item>
        </Descriptions>
      ) : null}
    </Spin>
  )
}
