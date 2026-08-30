/**
 * 日志查看页
 * - 单页表格：日志文件列表（filename / size / modifiedAt，查看 / 删除）
 * - 点击「查看」按钮弹 Modal 显示完整日志内容（等宽字体、可滚动、限高）
 * - 顶部：刷新列表 / 删除全部日志
 */
import { useCallback, useEffect, useState } from 'react'
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
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { DeleteOutlined, EyeOutlined, ReloadOutlined } from '@ant-design/icons'
import { healthService } from '@/services/health.service'
import type { LogFile } from '@/types'
import { formatFileSize, formatTime } from '@/utils/format'
import Empty from '@/components/common/Empty'

/** 判断字符串是否是已经带单位的预格式化大小（如 "5.24 KB"），避免再走 formatFileSize 被 NaN */
function isFormattedSize(v: unknown): v is string {
  return typeof v === 'string' && /\d.*\s*(B|KB|MB|GB|TB)$/i.test(v.trim())
}

export default function Logs() {
  const [list, setList] = useState<LogFile[]>([])
  const [listLoading, setListLoading] = useState<boolean>(false)

  // Modal 状态（点击查看时使用）
  const [modalOpen, setModalOpen] = useState(false)
  const [modalFilename, setModalFilename] = useState<string>('')
  const [modalContent, setModalContent] = useState<string>('')
  const [modalLoading, setModalLoading] = useState<boolean>(false)

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

  /** 点击查看：打开 Modal 并拉取日志内容 */
  const handleView = useCallback(async (filename: string) => {
    setModalFilename(filename)
    setModalContent('')
    setModalOpen(true)
    setModalLoading(true)
    try {
      const data = await healthService.getLogContent(filename)
      setModalContent(data.content ?? '')
    } catch {
      setModalContent('')
    } finally {
      setModalLoading(false)
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
        </Space>
      ),
    },
  ]

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
          <Button key="close" onClick={() => setModalOpen(false)}>
            关闭
          </Button>,
        ]}
        width={960}
        destroyOnHidden
      >
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
            {modalContent || '(空)'}
          </pre>
        </Spin>
      </Modal>

      {/* AntEmpty 引用仅为防止 TS unused 警告（旧实现不再使用，但保留以防未来扩展） */}
    </div>
  )
}

