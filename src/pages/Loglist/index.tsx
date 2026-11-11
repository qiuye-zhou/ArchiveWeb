/**
 * 日志查看页
 * - 单页表格：日志文件列表（filename / size / modifiedAt，查看 / 删除）
 * - 点击「查看」按钮弹 Modal 显示完整日志内容（等宽字体、可滚动、限高）
 * - 顶部：刷新列表 / 删除全部日志
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Typography,
  Card,
  Table,
  Button,
  Space,
  Popconfirm,
  message,
  Modal,
  Spin,
  Alert,
  Select,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  DeleteOutlined,
  DownloadOutlined,
  EyeOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { healthService } from '@/services/health.service'
import { useAuthStore } from '@/store/useAuthStore'
import type { LogFile, LogContent } from '@/types'
import { formatFileSize, formatLogContent, formatTime } from '@/utils/format'
import Empty from '@/components/common/Empty'

/** 判断字符串是否是已经带单位的预格式化大小（如 "5.24 KB"），避免再走 formatFileSize 被 NaN */
function isFormattedSize(v: unknown): v is string {
  return typeof v === 'string' && /\d.*\s*(B|KB|MB|GB|TB)$/i.test(v.trim())
}

/** 可供选择的「显示最后 N 行」 */
const TAIL_OPTIONS = [
  { value: 1000, label: '最后 1000 行' },
  { value: 2000, label: '最后 2000 行' },
  { value: 5000, label: '最后 5000 行' },
]

export default function Logs() {
  const [list, setList] = useState<LogFile[]>([])
  const [listLoading, setListLoading] = useState<boolean>(false)
  // 删除日志仅管理员可见
  const isAdmin = useAuthStore((s) => s.user?.role !== 'editor')

  // Modal 状态（点击查看时使用）
  const [modalOpen, setModalOpen] = useState(false)
  const [modalFilename, setModalFilename] = useState<string>('')
  const [modalData, setModalData] = useState<LogContent | null>(null)
  const [modalLoading, setModalLoading] = useState<boolean>(false)
  // 只展示末尾 N 行，防止超大日志渲染卡死
  const [tailLines, setTailLines] = useState<number>(2000)

  /** 拉取日志列表 */
  const fetchList = useCallback(async () => {
    setListLoading(true)
    try {
      const data = await healthService.getLogs()
      setList(data ?? [])
    } catch {
      setList([])
    } finally {
      setListLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchList()
  }, [fetchList])

  /** 点击查看：打开 Modal 并拉取日志内容（只取末尾 N 行） */
  const handleView = useCallback(
    async (filename: string, lines = tailLines) => {
      setModalFilename(filename)
      setModalData(null)
      setModalOpen(true)
      setModalLoading(true)
      try {
        const data = await healthService.getLogContent(filename, lines)
        setModalData(data)
      } catch {
        setModalData(null)
      } finally {
        setModalLoading(false)
      }
    },
    [tailLines],
  )

  /** 下载完整日志文件 */
  const handleDownload = useCallback(async (filename: string) => {
    try {
      const blob = await healthService.downloadLog(filename)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch {
      // 拦截器已报错
    }
  }, [])

  /** 删除单个日志 */
  const handleDelete = useCallback(
    async (filename: string) => {
      try {
        await healthService.deleteLog(filename)
        message.success('日志已删除')
        // 如果 Modal 正在看这个被删的日志，关掉 Modal
        if (modalOpen && modalFilename === filename) {
          setModalOpen(false)
        }
        void fetchList()
      } catch {
        // 拦截器已报错
      }
    },
    [fetchList, modalOpen, modalFilename],
  )

  /** 删除全部日志 */
  const handleDeleteAll = useCallback(async () => {
    try {
      await healthService.deleteAllLogs()
      message.success('已清空全部日志')
      setModalOpen(false)
      void fetchList()
    } catch {
      // 拦截器已报错
    }
  }, [fetchList])

  const columns: ColumnsType<LogFile> = [
    {
      title: '文件名',
      dataIndex: 'filename',
      key: 'filename',
      ellipsis: true,
    },
    {
      title: '大小',
      dataIndex: 'size',
      key: 'size',
      width: 100,
      render: (value: unknown) => {
        if (value == null || value === '') return '-'
        // 后端可能已经返回带单位的字符串，直接显示
        if (isFormattedSize(value)) return value
        // 否则走字节格式化
        return formatFileSize(value)
      },
    },
    {
      title: '修改时间',
      dataIndex: 'modifiedAt',
      key: 'modifiedAt',
      width: 170,
      render: (value?: string | number) => formatTime(value),
    },
    {
      title: '操作',
      key: 'action',
      width: 140,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => void handleView(record.filename)}
          >
            查看
          </Button>
          {isAdmin ? (
            <Popconfirm
              title="确认删除该日志文件？"
              okText="删除"
              cancelText="取消"
              okButtonProps={{ danger: true }}
              onConfirm={() => void handleDelete(record.filename)}
            >
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          ) : null}
        </Space>
      ),
    },
  ]

  /** 后端存的是单行紧凑格式，展示时展开成易读的多行 */
  const displayContent = useMemo(
    () => formatLogContent(modalData?.content),
    [modalData?.content],
  )

  return (
    <div style={{ padding: 24 }}>
      <Typography.Title level={3}>日志查看</Typography.Title>
      <Typography.Paragraph type="secondary">
        查看系统运行日志文件，支持查看内容与清理。
      </Typography.Paragraph>

      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ReloadOutlined />} onClick={() => void fetchList()}>
          刷新列表
        </Button>
        {isAdmin ? (
          <Popconfirm
            title="确认删除全部日志文件？"
            description="该操作将清空所有日志，不可恢复。"
            okText="删除全部"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            onConfirm={() => void handleDeleteAll()}
            disabled={!list.length}
          >
            <Button danger icon={<DeleteOutlined />} disabled={!list.length}>
              删除全部日志
            </Button>
          </Popconfirm>
        ) : null}
      </Space>

      <Card title="日志文件" styles={{ body: { padding: 0 } }}>
        <Table<LogFile>
          rowKey="filename"
          dataSource={list}
          columns={columns}
          loading={listLoading}
          size="small"
          pagination={false}
          scroll={{ x: 'max-content' }}
          locale={{ emptyText: <Empty description="暂无日志文件" /> }}
        />
      </Card>

      {/* 日志内容查看 Modal */}
      <Modal
        title={
          <Space size={8}>
            <EyeOutlined style={{ color: '#1677ff' }} />
            <Typography.Text strong style={{ fontSize: 16 }}>
              日志内容
            </Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {modalFilename}
            </Typography.Text>
          </Space>
        }
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={[
          <Button
            key="download"
            icon={<DownloadOutlined />}
            onClick={() => void handleDownload(modalFilename)}
          >
            下载完整文件
          </Button>,
          <Button key="close" onClick={() => setModalOpen(false)}>
            关闭
          </Button>,
        ]}
        width={960}
        destroyOnHidden
      >
        <Space style={{ marginBottom: 12 }} size={8} wrap>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            显示范围：
          </Typography.Text>
          <Select
            size="small"
            value={tailLines}
            options={TAIL_OPTIONS}
            style={{ width: 140 }}
            onChange={(value) => {
              setTailLines(value)
              void handleView(modalFilename, value)
            }}
          />
          {modalData?.size ? (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              文件大小：{formatFileSize(modalData.size)}
            </Typography.Text>
          ) : null}
        </Space>

        {modalData?.truncated ? (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 12 }}
            message={`日志文件较大，仅显示末尾 ${modalData.shownLines ?? tailLines} 行`}
            description="需要查看完整内容请点击下方「下载完整文件」。"
          />
        ) : null}

        <Spin spinning={modalLoading}>
          <pre
            style={{
              margin: 0,
              maxHeight: 560,
              overflow: 'auto',
              background: '#f5f5f5',
              padding: 12,
              borderRadius: 6,
              fontFamily:
                'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
              fontSize: 12,
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}
          >
            {displayContent || '(空)'}
          </pre>
        </Spin>
      </Modal>

      {/* AntEmpty 引用仅为防止 TS unused 警告（旧实现不再使用，但保留以防未来扩展） */}
    </div>
  )
}

