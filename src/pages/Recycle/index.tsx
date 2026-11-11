/**
 * 回收站页
 * - 表格：已删除文档（标题 / 删除时间 / 删除人 / 操作）
 * - 操作：恢复、永久删除（永久删除会一并清理历史版本）
 * - 仅管理员可访问（路由层 RequireAdmin + 接口层 AdminGuard）
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
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  DeleteOutlined,
  ReloadOutlined,
  UndoOutlined,
} from '@ant-design/icons'
import { articleService } from '@/services/article.service'
import type { Article } from '@/types'
import { formatTime } from '@/utils/format'
import Empty from '@/components/common/Empty'

export default function Recycle() {
  const [list, setList] = useState<Article[]>([])
  const [total, setTotal] = useState<number>(0)
  const [page, setPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(10)
  const [loading, setLoading] = useState<boolean>(false)

  /** 拉取回收站列表 */
  const fetchList = useCallback(
    async (nextPage = page, nextPageSize = pageSize) => {
      setLoading(true)
      try {
        const data = await articleService.listRecycle({
          page: nextPage,
          pageSize: nextPageSize,
        })
        setList(data?.list ?? [])
        setTotal(data?.total ?? 0)
      } catch {
        setList([])
        setTotal(0)
      } finally {
        setLoading(false)
      }
    },
    [page, pageSize],
  )

  useEffect(() => {
    void fetchList()
  }, [fetchList])

  /** 从回收站恢复 */
  const handleRestore = useCallback(
    async (id: string) => {
      try {
        await articleService.restore(id)
        message.success('文档已恢复')
        // 当前页删空时回退一页
        const nextPage = list.length === 1 && page > 1 ? page - 1 : page
        if (nextPage !== page) setPage(nextPage)
        void fetchList(nextPage, pageSize)
      } catch {
        // 拦截器已报错
      }
    },
    [fetchList, list.length, page, pageSize],
  )

  /** 永久删除（含历史版本清理，不可恢复） */
  const handleDeletePermanent = useCallback(
    async (id: string) => {
      try {
        await articleService.removePermanent(id)
        message.success('文档已永久删除')
        const nextPage = list.length === 1 && page > 1 ? page - 1 : page
        if (nextPage !== page) setPage(nextPage)
        void fetchList(nextPage, pageSize)
      } catch {
        // 拦截器已报错
      }
    },
    [fetchList, list.length, page, pageSize],
  )

  const columns: ColumnsType<Article> = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: '删除时间',
      dataIndex: 'deletedAt',
      key: 'deletedAt',
      width: 180,
      render: (value?: string | number) => formatTime(value),
    },
    {
      title: '删除人',
      dataIndex: 'deletedByName',
      key: 'deletedByName',
      width: 140,
      render: (value?: string) => value || '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space>
          <Popconfirm
            title="恢复该文档？"
            description="恢复后文档将回到原分类。"
            okText="恢复"
            cancelText="取消"
            onConfirm={() => void handleRestore(record._id)}
          >
            <Button type="link" size="small" icon={<UndoOutlined />}>
              恢复
            </Button>
          </Popconfirm>
          <Popconfirm
            title="永久删除该文档？"
            description="删除后不可恢复，文档的历史版本也会一并清除。"
            okText="永久删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            onConfirm={() => void handleDeletePermanent(record._id)}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              永久删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <Typography.Title level={3}>回收站</Typography.Title>
      <Typography.Paragraph type="secondary">
        删除的文档会先移入回收站，可在此恢复或永久删除。
      </Typography.Paragraph>

      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ReloadOutlined />} onClick={() => void fetchList()}>
          刷新列表
        </Button>
      </Space>

      <Card title={`已删除文档（${total}）`} styles={{ body: { padding: 0 } }}>
        <Table<Article>
          rowKey="_id"
          dataSource={list}
          columns={columns}
          loading={loading}
          size="small"
          scroll={{ x: 'max-content' }}
          locale={{ emptyText: <Empty description="回收站为空" /> }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (t) => `共 ${t} 条`,
            onChange: (nextPage, nextPageSize) => {
              setPage(nextPage)
              setPageSize(nextPageSize)
              void fetchList(nextPage, nextPageSize)
            },
          }}
        />
      </Card>
    </div>
  )
}
