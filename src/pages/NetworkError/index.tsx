/**
 * 网络错误页（独立路由 /network-error）
 * - 后端接口不通（断网 / 超时 / 502 / 503 / 504）时由请求拦截器硬跳转至此
 * - 错误信息从 sessionStorage 读取，刷新不丢失
 * - 进入页面时自动尝试连接后端，成功则跳回来源页，失败则停留
 */
import { useEffect, useState } from 'react'
import { Result, Button, Typography, Spin } from 'antd'
import { request } from '@/services/request'

const STORAGE_KEY = 'archive-web-network-error'

interface NetworkErrorInfo {
  message: string
  from: string
}

function readError(): NetworkErrorInfo {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as NetworkErrorInfo
  } catch {
    /* ignore */
  }
  return { message: '无法连接到服务器', from: '/' }
}

function clearError() {
  sessionStorage.removeItem(STORAGE_KEY)
}

export default function NetworkError() {
  const info = readError()
  const [checking, setChecking] = useState(false)

  /** 探测后端是否恢复：成功则跳回来源页，失败则停留 */
  const probe = async () => {
    setChecking(true)
    try {
      // 用一个轻量请求探测后端是否可达
      await request.get('/article/all', { page: 1, pageSize: 1 })
      clearError()
      window.location.href = info.from || '/'
    } catch {
      // 仍然不通，停留
    } finally {
      setChecking(false)
    }
  }

  // 进入页面时自动探测一次
  useEffect(() => {
    void probe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f5f5f5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Result
        status="error"
        title="网络错误"
        subTitle={info.message || '无法连接到服务器，请检查后端服务是否已启动'}
        extra={
          <>
            <Button type="primary" onClick={probe} loading={checking}>
              重新连接
            </Button>
            <Typography.Paragraph type="secondary" style={{ marginTop: 16, fontSize: 12 }}>
              如多次重试仍无法连接，请确认后端服务是否已启动
            </Typography.Paragraph>
            {checking ? <Spin style={{ marginTop: 12 }} /> : null}
          </>
        }
      />
    </div>
  )
}
