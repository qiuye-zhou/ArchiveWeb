/**
 * 文档分享页（免登录）
 * - 路由 /share/:id，持有链接的人可直接只读查看
 * - 复用 MilkdownEditor 只读模式并隐藏工具栏，纯阅读展示
 */
import { useEffect, useState } from 'react'
import type { ReactElement } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Result, Spin } from 'antd'
import { EditOutlined } from '@ant-design/icons'
import MilkdownEditor from '@/components/MilkdownEditor'
import DocumentOutline from '@/components/DocumentOutline'
import { articleService } from '@/services/article.service'
import { useAuthStore } from '@/store/useAuthStore'
import type { Article } from '@/types'
import { countWords, formatTime } from '@/utils/format'

export default function Share(): ReactElement {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)
  const [article, setArticle] = useState<Article | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  // 窗口足够宽时在右侧显示目录；窄屏隐藏，避免挤压正文
  const [wide, setWide] = useState(() => window.innerWidth >= 1180)

  useEffect(() => {
    const onResize = () => setWide(window.innerWidth >= 1180)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (!id) {
      setLoading(false)
      setFailed(true)
      return
    }
    let cancelled = false
    setLoading(true)
    setFailed(false)
    articleService
      .getById(id)
      .then((data) => {
        if (!cancelled) setArticle(data)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  /** 进入正常编辑界面：已登录直接跳转，未登录先登录再回到该文档 */
  const handleEdit = () => {
    if (!id) return
    const target = `/document?article=${id}&edit=1`
    if (token) {
      navigate(target)
      return
    }
    navigate(`/login?redirect=${encodeURIComponent(target)}`)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Spin size="large" tip="加载文档中..." />
      </div>
    )
  }

  if (failed || !article) {
    return (
      <Result
        status="404"
        title="文档不存在或链接已失效"
        subTitle="该文档可能已被删除，请向分享者确认链接是否正确"
        extra={
          <Button type="primary" onClick={() => (window.location.href = '/')}>
            返回首页
          </Button>
        }
      />
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', padding: '32px 16px' }}>
      <div
        style={{
          maxWidth: 1180,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 24,
        }}
      >
        <div
          style={{
            flex: 1,
            minWidth: 0,
            background: '#fff',
            borderRadius: 8,
            padding: 32,
          }}
        >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, lineHeight: 1.4 }}>
              {article.title}
            </h1>
            <div style={{ margin: '8px 0 0', color: 'rgba(0, 0, 0, 0.45)', fontSize: 12 }}>
              更新：{formatTime(article.modified)} | 字数:{countWords(article.content)}
            </div>
          </div>
          <Button icon={<EditOutlined />} onClick={handleEdit} style={{ flexShrink: 0 }}>
            {token ? '进入编辑' : '登录后编辑'}
          </Button>
        </div>
        <div style={{ margin: '20px 0 0' }}>
          <MilkdownEditor value={article.content ?? ''} onChange={() => {}} readonly hideToolbar />
        </div>
        </div>
        {wide ? (
          <div style={{ width: 200, flexShrink: 0, position: 'sticky', top: 32 }}>
            <DocumentOutline />
          </div>
        ) : null}
      </div>
    </div>
  )
}
