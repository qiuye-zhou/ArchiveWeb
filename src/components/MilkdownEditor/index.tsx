/**
 * Milkdown 富文本编辑器组件
 * - 基于 @milkdown/react 的 MilkdownProvider + useEditor
 * - 集成 commonmark / gfm / history / clipboard / emoji / prism / listener / upload / block 插件
 * - 通过 listener 插件监听 markdown 变化并回调 onChange
 * - 外部 value 变化时通过 replaceAll 同步到编辑器（避免循环更新）
 * - 工具栏：粗体/斜体/删除线/标题/列表/引用/代码块/链接/图片/撤销/重做 + 源码切换
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
import { Editor, editorViewOptionsCtx, defaultValueCtx, rootCtx } from '@milkdown/core'
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
        ctx.set(editorViewOptionsCtx, { editable: () => !readonlyRef.current })
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
      <div
        style={{
          padding: '8px 12px',
          borderBottom: '1px solid #f0f0f0',
          background: '#fafafa',
          borderRadius: 6,
        }}
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
          <Tooltip title="一级标题">
            <Button
              size="small"
              type="text"
              icon={<FontSizeOutlined />}
              disabled={btnDisabled}
              onClick={() => callWith(wrapInHeadingCommand, 1)}
            />
          </Tooltip>
          <Tooltip title="二级标题">
            <Button
              size="small"
              type="text"
              disabled={btnDisabled}
              onClick={() => callWith(wrapInHeadingCommand, 2)}
            >
              H2
            </Button>
          </Tooltip>
          <Tooltip title="三级标题">
            <Button
              size="small"
              type="text"
              disabled={btnDisabled}
              onClick={() => callWith(wrapInHeadingCommand, 3)}
            >
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
              disabled={btnDisabled}
              onClick={() => callSimple(wrapInBulletListCommand)}
            />
          </Tooltip>
          <Tooltip title="有序列表">
            <Button
              size="small"
              type="text"
              icon={<OrderedListOutlined />}
              disabled={btnDisabled}
              onClick={() => callSimple(wrapInOrderedListCommand)}
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

