/**
 * Milkdown 富文本编辑器组件
 * - 基于 @milkdown/react 的 MilkdownProvider + useEditor
 * - 集成 commonmark / gfm / history / clipboard / emoji / prism / listener / upload / block 插件
 * - 通过 listener 插件监听 markdown 变化并回调 onChange
 * - 外部 value 变化时通过 replaceAll 同步到编辑器（避免循环更新）
 * - 工具栏：撤销/重做/正文/标题/粗体/斜体/删除线/行内代码/引用/列表/代码块/链接/图片 + 源码切换
 * - 所见即所得：编辑区本身就是最终排版效果，无需额外预览模式
 *
 * 说明：Milkdown v7 的 useEditor 返回 { loading, get }，get() 取 Editor 实例。
 * 命令通过 $Command.run(payload) 触发（插件加载后该方法被注入）；
 * 整体替换内容通过 editor.action(replaceAll(markdown))。
 * 图片粘贴/拖拽使用 upload 插件的 defaultUploader（base64 占位），
 * TODO: 后续接入后端图片上传接口，替换 uploadConfig.uploader。
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactElement } from 'react'
import { Space, Tooltip, Button, Divider } from 'antd'
import {
  BoldOutlined,
  ItalicOutlined,
  StrikethroughOutlined,
  OrderedListOutlined,
  UnorderedListOutlined,
  PictureOutlined,
  LinkOutlined,
  UndoOutlined,
  RedoOutlined,
  CodeOutlined,
  FontSizeOutlined,
  BlockOutlined,
  EyeOutlined,
  EditOutlined,
} from '@ant-design/icons'
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react'
import { Editor, editorViewOptionsCtx, defaultValueCtx, rootCtx, editorViewCtx } from '@milkdown/core'
import {
  commonmark,
  toggleStrongCommand,
  toggleEmphasisCommand,
  toggleInlineCodeCommand,
  wrapInHeadingCommand,
  wrapInBlockquoteCommand,
  wrapInBulletListCommand,
  wrapInOrderedListCommand,
  createCodeBlockCommand,
  toggleLinkCommand,
  insertImageCommand,
  turnIntoTextCommand,
  liftListItemCommand,
  bulletListSchema,
  orderedListSchema,
} from '@milkdown/preset-commonmark'
import { gfm, toggleStrikethroughCommand } from '@milkdown/preset-gfm'
import { history, undoCommand, redoCommand } from '@milkdown/plugin-history'
import { clipboard } from '@milkdown/plugin-clipboard'
import { emoji } from '@milkdown/plugin-emoji'
import { prism } from '@milkdown/plugin-prism'
import { listener, listenerCtx } from '@milkdown/plugin-listener'
import { upload } from '@milkdown/plugin-upload'
import { block } from '@milkdown/plugin-block'
import { nord } from '@milkdown/theme-nord'
import { replaceAll } from '@milkdown/utils'
import '@milkdown/theme-nord/style.css'
import './editor.css'

export interface MilkdownEditorProps {
  /** 当前 markdown 值 */
  value: string
  /** markdown 内容变化回调 */
  onChange: (md: string) => void
  /** 是否只读 */
  readonly?: boolean
}

/** 编辑器渲染模式 */
type EditMode = 'wysiwyg' | 'source'

/** 命令插件的最小结构：含可调用的 run 方法与 key */
interface CommandLike<T = unknown> {
  run: (payload?: T) => boolean
}

/**
 * 编辑器内核：在 MilkdownProvider 内部使用 useEditor，
 * 通过 refs 持有最新的 value/onChange/readonly，避免重建编辑器。
 */
function EditorCore(props: MilkdownEditorProps): ReactElement {
  const { value, onChange, readonly } = props

  // 持有最新 props 的 refs（供编辑器工厂与监听器读取，保证闭包始终拿到最新值）
  const valueRef = useRef<string>(value)
  const onChangeRef = useRef(onChange)
  const readonlyRef = useRef<boolean>(!!readonly)
  // 内部 markdown 缓存，用于判断外部 value 是否与编辑器一致以避免循环更新
  const internalRef = useRef<string>(value)
  // 源码/所见即所得切换
  const [mode, setMode] = useState<EditMode>('wysiwyg')

  useEffect(() => {
    valueRef.current = value
  }, [value])
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])
  useEffect(() => {
    readonlyRef.current = !!readonly
  }, [readonly])

  // 创建编辑器工厂（稳定引用，仅创建一次）
  // root 为 Milkdown 组件渲染的容器 div，必须写入 rootCtx，否则编辑器会挂载到 body
  const getEditor = useCallback((root: HTMLElement) => {
    return Editor.make()
      .use(commonmark)
      .use(gfm)
      .use(history)
      .use(clipboard)
      .use(emoji)
      .use(prism)
      .use(listener)
      .use(upload)
      .use(block)
      .config(nord)
      .config((ctx) => {
        // 设置编辑器挂载根节点
        ctx.set(rootCtx, root)
        // 设置初始值
        ctx.set(defaultValueCtx, valueRef.current)
        // 只读模式：editable 为函数，每次取最新 readonlyRef，支持运行时切换
        ctx.set(editorViewOptionsCtx, {
          editable: () => !readonlyRef.current,
          // 点击正文里的链接时在新标签页打开（编辑器内直接跳转会丢失未保存内容）
          handleClick: (_view, _pos, event) => {
            const anchor = (event.target as HTMLElement | null)?.closest?.('a')
            const href = anchor?.getAttribute('href')
            if (!href) return false
            window.open(href, '_blank', 'noopener,noreferrer')
            return true
          },
        })
        // 监听 markdown 变化：更新内部缓存并回调 onChange
        ctx.get(listenerCtx).markdownUpdated((_ctx, markdown) => {
          internalRef.current = markdown
          onChangeRef.current(markdown)
        })
      })
  }, [])

  const { loading, get } = useEditor(getEditor, [])

  // 外部 value 变化时同步到编辑器（仅当与内部不一致时，防止循环）
  useEffect(() => {
    const editor = get()
    if (!editor) return
    if (value === internalRef.current) return
    internalRef.current = value
    editor.action(replaceAll(value))
  }, [value, get, loading])

  // 只读状态变化时立即刷新编辑器可编辑属性：
  // editorViewOptionsCtx 里的 editable 函数只在 props 重新计算时才被求值，
  // 仅改 ref 不会同步 contenteditable，会出现「按钮已可点但正文仍无法输入」。
  useEffect(() => {
    const editor = get()
    if (!editor) return
    editor.action((ctx) => {
      ctx.get(editorViewCtx).setProps({ editable: () => !readonly })
    })
    readonlyRef.current = !!readonly
  }, [readonly, get, loading])

  /** 触发无参命令 */
  const callSimple = useCallback(
    (cmd: CommandLike) => {
      cmd.run()
    },
    [],
  )

  /** 触发带参命令 */
  const callWith = useCallback(
    <T,>(cmd: CommandLike<T>, payload: T) => {
      cmd.run(payload)
    },
    [],
  )

  // 工具栏按钮通用禁用态：未就绪、只读、源码模式
  const btnDisabled = loading || !!readonly || mode === 'source'

  /** 切换块级文本类型：0 = 正文，1/2/3 = 一/二/三级标题 */
  const handleBlockType = useCallback(
    (level: 0 | 1 | 2 | 3) => {
      if (btnDisabled) return
      if (level === 0) {
        // 列表项无法直接转段落，先退出列表（不在列表中时命令返回 false，无副作用）
        callSimple(liftListItemCommand)
        callSimple(turnIntoTextCommand)
        return
      }
      callWith(wrapInHeadingCommand, level)
    },
    [btnDisabled, callSimple, callWith],
  )

  /**
   * 有序/无序列表：
   * - 已在同类列表中再次点击 → 取消列表
   * - 已在异类列表中 → 直接切换列表类型
   * - 不在列表中 → 先把当前块（标题/代码块等）转为段落，再包裹成列表
   */
  const applyList = useCallback(
    (kind: 'bullet' | 'ordered') => {
      if (btnDisabled) return
      const editor = get()
      if (!editor) return

      let inList = false
      let sameType = false
      editor.action((ctx) => {
        const view = ctx.get(editorViewCtx)
        const bulletType = bulletListSchema.type(ctx)
        const orderedType = orderedListSchema.type(ctx)
        const targetType = kind === 'bullet' ? bulletType : orderedType
        const { $from } = view.state.selection
        for (let d = $from.depth; d > 0; d -= 1) {
          const node = $from.node(d)
          if (node.type !== bulletType && node.type !== orderedType) continue
          inList = true
          sameType = node.type === targetType
          // 异类列表：直接替换为该列表节点类型
          if (!sameType) view.dispatch(view.state.tr.setNodeMarkup($from.before(d), targetType))
          break
        }
      })

      if (inList) {
        if (sameType) callSimple(liftListItemCommand)
        return
      }
      callSimple(turnIntoTextCommand)
      callSimple(kind === 'bullet' ? wrapInBulletListCommand : wrapInOrderedListCommand)
    },
    [btnDisabled, callSimple, get],
  )

  const handleInsertLink = () => {
    if (btnDisabled) return
    const href = window.prompt('请输入链接地址')
    if (!href) return
    callWith(toggleLinkCommand, { href })
  }

  const handleInsertImage = () => {
    if (btnDisabled) return
    const src = window.prompt('请输入图片地址')
    if (!src) return
    callWith(insertImageCommand, { src, alt: '', title: '' })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 500 }}>
      {/* 工具栏 */}
      {/* onMouseDown 阻止按钮抢走编辑器焦点：否则点击格式按钮后选区失焦，
          后续输入会落到按钮上，表现为「点了格式却打不出字」 */}
      <div
        style={{
          padding: '8px 12px',
          borderBottom: '1px solid #f0f0f0',
          background: '#fafafa',
          borderRadius: 6,
        }}
        onMouseDown={(e) => e.preventDefault()}
      >
        <Space size={4} wrap>
          <Tooltip title="撤销 (Ctrl+Z)">
            <Button
              size="small"
              type="text"
              icon={<UndoOutlined />}
              disabled={btnDisabled}
              onClick={() => callSimple(undoCommand)}
            />
          </Tooltip>
          <Tooltip title="重做 (Ctrl+Y)">
            <Button
              size="small"
              type="text"
              icon={<RedoOutlined />}
              disabled={btnDisabled}
              onClick={() => callSimple(redoCommand)}
            />
          </Tooltip>
          <Divider type="vertical" style={{ margin: '0 4px' }} />
          <Tooltip title="正文">
            <Button size="small" type="text" disabled={btnDisabled} onClick={() => handleBlockType(0)}>
              正文
            </Button>
          </Tooltip>
          <Tooltip title="一级标题">
            <Button
              size="small"
              type="text"
              icon={<FontSizeOutlined />}
              disabled={btnDisabled}
              onClick={() => handleBlockType(1)}
            />
          </Tooltip>
          <Tooltip title="二级标题">
            <Button size="small" type="text" disabled={btnDisabled} onClick={() => handleBlockType(2)}>
              H2
            </Button>
          </Tooltip>
          <Tooltip title="三级标题">
            <Button size="small" type="text" disabled={btnDisabled} onClick={() => handleBlockType(3)}>
              H3
            </Button>
          </Tooltip>
          <Divider type="vertical" style={{ margin: '0 4px' }} />
          <Tooltip title="粗体 (Ctrl+B)">
            <Button
              size="small"
              type="text"
              icon={<BoldOutlined />}
              disabled={btnDisabled}
              onClick={() => callSimple(toggleStrongCommand)}
            />
          </Tooltip>
          <Tooltip title="斜体 (Ctrl+I)">
            <Button
              size="small"
              type="text"
              icon={<ItalicOutlined />}
              disabled={btnDisabled}
              onClick={() => callSimple(toggleEmphasisCommand)}
            />
          </Tooltip>
          <Tooltip title="删除线">
            <Button
              size="small"
              type="text"
              icon={<StrikethroughOutlined />}
              disabled={btnDisabled}
              onClick={() => callSimple(toggleStrikethroughCommand)}
            />
          </Tooltip>
          <Tooltip title="行内代码 (Ctrl+E)">
            <Button
              size="small"
              type="text"
              icon={<CodeOutlined />}
              disabled={btnDisabled}
              onClick={() => callSimple(toggleInlineCodeCommand)}
            />
          </Tooltip>
          <Divider type="vertical" style={{ margin: '0 4px' }} />
          <Tooltip title="引用">
            <Button
              size="small"
              type="text"
              icon={<BlockOutlined />}
              disabled={btnDisabled}
              onClick={() => callSimple(wrapInBlockquoteCommand)}
            />
          </Tooltip>
          <Tooltip title="无序列表">
            <Button
              size="small"
              type="text"
              icon={<UnorderedListOutlined />}
              aria-label="无序列表"
              disabled={btnDisabled}
              onClick={() => applyList('bullet')}
            />
          </Tooltip>
          <Tooltip title="有序列表">
            <Button
              size="small"
              type="text"
              icon={<OrderedListOutlined />}
              aria-label="有序列表"
              disabled={btnDisabled}
              onClick={() => applyList('ordered')}
            />
          </Tooltip>
          <Tooltip title="代码块 (Ctrl+Alt+C)">
            <Button
              size="small"
              type="text"
              icon={<CodeOutlined />}
              disabled={btnDisabled}
              onClick={() => callSimple(createCodeBlockCommand)}
            />
          </Tooltip>
          <Divider type="vertical" style={{ margin: '0 4px' }} />
          <Tooltip title="插入链接">
            <Button
              size="small"
              type="text"
              icon={<LinkOutlined />}
              disabled={btnDisabled}
              onClick={handleInsertLink}
            />
          </Tooltip>
          <Tooltip title="插入图片">
            <Button
              size="small"
              type="text"
              icon={<PictureOutlined />}
              disabled={btnDisabled}
              onClick={handleInsertImage}
            />
          </Tooltip>
          <Divider type="vertical" style={{ margin: '0 4px' }} />
          <Tooltip title={mode === 'wysiwyg' ? '切换到源码模式' : '切换到所见即所得'}>
            <Button
              size="small"
              type="text"
              icon={mode === 'wysiwyg' ? <EditOutlined /> : <EyeOutlined />}
              disabled={loading}
              onClick={() => setMode((m) => (m === 'wysiwyg' ? 'source' : 'wysiwyg'))}
            />
          </Tooltip>
        </Space>
      </div>

      {/* 编辑区：源码模式渲染 textarea，否则渲染 Milkdown */}
      <div style={{ flex: 1, overflow: 'auto', padding: '0 12px' }}>
        {mode === 'source' ? (
          <textarea
            value={value}
            onChange={(e) => {
              internalRef.current = e.target.value
              onChange(e.target.value)
            }}
            disabled={readonly}
            style={{
              width: '100%',
              minHeight: 460,
              padding: 12,
              border: '1px solid #f0f0f0',
              borderRadius: 6,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              fontSize: 14,
              resize: 'vertical',
              outline: 'none',
            }}
          />
        ) : (
          <div className="milkdown-editor-wrap" style={{ minHeight: 460 }}>
            <Milkdown />
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Milkdown 编辑器外层组件：必须用 MilkdownProvider 包裹内部使用 useEditor 的组件。
 */
export default function MilkdownEditor(props: MilkdownEditorProps): ReactElement {
  return (
    <MilkdownProvider>
      <EditorCore {...props} />
    </MilkdownProvider>
  )
}

