/**
 * 通用统计卡片：基于 antd Card + Statistic
 * 用于在页面顶部展示关键指标
 */
import { Card, Statistic } from 'antd'
import type { ReactNode } from 'react'

interface StatisticCardProps {
  /** 指标标题 */
  title: string
  /** 指标值 */
  value: number | string
  /** 前缀图标 */
  prefix?: ReactNode
  /** 数值后缀 */
  suffix?: ReactNode
  /** 数值精度（仅数值类型生效） */
  precision?: number
  /** 自定义加载态 */
  loading?: boolean
}

export default function StatisticCard({
  title,
  value,
  prefix,
  suffix,
  precision,
  loading,
}: StatisticCardProps) {
  return (
    <Card loading={loading} bordered>
      <Statistic
        title={title}
        value={value}
        prefix={prefix}
        suffix={suffix}
        precision={precision}
      />
    </Card>
  )
}
