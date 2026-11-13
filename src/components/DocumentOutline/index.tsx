/**
 * 文档右侧目录（标题快捷跳转 + 阅读进度）
 * - 标题直接从编辑器 DOM 读取，保证与实际渲染的标题完全一致
 * - containerRef：编辑器内部滚动容器；不传则按整页（window）滚动处理
 */
import { useCallback, useEffect, useState } from 'react'
import type { RefObject } from 'react'

interface HeadingItem {
  id: string
  text: string
  level: number
  el: HTMLElement
}

interface DocumentOutlineProps {
  /** 滚动容器（编辑器内部滚动区）；不传则监听整个页面滚动 */
  containerRef?: RefObject<HTMLElement | null>
  /** 判定「当前章节」的顶部偏移 */
  offset?: number
}

const HEADING_SELECTOR = 'h1, h2, h3, h4, h5, h6'

/** 标题来源范围：优先指定容器，其次页面上的编辑器根节点 */
function resolveScope(container?: HTMLElement | null): ParentNode {
  if (container) return container
  return document.querySelector<HTMLElement>('.milkdown-editor-wrap') ?? document.body
}

export default function DocumentOutline({
  containerRef,
  offset = 80,
}: DocumentOutlineProps) {
  const [headings, setHeadings] = useState<HeadingItem[]>([])
  const [activeId, setActiveId] = useState('')
  const [progress, setProgress] = useState(0)

  /** 收集范围内的标题节点 */
  const collect = useCallback(() => {
    const scope = resolveScope(containerRef?.current)
    const nodes = Array.from(scope.querySelectorAll<HTMLElement>(HEADING_SELECTOR))
    setHeadings(
      nodes.map((el, index) => ({
        id: `outline-${index}`,
        text: (el.textContent ?? '').trim() || '（无标题）',
        level: Number(el.tagName.slice(1)),
        el,
      })),
    )
  }, [containerRef])

  // 标题随内容（切换文档、编辑修改）变化时重建
  useEffect(() => {
    collect()
    let frame = 0
    const observer = new MutationObserver(() => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(collect)
    })
    observer.observe(resolveScope(containerRef?.current), {
      childList: true,
      subtree: true,
      characterData: true,
    })
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [collect, containerRef])

  /** 计算当前章节与阅读进度 */
  const updatePosition = useCallback(() => {
    if (!headings.length) return
    const container = containerRef?.current
    const baseTop = container ? container.getBoundingClientRect().top : 0

    let current = headings[0].id
    for (const item of headings) {
      if (item.el.getBoundingClientRect().top - baseTop <= offset) {
        current = item.id
      }
    }
    setActiveId(current)

    const scrollEl = container ?? document.documentElement
    const scrollTop = container ? container.scrollTop : window.scrollY
    const max = scrollEl.scrollHeight - scrollEl.clientHeight
    setProgress(max > 0 ? Math.min(100, Math.round((scrollTop / max) * 100)) : 0)
  }, [containerRef, headings, offset])

  useEffect(() => {
    updatePosition()
    // 用捕获阶段监听，容器内部滚动与整页滚动都能覆盖
    document.addEventListener('scroll', updatePosition, { passive: true, capture: true })
    window.addEventListener('resize', updatePosition)
    return () => {
      document.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [updatePosition])

  /** 点击目录：平滑滚动到对应标题 */
  const handleJump = (item: HeadingItem) => {
    const container = containerRef?.current
    if (container) {
      const delta =
        item.el.getBoundingClientRect().top -
        container.getBoundingClientRect().top +
        container.scrollTop
      container.scrollTo({ top: Math.max(0, delta - 12), behavior: 'smooth' })
      return
    }
    const top = window.scrollY + item.el.getBoundingClientRect().top - 16
    window.scrollTo({ top, behavior: 'smooth' })
  }

  if (!headings.length) return null

  return (
    <aside style={{ minWidth: 0 }}>
      <div style={{ position: 'sticky', top: 8 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'rgba(0, 0, 0, 0.45)',
            marginBottom: 8,
            letterSpacing: 1,
          }}
        >
          目录
        </div>
        <nav
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            maxHeight: 'calc(100vh - 240px)',
            overflowY: 'auto',
            borderLeft: '1px solid #f0f0f0',
            paddingLeft: 10,
          }}
        >
          {headings.map((item) => {
            const active = item.id === activeId
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                title={item.text}
                onClick={(e) => {
                  e.preventDefault()
                  handleJump(item)
                }}
                style={{
                  display: 'block',
                  padding: '2px 0',
                  paddingLeft: item.level >= 3 ? 10 : 0,
                  fontSize: 12,
                  lineHeight: '22px',
                  color: active ? '#1677ff' : 'rgba(0, 0, 0, 0.55)',
                  fontWeight: active ? 600 : 400,
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  transition: 'color 0.2s',
                }}
              >
                {item.text}
              </a>
            )
          })}
        </nav>

        {/* 阅读进度 */}
        <div style={{ marginTop: 16 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 11,
              color: 'rgba(0, 0, 0, 0.45)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            <span>阅读进度</span>
            <span>{progress}%</span>
          </div>
          <div
            style={{
              marginTop: 6,
              height: 4,
              borderRadius: 2,
              background: '#f0f0f0',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: '100%',
                borderRadius: 2,
                background: '#1677ff',
                transition: 'width 0.2s',
              }}
            />
          </div>
        </div>
      </div>
    </aside>
  )
}
