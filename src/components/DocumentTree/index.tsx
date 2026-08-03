/**
 * 文档树组件
 * - 左侧文件夹树（categoryService.tree()），支持展开/选中
 * - 顶部工具栏：新建文件夹 / 新建文档 / 导入 Markdown / 导出全部 / 刷新
 * - 文件夹右键菜单：重命名 / 删除 / 新建子文件夹 / 新建文档
 * - 选中文件夹后展示其下文档列表，点击文档回调父级加载编辑器
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactElement } from 'react'
import {
  Tree,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Upload,
  message,
  Dropdown,
  Space,
  List,
  Spin,
  Typography,
  Empty,
  type MenuProps,
} from 'antd'
import type { TreeDataNode } from 'antd'
import {
  FolderAddOutlined,
  FileAddOutlined,
  ImportOutlined,
  ExportOutlined,
  ReloadOutlined,
  FolderOutlined,
  MoreOutlined,
  FileTextOutlined,
} from '@ant-design/icons'
import type { UploadProps } from 'antd'
import { categoryService } from '@/services/category.service'
import { articleService } from '@/services/article.service'
import type { Article, Category } from '@/types'
import { CategoryType } from '@/types'
import { downloadBlob } from '@/utils/download'

export interface DocumentTreeProps {
  /** 当前选中文档 id */
  selectedArticleId?: string
  /** 选中文档回调 */
  onSelectArticle: (article: Article) => void
  /** 外部触发的刷新 key，变化时重新加载树 */
  refreshKey?: number
}

/** 文件夹下拉选项（扁平化，带层级缩进显示） */
interface FolderOption {
  value: string
  label: string
}

/** 将文件夹树转为 antd Tree 节点 */
function toTreeData(nodes: Category[]): TreeDataNode[] {
  return nodes.map((node) => ({
    key: node._id,
    title: node.name,
    children: node.children?.length ? toTreeData(node.children) : undefined,
  }))
}

/** 扁平化文件夹树为下拉选项 */
function flattenFolders(nodes: Category[], depth = 0, acc: FolderOption[] = []): FolderOption[] {
  nodes.forEach((node) => {
    acc.push({ value: node._id, label: `${'　'.repeat(depth)}${node.name}` })
    if (node.children?.length) flattenFolders(node.children, depth + 1, acc)
  })
  return acc
}

/** 在树中按 id 查找文件夹节点 */
function findFolder(nodes: Category[], id: string): Category | undefined {
  for (const node of nodes) {
    if (node._id === id) return node
    if (node.children?.length) {
      const found = findFolder(node.children, id)
      if (found) return found
    }
  }
  return undefined
}

export default function DocumentTree(props: DocumentTreeProps): ReactElement {
  const { selectedArticleId, onSelectArticle, refreshKey } = props

  const [tree, setTree] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([])
  const [selectedFolderId, setSelectedFolderId] = useState<string | undefined>(undefined)
  const [articles, setArticles] = useState<Article[]>([])
  const [articlesLoading, setArticlesLoading] = useState(false)

  // Modal 状态
  const [folderModalOpen, setFolderModalOpen] = useState(false)
  const [folderModalMode, setFolderModalMode] = useState<'create' | 'rename'>('create')
  const [editingFolder, setEditingFolder] = useState<Category | undefined>(undefined)
  const [docModalOpen, setDocModalOpen] = useState(false)
  const [docParentFolder, setDocParentFolder] = useState<string | undefined>(undefined)

  const [folderForm] = Form.useForm<{ name: string; parentId?: string }>()
  const [docForm] = Form.useForm<{ title: string }>()

  // 是否已完成首次加载（首次默认展开第一层，后续刷新保留用户展开态）
  const initializedRef = useRef(false)

  /** 加载文件夹树 */
  const loadTree = useCallback(async () => {
    setLoading(true)
    try {
      const data = await categoryService.tree()
      setTree(data)
      // 仅首次加载时默认展开第一层，避免刷新覆盖用户展开态
      if (!initializedRef.current && data.length) {
        setExpandedKeys(data.map((n) => n._id))
        initializedRef.current = true
      }
    } catch {
      // 错误已由请求拦截器提示
    } finally {
      setLoading(false)
    }
  }, [])

  /** 加载指定文件夹下文档 */
  const loadArticles = useCallback(async (folderId: string) => {
    setArticlesLoading(true)
    try {
      const res = await articleService.list({ category: folderId, pageSize: 100 })
      setArticles(res.list ?? [])
    } catch {
      setArticles([])
    } finally {
      setArticlesLoading(false)
    }
  }, [])

  // 初始加载 & refreshKey 变化时重新加载
  useEffect(() => {
    loadTree()
  }, [loadTree, refreshKey])

  // 选中文件夹变化时加载文档
  useEffect(() => {
    if (selectedFolderId) {
      loadArticles(selectedFolderId)
    } else {
      setArticles([])
    }
  }, [selectedFolderId, loadArticles])

  /** 文件夹下拉选项（包含"根目录"占位） */
  const folderOptions = useMemo<FolderOption[]>(() => {
    return flattenFolders(tree)
  }, [tree])

  /** 选中文件夹节点 */
  const handleSelect = (keys: React.Key[]) => {
    const id = keys[0]
    if (typeof id === 'string') {
      setSelectedFolderId(id)
    } else {
      setSelectedFolderId(undefined)
    }
  }

  /** 打开新建文件夹 Modal */
  const openCreateFolder = (parentId?: string) => {
    setFolderModalMode('create')
    setEditingFolder(undefined)
    folderForm.resetFields()
    folderForm.setFieldsValue({ name: '', parentId })
    setFolderModalOpen(true)
  }

  /** 打开重命名 Modal */
  const openRenameFolder = (folder: Category) => {
    setFolderModalMode('rename')
    setEditingFolder(folder)
    folderForm.setFieldsValue({ name: folder.name, parentId: folder.parentId ?? undefined })
    setFolderModalOpen(true)
  }

  /** 提交文件夹表单（新建/重命名） */
  const handleFolderSubmit = async () => {
    try {
      const values = await folderForm.validateFields()
      if (folderModalMode === 'create') {
        await categoryService.create({
          name: values.name,
          type: CategoryType.Folder,
          parentId: values.parentId,
        })
        message.success('文件夹创建成功')
      } else if (editingFolder) {
        await categoryService.update(editingFolder._id, { name: values.name })
        message.success('文件夹已重命名')
      }
      setFolderModalOpen(false)
      loadTree()
    } catch {
      // 校验失败或请求失败，不关闭弹窗
    }
  }

  /** 删除文件夹 */
  const handleDeleteFolder = (folder: Category) => {
    Modal.confirm({
      title: '删除文件夹',
      content: `确定删除文件夹「${folder.name}」吗？包含子文件夹或文档时后端会拒绝删除。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await categoryService.remove(folder._id)
          message.success('文件夹已删除')
          if (selectedFolderId === folder._id) setSelectedFolderId(undefined)
          loadTree()
        } catch {
          // 错误信息由拦截器/后端返回
        }
      },
    })
  }

  /** 打开新建文档 Modal */
  const openCreateDoc = (parentId?: string) => {
    if (!parentId && !selectedFolderId) {
      message.warning('请先选择一个文件夹')
      return
    }
    setDocParentFolder(parentId ?? selectedFolderId)
    docForm.resetFields()
    setDocModalOpen(true)
  }

  /** 提交新建文档 */
  const handleDocSubmit = async () => {
    try {
      const values = await docForm.validateFields()
      const folderId = docParentFolder
      if (!folderId) {
        message.warning('请先选择一个文件夹')
        return
      }
      const article = await articleService.create({
        title: values.title,
        content: '',
        category: folderId,
      })
      message.success('文档创建成功')
      setDocModalOpen(false)
      // 刷新文档列表并选中新文档
      loadArticles(folderId)
      onSelectArticle(article)
    } catch {
      // 校验失败或请求失败
    }
  }

  /** 导入 Markdown */
  const uploadProps: UploadProps = {
    accept: '.md,.markdown',
    multiple: false,
    showUploadList: false,
    beforeUpload: (file) => {
      const folderId = selectedFolderId
      if (!folderId) {
        message.warning('请先选择一个文件夹再导入')
        return Upload.LIST_IGNORE
      }
      // 异步上传
      articleService
        .importMarkdown(file, folderId)
        .then(() => {
          message.success('Markdown 导入成功')
          loadArticles(folderId)
        })
        .catch(() => {
          // 错误已提示
        })
      return Upload.LIST_IGNORE
    },
  }

  /** 导出全部文章 */
  const handleExportAll = async () => {
    try {
      const blob = await articleService.exportAll()
      downloadBlob(blob, 'articles.zip')
      message.success('已开始导出全部文章')
    } catch {
      // 错误已提示
    }
  }

  /** 文件夹右键/操作菜单 */
  const getFolderMenuItems = (folder: Category): MenuProps['items'] => [
    {
      key: 'rename',
      label: '重命名',
      onClick: () => openRenameFolder(folder),
    },
    {
      key: 'add-subfolder',
      label: '新建子文件夹',
      onClick: () => openCreateFolder(folder._id),
    },
    {
      key: 'add-doc',
      label: '新建文档',
      onClick: () => openCreateDoc(folder._id),
    },
    { type: 'divider' },
    {
      key: 'delete',
      label: '删除',
      danger: true,
      onClick: () => handleDeleteFolder(folder),
    },
  ]

  /** 自定义树节点标题：文件夹名 + 操作按钮 */
  const renderTitle = (node: TreeDataNode) => {
    const folder = findFolder(tree, String(node.key))
    if (!folder) return <span>{node.title as React.ReactNode}</span>
    return (
      <Dropdown menu={{ items: getFolderMenuItems(folder) }} trigger={['contextMenu']}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingRight: 4,
          }}
        >
          <Space size={4}>
            <FolderOutlined style={{ color: '#faad14' }} />
            <span>{folder.name}</span>
          </Space>
          <Dropdown menu={{ items: getFolderMenuItems(folder) }} trigger={['click']}>
            <Button
              type="text"
              size="small"
              icon={<MoreOutlined />}
              onClick={(e) => e.stopPropagation()}
            />
          </Dropdown>
        </div>
      </Dropdown>
    )
  }

  const treeData = useMemo(() => toTreeData(tree), [tree])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* 顶部工具栏 */}
      <div style={{ marginBottom: 8 }}>
        <Space size={4} wrap>
          <Button size="small" icon={<FolderAddOutlined />} onClick={() => openCreateFolder()}>
            新建文件夹
          </Button>
          <Button size="small" icon={<FileAddOutlined />} onClick={() => openCreateDoc()}>
            新建文档
          </Button>
          <Upload {...uploadProps}>
            <Button size="small" icon={<ImportOutlined />}>
              导入MD
            </Button>
          </Upload>
          <Button size="small" icon={<ExportOutlined />} onClick={handleExportAll}>
            导出全部
          </Button>
          <Button size="small" type="text" icon={<ReloadOutlined />} onClick={loadTree} />
        </Space>
      </div>

      {/* 文件夹树 */}
      <Spin spinning={loading}>
        {treeData.length === 0 && !loading ? (
          <Empty description="暂无文件夹" style={{ padding: 24 }} />
        ) : (
          <Tree
            treeData={treeData}
            expandedKeys={expandedKeys}
            onExpand={(keys) => setExpandedKeys(keys)}
            onSelect={handleSelect}
            selectedKeys={selectedFolderId ? [selectedFolderId] : []}
            titleRender={renderTitle}
            blockNode
            style={{ userSelect: 'none' }}
          />
        )}
      </Spin>

      {/* 选中文件夹下的文档列表 */}
      <div style={{ marginTop: 12, flex: 1, overflow: 'auto', borderTop: '1px solid #f0f0f0', paddingTop: 8 }}>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {selectedFolderId ? '文档列表' : '请选择文件夹查看文档'}
        </Typography.Text>
        <Spin spinning={articlesLoading}>
          {articles.length === 0 ? (
            <Empty description={selectedFolderId ? '暂无文档' : ''} style={{ padding: 16 }} />
          ) : (
            <List
              size="small"
              dataSource={articles}
              renderItem={(item) => (
                <List.Item
                  style={{
                    cursor: 'pointer',
                    padding: '6px 8px',
                    background:
                      selectedArticleId === item._id ? 'rgba(22, 119, 255, 0.08)' : undefined,
                  }}
                  onClick={() => onSelectArticle(item)}
                >
                  <Space size={6} style={{ width: '100%', overflow: 'hidden' }}>
                    <FileTextOutlined style={{ color: '#1677ff' }} />
                    <Typography.Text
                      ellipsis
                      style={{ flex: 1, minWidth: 0 }}
                      strong={selectedArticleId === item._id}
                    >
                      {item.title}
                    </Typography.Text>
                  </Space>
                </List.Item>
              )}
            />
          )}
        </Spin>
      </div>

      {/* 新建/重命名文件夹 Modal */}
      <Modal
        title={folderModalMode === 'create' ? '新建文件夹' : '重命名文件夹'}
        open={folderModalOpen}
        onOk={handleFolderSubmit}
        onCancel={() => setFolderModalOpen(false)}
        okText="确定"
        cancelText="取消"
        destroyOnHidden
      >
        <Form form={folderForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label="文件夹名称"
            rules={[{ required: true, message: '请输入文件夹名称' }]}
          >
            <Input placeholder="请输入文件夹名称" maxLength={50} />
          </Form.Item>
          {folderModalMode === 'create' && (
            <Form.Item name="parentId" label="父级文件夹">
              <Select
                allowClear
                placeholder="不选则为根目录"
                options={folderOptions}
                fieldNames={{ label: 'label', value: 'value' }}
              />
            </Form.Item>
          )}
        </Form>
      </Modal>

      {/* 新建文档 Modal */}
      <Modal
        title="新建文档"
        open={docModalOpen}
        onOk={handleDocSubmit}
        onCancel={() => setDocModalOpen(false)}
        okText="创建"
        cancelText="取消"
        destroyOnHidden
      >
        <Form form={docForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="title"
            label="文档标题"
            rules={[{ required: true, message: '请输入文档标题' }]}
          >
            <Input placeholder="请输入文档标题" maxLength={100} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
