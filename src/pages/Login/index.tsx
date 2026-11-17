/**
 * 登录页
 * - 提交调用 store.login，成功跳 /
 * - 进入时检查系统是否已初始化，未初始化跳 /init
 * - 勾选「记住密码」时把账号密码保存在本地，下次自动填充
 */
import { useEffect, useMemo } from 'react'
import { Card, Form, Input, Button, message, Typography, Checkbox } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import { initService } from '@/services/init.service'

interface LoginFormValues {
  username: string
  password: string
  remember?: boolean
}

/** 记住密码的本地存储 key */
const REMEMBER_KEY = 'archive-web-login-remember'

/** 读取本地记住的账号密码（base64 编码，避免明文直接暴露在 localStorage） */
function readRemembered(): { username: string; password: string } | null {
  try {
    const raw = localStorage.getItem(REMEMBER_KEY)
    if (!raw) return null
    const parsed = JSON.parse(decodeURIComponent(atob(raw))) as {
      username?: string
      password?: string
    }
    if (!parsed?.username || !parsed?.password) return null
    return { username: parsed.username, password: parsed.password }
  } catch {
    return null
  }
}

/** 保存/清除记住的账号密码 */
function writeRemembered(values: { username: string; password: string } | null) {
  try {
    if (!values) {
      localStorage.removeItem(REMEMBER_KEY)
      return
    }
    localStorage.setItem(
      REMEMBER_KEY,
      btoa(encodeURIComponent(JSON.stringify(values))),
    )
  } catch {
    /* 存储失败不影响登录 */
  }
}

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const login = useAuthStore((s) => s.login)
  // 本地记住的账号密码，用于表单初始值
  const remembered = useMemo(() => readRemembered(), [])

  // 登录成功后的跳转目标：优先 URL 的 redirect 参数，其次路由守卫记录的来源路径
  const redirect =
    searchParams.get('redirect') ?? (location.state as { from?: string } | null)?.from ?? '/'
  // 只允许站内路径，避免开放重定向
  const target = redirect.startsWith('/') ? redirect : '/'

  // 检查系统是否已初始化
  useEffect(() => {
    initService
      .checkInit()
      .then((res) => {
        if (res && res.isInit === false) {
          message.warning('系统尚未初始化，即将跳转初始化页面')
          navigate('/init', { replace: true })
        }
      })
      .catch(() => {
        // 检查失败不阻塞登录流程
      })
  }, [navigate])

  const onFinish = async (values: LoginFormValues) => {
    const { remember, ...credentials } = values
    try {
      await login(credentials)
      // 勾选则保存，取消勾选则清除已保存的账号密码
      writeRemembered(remember ? credentials : null)
      message.success('登录成功')
      navigate(target, { replace: true })
    } catch (e) {
      const msg = e instanceof Error ? e.message : '登录失败'
      message.error(msg)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f0f2f5',
      }}
    >
      <Card style={{ width: 380 }}>
        <Typography.Title level={3} style={{ textAlign: 'center', marginBottom: 24 }}>
          ArchiveDoc 登录
        </Typography.Title>
        <Form
          name="login"
          initialValues={{
            username: remembered?.username ?? 'admin',
            password: remembered?.password ?? 'admin',
            remember: !!remembered,
          }}
          onFinish={onFinish}
          size="large"
        >
          <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input prefix={<UserOutlined />} placeholder="用户名" autoComplete="username" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
              autoComplete="current-password"
            />
          </Form.Item>
          <Form.Item name="remember" valuePropName="checked">
            <Checkbox>记住密码</Checkbox>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              登录
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
