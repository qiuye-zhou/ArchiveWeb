/**
 * ArchiveDoc Logo 组件（极简单字母 A 徽标）
 * - 圆角方块底 + 白色几何 A，小尺寸下依然清晰
 * - 尺寸由 size 控制，默认 32x32
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
        display: 'flex',
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
        <rect x="3" y="3" width="34" height="34" rx="10" fill="#1677ff" />
        <path
          d="M20 11 L12.5 29 M20 11 L27.5 29 M15.2 23 H24.8"
          fill="none"
          stroke="#ffffff"
          strokeWidth="3.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      ArchiveDoc
    </span>
  )
}
