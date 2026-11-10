import { MdEditor, type ToolbarNames } from 'md-editor-rt'
import 'md-editor-rt/lib/style.css'

export interface MarkdownEditorProps {
  /** Markdown 内容 */
  value: string
  /** 内容变化回调 */
  onChange: (value: string) => void
  /** 只读模式 */
  readOnly?: boolean
  /** 高度，默认撑满父容器 */
  height?: string
}

/**
 * 基于 md-editor-rt（与 mix-manage 的 md-editor-v3 同系列）的 Markdown 编辑器。
 * 工具栏对齐 mix-manage：粗体/下划线/斜体/删除线/标题/上下标/引用/有序无序列表/
 * 任务列表/行内代码/代码块/链接/图片/表格/撤销/重做/全屏，并用 previewOnly 切换预览。
 * 默认不展示分栏预览（preview=false），点击预览按钮直接整屏切换，不做左右分屏。
 */
const TOOLBARS: ToolbarNames[] = [
  'bold',
  'underline',
  'italic',
  'strikeThrough',
  '-',
  'title',
  'sub',
  'sup',
  'quote',
  'unorderedList',
  'orderedList',
  'task',
  '-',
  'codeRow',
  'code',
  'link',
  'image',
  'table',
  '-',
  'revoke',
  'next',
  '=',
  'pageFullscreen',
  'previewOnly',
]

export default function MarkdownEditor({
  value,
  onChange,
  readOnly = false,
  height = '100%',
}: MarkdownEditorProps) {
  return (
    <MdEditor
      id="archive-doc-editor"
      value={value}
      onChange={onChange}
      theme="light"
      language="zh-CN"
      placeholder="开始书写文档…"
      toolbars={TOOLBARS}
      preview={false}
      previewTheme="github"
      readOnly={readOnly}
      showCodeRowNumber
      // 关闭编辑器自带的状态栏字数：它统计的是原始字符串长度（含 Markdown 语法符号），
      // 与页头 countWords 的口径不一致，会出现「上方字数」和「下方字数」对不上。
      // 字数统一由页头展示。
      footers={[]}
      style={{ height }}
    />
  )
}
