/**
 * 文档树组件（统一文件树：文件夹 + 文件 合并显示）
 * - 左侧统一 Tree：文件夹节点可展开，展开后同时显示子文件夹和该文件夹下的文档
 * - 文档节点为叶子节点，点击加载编辑器；文件夹节点点击记录为当前操作目录
 * - 顶部工具栏：新建文件夹 / 新建文档 / 导入 Markdown / 导出全部 / 刷新
 * - 文件夹右键菜单 / 更多按钮：重命名 / 删除 / 新建子文件夹 / 新建文档
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
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
  FolderOpenOutlined,
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

/** 文章节点 key 前缀，用于与文件夹 id 区分 */
const ARTICLE_KEY_PREFIX = 'art_'

/** 将文章 id 转为树节点 key */
const articleKey = (id: string) => `${ARTICLE_KEY_PREFIX}${id}`

/** 判断一个 key 是否为文章节点 */
const isArticleKey = (key: React.Key) =>
  typeof key === 'string' && key.startsWith(ARTICLE_KEY_PREFIX)

/** 从文章节点 key 中提取文章 id */
const extractArticleId = (key: React.Key) =>
  typeof key === 'string' ? key.slice(ARTICLE_KEY_PREFIX.length) : ''

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

/** 递归收集所有文件夹 id（用于遍历） */
function collectFolderIds(nodes: Category[], acc: string[] = []): string[] {
  nodes.forEach((n) => {
    acc.push(n._id)
    if (n.children?.length) collectFolderIds(n.children, acc)
  })
  return acc
}

/** 将（文件夹树 + 文章）转为 antd Tree 节点（纯函数，放到组件外以避免递归自引用的 hooks immutability 警告）
 *  每个文件夹节点的 children = [子文件夹...] + [该文件夹下的文章叶子节点...]
 */
function toTreeData(
  nodes: Category[],
  articlesByFolder: Map<string, Article[]>,
): TreeDataNode[] {
  return nodes.map((folder) => {
    const subFolders = folder.children?.length ? toTreeData(folder.children, articlesByFolder) : []
    const articles = articlesByFolder.get(folder._id) ?? []
    const articleNodes: TreeDataNode[] = articles.map((a) => ({
      key: articleKey(a._id),
      title: a.title,
      isLeaf: true,
    }))
    return {
      key: folder._id,
      title: folder.name,
      children: [...subFolders, ...articleNodes],
    }
  })
}

export default function DocumentTree(props: DocumentTreeProps): ReactElement {
  const { selectedArticleId, onSelectArticle, refreshKey } = props

  const [tree, setTree] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([])
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([])
  /** 选中的文件夹 id（用于新建文档、导入 MD 等操作定位父目录） */
  const [activeFolderId, setActiveFolderId] = useState<string | undefined>(undefined)

  /** 各文件夹下的文章 Map: folderId -> Article[] */
  const [articlesByFolder, setArticlesByFolder] = useState<Map<string, Article[]>>(new Map())
  /** 正在加载文章的文件夹 id 集合 */
  const [loadingFolders, setLoadingFolders] = useState<Set<string>>(new Set())
  /** 文章快速查找表：articleId -> Article（用于点击文章节点时找到文章对象） */
  const articleLookup = useMemo(() => {
    const m = new Map<string, Article>()
    articlesByFolder.forEach((list) => {
      list.forEach((a) => m.set(a._id, a))
    })
    return m
  }, [articlesByFolder])

  // Modal 状态
  const [folderModalOpen, setFolderModalOpen] = useState(false)
  const [folderModalMode, setFolderModalMode] = useState<'create' | 'rename'>('create')
  const [editingFolder, setEditingFolder] = useState<Category | undefined>(undefined)
  const [docModalOpen, setDocModalOpen] = useState(false)
  const [docParentFolder, setDocParentFolder] = useState<string | undefined>(undefined)

  const [folderForm] = Form.useForm<{ name: string; parentId?: string }>()
  const [docForm] = Form.useForm<{ title: string }>()



  /** 加载文件夹树 */
  const loadTree = useCallback(async () => {
    setLoading(true)
    try {
      const data = await categoryService.tree()
      setTree(data)

    } catch {
      // 错误已由请求拦截器提示
    } finally {
      setLoading(false)
    }
  }, [])

  /** 加载指定文件夹下的文章，写入 articlesByFolder */
  const loadFolderArticles = useCallback(async (folderId: string): Promise<void> => {
    // 已加载或正在加载则跳过
    if (articlesByFolder.has(folderId)) return
    if (loadingFolders.has(folderId)) return
    setLoadingFolders((prev) => {
      const next = new Set(prev)
      next.add(folderId)
      return next
    })
    try {
      const res = await articleService.list({ category: folderId, pageSize: 1000 })
      const list = res.list ?? []
      setArticlesByFolder((prev) => {
        const next = new Map(prev)
        next.set(folderId, list)
        return next
      })
    } catch {
      setArticlesByFolder((prev) => {
        const next = new Map(prev)
        next.set(folderId, [])
        return next
      })
    } finally {
      setLoadingFolders((prev) => {
        const next = new Set(prev)
        next.delete(folderId)
        return next
      })
    }
  }, [articlesByFolder, loadingFolders])

  /** 强制刷新指定文件夹的文章列表（用于新建/导入/删除后） */
  const reloadFolderArticles = useCallback(async (folderId: string) => {
    // 先移除缓存，确保重新请求
    setArticlesByFolder((prev) => {
      const next = new Map(prev)
      next.delete(folderId)
      return next
    })
    await loadFolderArticles(folderId)
  }, [loadFolderArticles])

  // 初始加载 & refreshKey 变化时重新加载
  useEffect(() => {
    loadTree()
  }, [loadTree, refreshKey])

  /** 文件夹下拉选项（包含"根目录"占位） */
  const folderOptions = useMemo<FolderOption[]>(() => {
    return flattenFolders(tree)
  }, [tree])

  /** antd Tree 的 onExpand：展开/折叠时对新展开的文件夹懒加载文章 */
  const handleExpand = (keys: React.Key[]) => {
    const expandedKeySet = new Set(expandedKeys)
    const newlyExpanded = keys.filter((k) => !expandedKeySet.has(k))
    setExpandedKeys(keys)
    // 对新展开的文件夹（且类型是文件夹 key）加载文章
    newlyExpanded.forEach((k) => {
      if (!isArticleKey(k) && typeof k === 'string') {
        void loadFolderArticles(k)
      }
    })
  }

  /** 选中树节点：文章节点 → 回调加载编辑器；文件夹节点 → 设为活跃目录 */
  const handleSelect = (keys: React.Key[]) => {
    setSelectedKeys(keys)
    const key = keys[0]
    if (key === undefined || key === null) {
      setActiveFolderId(undefined)
      return
    }
    if (isArticleKey(key)) {
      const aid = extractArticleId(key)
      const article = articleLookup.get(aid)
      if (article) {
        // 选中文章时，同时把父目录设为活跃目录（方便后续新建/导入）
        let parentFolder: string | undefined
        articlesByFolder.forEach((list, fid) => {
          if (list.some((a) => a._id === aid)) parentFolder = fid
        })
        if (parentFolder) setActiveFolderId(parentFolder)
        onSelectArticle(article)
      }
    } else if (typeof key === 'string') {
      // 文件夹节点
      setActiveFolderId(key)
      // 选中文件夹时顺便确保其文章加载（虽然展开时已加载，但点击选中未必展开）
      void loadFolderArticles(key)
      // 选中文件夹时自动展开，符合统一文件树的直觉
      if (!expandedKeys.includes(key)) {
        setExpandedKeys((prev) => [...prev, key])
      }
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
          if (activeFolderId === folder._id) setActiveFolderId(undefined)
          // 清理该文件夹及其子文件夹的文章缓存
          setArticlesByFolder((prev) => {
            const next = new Map(prev)
            collectFolderIds([folder]).forEach((id) => next.delete(id))
            return next
          })
          loadTree()
        } catch {
          // 错误信息由拦截器/后端返回
        }
      },
    })
  }

  /** 打开新建文档 Modal */
  const openCreateDoc = (parentId?: string) => {
    const target = parentId ?? activeFolderId
    if (!target) {
      message.warning('请先选择一个文件夹')
      return
    }
    setDocParentFolder(target)
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
      // 刷新该文件夹文章列表并选中新文档
      await reloadFolderArticles(folderId)
      // 确保父文件夹展开 + 选中新文章节点
      if (!expandedKeys.includes(folderId)) {
        setExpandedKeys((prev) => [...prev, folderId])
      }
      setSelectedKeys([articleKey(article._id)])
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
      const folderId = activeFolderId
      if (!folderId) {
        message.warning('请先选择一个文件夹再导入')
        return Upload.LIST_IGNORE
      }
      articleService
        .importMarkdown(file, folderId)
        .then((art) => {
          message.success('Markdown 导入成功')
          void reloadFolderArticles(folderId).then(() => {
            if (!expandedKeys.includes(folderId)) {
              setExpandedKeys((prev) => [...prev, folderId])
            }
            setSelectedKeys([articleKey(art._id)])
            onSelectArticle(art)
          })
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

  /** 自定义树节点标题：
   * - 文件夹节点：图标 + 名称 + 更多按钮 / 右键菜单
   * - 文章节点：文件图标 + 标题（高亮当前选中）
   */
  const renderTitle = (node: TreeDataNode) => {
    const key = node.key
    // 文章节点
    if (isArticleKey(key)) {
      const aid = extractArticleId(key)
      const article = articleLookup.get(aid)
      const isActive = selectedArticleId === aid
      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            paddingRight: 4,
            width: '100%',
            overflow: 'hidden',
          }}
        >
          <Space size={6} style={{ minWidth: 0, overflow: 'hidden' }}>
            <FileTextOutlined style={{ color: '#1677ff', flexShrink: 0 }} />
            <Typography.Text
              ellipsis
              style={{
                maxWidth: 200,
                fontWeight: isActive ? 600 : undefined,
                color: isActive ? '#1677ff' : undefined,
              }}
            >
              {article?.title ?? (node.title as string)}
            </Typography.Text>
          </Space>
        </div>
      )
    }
    // 文件夹节点
    const folder = findFolder(tree, String(key))
    if (!folder) return <span>{node.title as React.ReactNode}</span>
    // 判断此文件夹是否处于展开状态，决定图标
    const isOpen = expandedKeys.includes(folder._id)
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
          <Space size={4} style={{ minWidth: 0, overflow: 'hidden' }}>
            {isOpen ? (
              <FolderOpenOutlined style={{ color: '#faad14' }} />
            ) : (
              <FolderOutlined style={{ color: '#faad14' }} />
            )}
            <Typography.Text ellipsis style={{ maxWidth: 200 }}>
              {folder.name}
            </Typography.Text>
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

  const treeData = useMemo(() => toTreeData(tree, articlesByFolder), [tree, articlesByFolder])

  // 当外部 selectedArticleId 变化（例如编辑器内删除后清空），同步选中状态
  useEffect(() => {
    if (selectedArticleId) {
      const k = articleKey(selectedArticleId)
      if (selectedKeys[0] !== k) {
        setSelectedKeys([k])
        // 如果该文章所在文件夹尚未展开，尝试找到并展开
        let folderId: string | undefined
        articlesByFolder.forEach((list, fid) => {
          if (list.some((a) => a._id === selectedArticleId)) folderId = fid
        })
        if (folderId && !expandedKeys.includes(folderId)) {
          setExpandedKeys((prev) => [...prev, folderId as string])
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedArticleId])

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
          <Button
            size="small"
            type="text"
            icon={<ReloadOutlined />}
            onClick={() => {
              // 刷新文件夹树 + 清空文章缓存，下次展开重新加载
              setArticlesByFolder(new Map())
              setLoadingFolders(new Set())
              loadTree()
            }}
          />
        </Space>
      </div>

      {/* 统一文件树：文件夹 + 文件 合并显示 */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <Spin spinning={loading}>
          {treeData.length === 0 && !loading ? (
            <Empty description="暂无文件夹" style={{ padding: 24 }} />
          ) : (
            <Tree
              treeData={treeData}
              expandedKeys={expandedKeys}
              onExpand={handleExpand}
              onSelect={handleSelect}
              selectedKeys={selectedKeys}
              titleRender={renderTitle}
              blockNode
              style={{ userSelect: 'none' }}
              showLine={{ showLeafIcon: false }}
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

