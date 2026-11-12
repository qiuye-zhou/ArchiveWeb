/**
 * ArchiveDoc Logo 组件
 * - 矢量 SVG，适配浅色/深色背景
 * - 尺寸由外层 width/height 控制，默认 32x32
 */
interface LogoProps {
  size?: number
  /** 背景：dark 用白色文字，light 用深色文字 */
  variant?: 'dark' | 'light'
}

export default function Logo({ size = 32, variant = 'dark' }: LogoProps) {
  const textColor = variant === 'dark' ? '#ffffff' : '#1f1f1f'

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        color: textColor,
        fontWeight: 700,
        fontSize: 18,
        whiteSpace: 'nowrap',
        lineHeight: 1,
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 40 40"
        width={size}
        height={size}
        aria-label="ArchiveDoc logo"
      >
        <defs>
          <linearGradient id="ad-logo-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#4096ff" />
            <stop offset="100%" stop-color="#1677ff" />
          </linearGradient>
        </defs>
        {/* 左页 */}
        <path
          d="M7 6 h11 a3 3 0 0 1 3 3 v22 a3 3 0 0 0 -3 -3 h-11 z"
          fill="url(#ad-logo-g)"
        />
        {/* 右页（稍暗，形成层次） */}
        <path
          d="M33 6 h-11 a3 3 0 0 0 -3 3 v22 a3 3 0 0 1 3 -3 h11 z"
          fill="url(#ad-logo-g)"
          opacity=".8"
        />
        {/* 书脊装饰 */}
        <path
          d="M20 11 v16"
          stroke="#ffffff"
          strokeOpacity=".55"
          strokeWidth="1"
          strokeLinecap="round"
        />
        <circle cx="20" cy="19" r="1.6" fill="#ffffff" />
      </svg>
      ArchiveDoc
    </span>
  )
}
