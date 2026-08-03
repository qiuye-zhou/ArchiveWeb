/**
 * 首次初始化引导页
 * - 表单：username / name / password / 确认密码
 * - 提交 POST /init/，成功后保存 token 并跳 /
 */
import { Card, Form, Input, Button, message, Typography } from 'antd'
import { useNavigate } from 'react-router-dom'
import { initService } from '@/services/init.service'
import { useAuthStore } from '@/store/useAuthStore'
import type { InitParams } from '@/types'

interface InitFormValues extends InitParams {
  confirm: string
}

export default function Init() {
  const navigate = useNavigate()
  const setToken = useAuthStore((s) => s.setToken)
  const fetchProfile = useAuthStore((s) => s.fetchProfile)

  const onFinish = async (values: InitFormValues) => {
    if (values.password !== values.confirm) {
      message.error('两次输入的密码不一致')
      return
    }
    // 显式构造 payload，剔除 confirm 字段
    const payload: InitParams = {
      username: values.username,
      name: values.name,
      password: values.password,
      introduce: values.introduce,
      avatar: values.avatar,
      config: values.config,
    }
    try {
      const result = await initService.init(payload)
      setToken(result.token)
      // 拉取用户资料以补全 user 信息（失败不阻塞）
      try {
        await fetchProfile()
      } catch {
        /* profile 获取失败忽略 */
      }
      message.success('初始化成功')
      navigate('/', { replace: true })
    } catch (e) {
      const msg = e instanceof Error ? e.message : '初始化失败'
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
      <Card style={{ width: 460 }}>
        <Typography.Title level={3} style={{ textAlign: 'center', marginBottom: 8 }}>
          系统初始化
        </Typography.Title>
        <Typography.Paragraph type="secondary" style={{ textAlign: 'center', marginBottom: 24 }}>
          首次使用，请创建管理员账号
        </Typography.Paragraph>
        <Form<InitFormValues> name="init" onFinish={onFinish} size="large" layout="vertical">
          <Form.Item
            name="username"
            label="登录用户名"
            rules={[{ required: true, message: '请输入登录用户名' }]}
          >
            <Input placeholder="用于登录的用户名" />
          </Form.Item>
          <Form.Item name="name" label="昵称" rules={[{ required: true, message: '请输入昵称' }]}>
            <Input placeholder="显示昵称" />
          </Form.Item>
          <Form.Item
            name="password"
            label="密码"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password placeholder="密码" />
          </Form.Item>
          <Form.Item
            name="confirm"
            label="确认密码"
            rules={[{ required: true, message: '请再次输入密码' }]}
          >
            <Input.Password placeholder="确认密码" />
          </Form.Item>
          <Form.Item name="introduce" label="简介（可选）">
            <Input.TextArea placeholder="一句话介绍" rows={2} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              完成初始化
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
