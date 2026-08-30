/**
 * 备份管理页
 * - 立即备份（下载 zip）、上传备份恢复、删除全部
 * - 备份列表：下载 / 恢复 / 删除
 */
import { useCallback, useEffect, useState } from 'react'
import {
  Typography,
  Card,
  Table,
  Button,
  Space,
  Popconfirm,
  Upload,
  message,
  Tooltip,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { UploadProps } from 'antd'
import {
  CloudUploadOutlined,
  DeleteOutlined,
  DownloadOutlined,
  PlusOutlined,
  RedoOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { backupService } from '@/services/backup.service'
import type { BackupItem } from '@/types'
import { downloadBlob } from '@/utils/download'
import Empty from '@/components/common/Empty'

export default function Backup() {
  const [list, setList] = useState<BackupItem[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [creating, setCreating] = useState<boolean>(false)

  /** 拉取备份列表 */
  const fetchList = useCallback(async () => {
    setLoading(true)
    try {
      const data = await backupService.list()
      setList(data ?? [])
    } catch {
      // 请求拦截器已统一报错，此处仅置空
      setList([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchList()
  }, [fetchList])

  /** 立即备份：下载 zip 并刷新列表 */
  const handleCreate = useCallback(async () => {
    setCreating(true)
    try {
      const blob = await backupService.new()
      const filename = `backup-${dayjs().format('YYYYMMDDHHmmss')}.zip`
      downloadBlob(blob, filename)
      message.success('备份已生成')
      void fetchList()
    } catch {
      // 拦截器已报错
    } finally {
      setCreating(false)
    }
  }, [fetchList])

  /** 下载指定备份 */
  const handleDownload = useCallback(async (filename: string) => {
    try {
      const blob = await backupService.download(filename)
      downloadBlob(blob, filename)
    } catch {
      // 拦截器已报错
    }
  }, [])

  /** 从备份恢复 */
  const handleRestore = useCallback(async (filename: string) => {
    try {
      await backupService.restore(filename)
      message.success('恢复成功')
    } catch {
      // 拦截器已报错
    }
  }, [])

  /** 删除单个备份 */
  const handleDelete = useCallback(
    async (filename: string) => {
      try {
        await backupService.deleteOne(filename)
        message.success('删除成功')
        void fetchList()
      } catch {
        // 拦截器已报错
      }
    },
    [fetchList],
  )

  /** 删除全部备份 */
  const handleDeleteAll = useCallback(async () => {
    try {
      await backupService.deleteAll()
      message.success('已清空全部备份')
      void fetchList()
    } catch {
      // 拦截器已报错
    }
  }, [fetchList])

  /** 上传备份：beforeUpload 拦截并手动上传 */
  const handleUpload: UploadProps['beforeUpload'] = useCallback(
    (file) => {
      const isZip = file.name.toLowerCase().endsWith('.zip')
      if (!isZip) {
        message.error('仅支持 .zip 备份文件')
        return Upload.LIST_IGNORE
      }
      void (async () => {
        try {
          await backupService.uploadBackup(file)
          message.success('上传成功')
          void fetchList()
        } catch {
          // 拦截器已报错
        }
      })()
      // 返回 false 阻止 antd 自动上传
      return false
    },
    [fetchList],
  )

  const columns: ColumnsType<BackupItem> = [
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
      width: 120,
      render: (value: string | null | undefined) => (value == null || value === '' ? '-' : String(value)),
    },
    {
      title: '操作',
      key: 'action',
      width: 240,
      render: (_, record) => (
        <Space>
          <Tooltip title="下载备份">
            <Button
              type="link"
              size="small"
              icon={<DownloadOutlined />}
              onClick={() => void handleDownload(record.filename)}
            >
              下载
            </Button>
          </Tooltip>
          <Popconfirm
            title="确认从该备份恢复？"
            description="恢复将覆盖当前数据，操作不可逆。"
            okText="恢复"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            onConfirm={() => void handleRestore(record.filename)}
          >
            <Button type="link" size="small">
              恢复
            </Button>
          </Popconfirm>
          <Popconfirm
            title="确认删除该备份？"
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
      <Typography.Title level={3}>备份管理</Typography.Title>
      <Typography.Paragraph type="secondary">
        创建数据库与静态资源备份，支持下载、上传恢复与删除。
      </Typography.Paragraph>

      <Space style={{ marginBottom: 16 }} wrap>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          loading={creating}
          onClick={() => void handleCreate()}
        >
          立即备份
        </Button>
        <Upload
          accept=".zip"
          showUploadList={false}
          beforeUpload={handleUpload}
          multiple={false}
        >
          <Button icon={<CloudUploadOutlined />}>上传备份</Button>
        </Upload>
        <Button icon={<RedoOutlined />} onClick={() => void fetchList()}>
          刷新
        </Button>
        <Popconfirm
          title="确认删除全部备份？"
          description="该操作将清空所有备份文件，不可恢复。"
          okText="删除全部"
          cancelText="取消"
          okButtonProps={{ danger: true }}
          onConfirm={() => void handleDeleteAll()}
          disabled={!list.length}
        >
          <Button danger icon={<DeleteOutlined />} disabled={!list.length}>
            删除全部
          </Button>
        </Popconfirm>
      </Space>

      <Card>
        <Table<BackupItem>
          rowKey="filename"
          dataSource={list}
          columns={columns}
          loading={loading}
          size="small"
          pagination={false}
          locale={{ emptyText: <Empty description="暂无备份文件" /> }}
        />
      </Card>
    </div>
  )
}


