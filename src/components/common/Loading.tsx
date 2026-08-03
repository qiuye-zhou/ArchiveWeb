/**
 * 通用加载占位组件
 */
import { Spin } from 'antd'

interface LoadingProps {
  tip?: string
  height?: number | string
}

export default function Loading({ tip = '加载中...', height = 200 }: LoadingProps) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        height,
      }}
    >
      <Spin tip={tip} size="large" />
    </div>
  )
}
