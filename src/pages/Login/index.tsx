/**
 * 登录页
 * - 提交调用 store.login，成功跳 /
 * - 进入时检查系统是否已初始化，未初始化跳 /init
 * - 默认填充占位账号 admin/admin 仅为方便
 */
import { useEffect } from 'react'
import { Card, Form, Input, Button, message, Typography } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import { initService } from '@/services/init.service'

interface LoginFormValues {
  username: string
  password: string
}

export default function Login() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)

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
    try {
      await login(values)
      message.success('登录成功')
      navigate('/', { replace: true })
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
          initialValues={{ username: 'admin', password: 'admin' }}
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
