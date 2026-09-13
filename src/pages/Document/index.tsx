/**
 * 文档工作区页面
 * - 左侧 300px DocumentTree，右侧 Flex 自适应编辑区
 * - 选中文档后加载完整内容到 Milkdown 编辑器
 * - 手动保存：点击「保存」按钮或 Ctrl+S 保存标题 + 正文
 * - 支持导出当前文档、删除文档
 * - 未选中文档时右侧显示 Empty 占位
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactElement } from 'react'
import { Layout, Input, Button, Spin, Empty, Typography, message, Modal, Tooltip } from 'antd'
import {
  ExportOutlined,
  DeleteOutlined,
  EyeOutlined,
  SaveOutlined,
} from '@ant-design/icons'
import DocumentTree from '@/components/DocumentTree'
import MilkdownEditor from '@/components/MilkdownEditor'
import { articleService } from '@/services/article.service'
import type { Article } from '@/types'
import { formatTime, countWords } from '@/utils/format'
import { downloadBlob } from '@/utils/download'

const { Sider, Content } = Layout

export default function Document(): ReactElement {
  // 当前选中文档（完整，含 content）
  const [currentArticle, setCurrentArticle] = useState<Article | null>(null)
  const [loadingArticle, setLoadingArticle] = useState(false)
  // 编辑器内容
  const [editorValue, setEditorValue] = useState('')
  // 标题
  const [title, setTitle] = useState('')
  // 是否有未保存改动
  const [dirty, setDirty] = useState(false)
  // 保存中
  const [saving, setSaving] = useState(false)
  // 树刷新 key
  const [treeRefreshKey, setTreeRefreshKey] = useState(0)

  // 最近一次已保存的内容，用于判断是否需要保存
  const lastSavedContentRef = useRef<string>('')
  // 标记刚加载完成，用于跳过编辑器首次回声触发的 dirty
  const justLoadedRef = useRef<boolean>(false)

  /** 选中文档（来自文档树点击） */
  const handleSelectArticle = useCallback(async (article: Article) => {
    setLoadingArticle(true)
    justLoadedRef.current = true
    try {
      const full = await articleService.getById(article._id)
      setCurrentArticle(full)
      setTitle(full.title)
      setEditorValue(full.content ?? '')
      lastSavedContentRef.current = full.content ?? ''
      setDirty(false)
    } catch {
      // 加载失败：仍使用基本信息占位
      setCurrentArticle(article)
      setTitle(article.title)
      setEditorValue(article.content ?? '')
      lastSavedContentRef.current = article.content ?? ''
      setDirty(false)
    } finally {
      setLoadingArticle(false)
    }
  }, [])

  /** 编辑器内容变化回调（跳过加载回声） */
  const handleEditorChange = useCallback((md: string) => {
    if (justLoadedRef.current) {
      // 首次回声：同步规范化后的内容，不触发 dirty
      justLoadedRef.current = false
      lastSavedContentRef.current = md
      setEditorValue(md)
      return
    }
    setEditorValue(md)
    setDirty(true)
  }, [])

  /** 标题变化 */
  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value)
    setDirty(true)
  }, [])

  /** 手动保存标题 + 正文 */
  const handleSave = useCallback(async () => {
    if (!currentArticle || !dirty || saving) return
    const trimmed = title.trim()
    if (!trimmed) {
      message.warning('标题不能为空')
      return
    }
    try {
      setSaving(true)
      const updated = await articleService.update(currentArticle._id, {
        title: trimmed,
        content: editorValue,
      })
      setCurrentArticle({ ...currentArticle, ...updated })
      lastSavedContentRef.current = editorValue
      setDirty(false)
      message.success('已保存')
    } catch {
      // 错误已由请求拦截器提示
    } finally {
      setSaving(false)
    }
  }, [currentArticle, dirty, saving, title, editorValue])

  // Ctrl+S / Cmd+S 快捷保存
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        void handleSave()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleSave])

  /** 导出当前文档 */
  const handleExport = async () => {
    if (!currentArticle) return
    try {
      const blob = await articleService.exportOne(currentArticle._id)
      const safeName = (currentArticle.title || 'document').replace(/[\\/:*?"<>|]/g, '_')
      downloadBlob(blob, `${safeName}.md`)
      message.success('已开始导出')
    } catch {
      // 错误已提示
    }
  }

  /** 删除当前文档（软删除） */
  const handleDelete = () => {
    if (!currentArticle) return
    Modal.confirm({
      title: '删除文档',
      content: `确定删除文档「${currentArticle.title}」吗？删除后可在回收站恢复。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await articleService.remove(currentArticle._id)
          message.success('文档已删除')
          setCurrentArticle(null)
          setEditorValue('')
          setTitle('')
          setDirty(false)
          lastSavedContentRef.current = ''
          setTreeRefreshKey((k) => k + 1)
        } catch {
          // 错误已提示
        }
      },
    })
  }

  return (
    <Layout style={{ minHeight: 'calc(100vh - 64px)', height: 'calc(100vh - 64px)' }}>
      <Sider
        width={300}
        theme="light"
        style={{
          borderRight: '1px solid #f0f0f0',
          padding: 12,
          overflow: 'auto',
          background: '#fff',
        }}
      >
        <DocumentTree
          selectedArticleId={currentArticle?._id}
          onSelectArticle={handleSelectArticle}
          refreshKey={treeRefreshKey}
        />
      </Sider>
      <Content style={{ padding: 16, overflow: 'auto', background: '#f5f5f5' }}>
        {loadingArticle ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Spin tip="加载文档中..." size="large" />
          </div>
        ) : currentArticle ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              background: '#fff',
              borderRadius: 8,
              padding: 16,
            }}
          >
            {/* 顶部：标题 + 操作 */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
                <Input
                  value={title}
                  onChange={handleTitleChange}
                  placeholder="文档标题"
                  size="large"
                  style={{ fontWeight: 600, flex: 1, minWidth: 0 }}
                />
                <Tooltip title="Ctrl+S">
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    onClick={() => void handleSave()}
                    loading={saving}
                    disabled={!dirty}
                  >
                    保存
                  </Button>
                </Tooltip>
                <Button icon={<ExportOutlined />} onClick={handleExport}>
                  导出
                </Button>
                <Button danger icon={<DeleteOutlined />} onClick={handleDelete}>
                  删除
                </Button>
              </div>
              {/* 文档元信息 */}
              <div style={{ marginTop: 8 }}>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  创建：{formatTime(currentArticle.created)} | 更新：
                  {formatTime(currentArticle.modified)} | 阅读量：{currentArticle.views ?? 0} | 字数：{countWords(editorValue)}
                  {dirty ? <Typography.Text type="warning" style={{ marginLeft: 8 }}>未保存</Typography.Text> : null}
                </Typography.Text>
              </div>
            </div>

            {/* 编辑器区域 */}
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <MilkdownEditor value={editorValue} onChange={handleEditorChange} />
            </div>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
            }}
          >
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="请选择或新建文档"
            >
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                <EyeOutlined style={{ marginRight: 4 }} />
                从左侧文档树选择文档，或点击「新建文档」开始
              </Typography.Text>
            </Empty>
          </div>
        )}
      </Content>
    </Layout>
  )
}

