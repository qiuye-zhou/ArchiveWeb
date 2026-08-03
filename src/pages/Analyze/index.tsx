/**
 * 数据分析页
 * - 顶部：文档数 / 分类数 / 用户数 / 系统运行时长 统计卡片
 * - 中部：近期文档增长趋势（折线图）+ 分类文档分布（饼图）
 * - 底部：按月文档统计（柱状图）+ 系统信息（Descriptions）
 * 数据来源：analyzeService.getAllStats()（全量）+ analyzeService.recentActivity(days)
 */
import { useEffect, useState, useCallback } from 'react'
import { Row, Col, Card, Typography, Spin, Alert, Select, Descriptions, Empty } from 'antd'
import {
  FileTextOutlined,
  FolderOutlined,
  TeamOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { analyzeService } from '@/services/analyze.service'
import type { AllStats, RecentActivity } from '@/types'
import StatisticCard from '@/components/common/StatisticCard'

/** 饼图配色 */
const PIE_COLORS = [
  '#1677ff',
  '#52c41a',
  '#faad14',
  '#f5222d',
  '#722ed1',
  '#13c2c2',
  '#eb2f96',
  '#fa8c16',
]

/** 天数可选项 */
const DAY_OPTIONS = [7, 14, 30]

export default function Analyze() {
  const [allStats, setAllStats] = useState<AllStats | null>(null)
  const [recent, setRecent] = useState<RecentActivity[]>([])
  const [days, setDays] = useState<number>(7)
  const [loading, setLoading] = useState<boolean>(true)
  const [recentLoading, setRecentLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  /** 拉取全量统计 */
  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await analyzeService.getAllStats()
      setAllStats(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取分析数据失败')
    } finally {
      setLoading(false)
    }
  }, [])

  /** 拉取近期活跃 */
  const fetchRecent = useCallback(async (d: number) => {
    setRecentLoading(true)
    try {
      const data = await analyzeService.recentActivity(d)
      setRecent(data)
    } catch {
      // 近期趋势加载失败不阻塞主页面，仅置空
      setRecent([])
    } finally {
      setRecentLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchAll()
  }, [fetchAll])

  useEffect(() => {
    void fetchRecent(days)
  }, [days, fetchRecent])

  const overview = allStats?.overview
  const system = allStats?.system
  const articleStats = allStats?.article ?? []
  const categoryStats = allStats?.category ?? []

  return (
    <div style={{ padding: 24 }}>
      <Typography.Title level={3}>数据分析</Typography.Title>

      {error ? (
        <Alert
          type="error"
          showIcon
          message="数据加载失败"
          description={error}
          action={
            <a onClick={() => void fetchAll()} href="#">
              重试
            </a>
          }
          style={{ marginBottom: 16 }}
        />
      ) : null}

      <Spin spinning={loading && !allStats}>
        <Row gutter={16}>
          <Col xs={24} sm={12} md={6}>
            <StatisticCard
              title="文档数"
              value={overview?.articles ?? 0}
              prefix={<FileTextOutlined />}
              loading={loading}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <StatisticCard
              title="分类数"
              value={overview?.categories ?? 0}
              prefix={<FolderOutlined />}
              loading={loading}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <StatisticCard
              title="用户数"
              value={overview?.users ?? 0}
              prefix={<TeamOutlined />}
              loading={loading}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <StatisticCard
              title="系统运行时长"
              value={system?.uptime ?? '-'}
              prefix={<ClockCircleOutlined />}
              loading={loading}
            />
          </Col>
        </Row>

        <Row gutter={16} style={{ marginTop: 16 }}>
          <Col xs={24} lg={14}>
            <Card
              title="文档增长趋势"
              extra={
                <Select
                  value={days}
                  onChange={setDays}
                  style={{ width: 110 }}
                  options={DAY_OPTIONS.map((d) => ({ value: d, label: `近 ${d} 天` }))}
                />
              }
            >
              {recent.length ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={recent} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="articles"
                      name="文档数"
                      stroke="#1677ff"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <Spin spinning={recentLoading}>
                  <Empty description="暂无趋势数据" style={{ padding: 40 }} />
                </Spin>
              )}
            </Card>
          </Col>

          <Col xs={24} lg={10}>
            <Card title="分类文档分布">
              {categoryStats.length ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryStats}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label
                    >
                      {categoryStats.map((item, idx) => (
                        <Cell
                          key={item.name}
                          fill={PIE_COLORS[idx % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Empty description="暂无分类数据" style={{ padding: 40 }} />
              )}
            </Card>
          </Col>
        </Row>

        <Row gutter={16} style={{ marginTop: 16 }}>
          <Col xs={24} lg={14}>
            <Card title="按月文档统计">
              {articleStats.length ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={articleStats} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="_id" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" name="文档数" fill="#1677ff" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Empty description="暂无月度数据" style={{ padding: 40 }} />
              )}
            </Card>
          </Col>

          <Col xs={24} lg={10}>
            <Card title="系统信息">
              {system ? (
                <Descriptions column={1} size="small" bordered>
                  <Descriptions.Item label="操作系统">{system.os}</Descriptions.Item>
                  <Descriptions.Item label="平台">{system.platform}</Descriptions.Item>
                  <Descriptions.Item label="架构">{system.arch}</Descriptions.Item>
                  <Descriptions.Item label="Node 版本">{system.nodeVersion}</Descriptions.Item>
                  <Descriptions.Item label="CPU 型号">{system.cpuModel}</Descriptions.Item>
                  <Descriptions.Item label="CPU 核心数">{system.cpus}</Descriptions.Item>
                  <Descriptions.Item label="内存占用">{system.memoryUsage}</Descriptions.Item>
                  <Descriptions.Item label="总内存">{system.totalMemory}</Descriptions.Item>
                  <Descriptions.Item label="空闲内存">{system.freeMemory}</Descriptions.Item>
                  <Descriptions.Item label="主机名">{system.hostname}</Descriptions.Item>
                  <Descriptions.Item label="运行时长">{system.uptime}</Descriptions.Item>
                  <Descriptions.Item label="版本">{system.version}</Descriptions.Item>
                  <Descriptions.Item label="环境">{system.env}</Descriptions.Item>
                </Descriptions>
              ) : (
                <Empty description="暂无系统信息" style={{ padding: 40 }} />
              )}
            </Card>
          </Col>
        </Row>
      </Spin>
    </div>
  )
}
