import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { DocxEditor as EigenpalDocxEditor } from '@eigenpal/docx-editor-react'
import '@eigenpal/docx-editor-react/styles.css'
import { Loader2, AlertCircle } from 'lucide-react'
import type { DocxEditorRef } from '@eigenpal/docx-editor-react'

export interface DocxEditorWrapperRef {
  save: () => Promise<ArrayBuffer | null>
  insertText: (text: string) => void
}

interface DocxEditorWrapperProps {
  documentBuffer: ArrayBuffer | null
  documentName?: string
  onChange?: () => void
  onError?: (err: Error) => void
}

export const DocxEditor = forwardRef<DocxEditorWrapperRef, DocxEditorWrapperProps>(
  function DocxEditorWrapper({ documentBuffer, documentName, onChange, onError }, ref) {
    const editorRef = useRef<DocxEditorRef>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string>('')

    useImperativeHandle(ref, () => ({
      save: async () => {
        try {
          return await editorRef.current?.save({ selective: false }) ?? null
        } catch (err) {
          const message = err instanceof Error ? err.message : '保存失败'
          setError(message)
          onError?.(err instanceof Error ? err : new Error(message))
          return null
        }
      },
      insertText: (text: string) => {
        // 通过 ProseMirror API 插入文本（Eigenpal 编辑器基于 ProseMirror）
        const editorInner = editorRef.current?.getEditorRef?.()
        if (editorInner) {
          editorInner.focus()
          const state = editorInner.getState()
          if (state) {
            const tr = state.tr.insertText(text)
            editorInner.dispatch(tr)
            onChange?.()
            return
          }
        }

        // 兜底：尝试 execCommand（对非 ProseMirror 环境）
        try {
          document.execCommand('insertText', false, text)
          onChange?.()
        } catch {
          // 静默失败
        }
      },
    }))

    // 当 documentBuffer 变化时（打开新模板），重置 loading
    useEffect(() => {
      if (documentBuffer) {
        setLoading(true)
      }
    }, [documentBuffer])

    if (!documentBuffer) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[500px] text-slate-400 bg-white rounded-lg border border-slate-200">
          <AlertCircle className="w-8 h-8 mb-2 text-slate-300" />
          <p className="text-sm">没有可编辑的文档内容</p>
        </div>
      )
    }

    return (
      <div className="relative w-full h-full min-h-[500px] bg-white rounded-lg border border-slate-200 overflow-hidden">
        {loading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mb-2" />
            <p className="text-sm">正在加载 Word 编辑器...</p>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white text-red-500 px-6 text-center">
            <AlertCircle className="w-8 h-8 mb-2" />
            <p className="text-sm">{error}</p>
          </div>
        )}
        <EigenpalDocxEditor
          ref={editorRef}
          documentBuffer={documentBuffer}
          documentName={documentName ?? '未命名文档'}
          documentNameEditable={false}
          showToolbar
          showFileOpen={false}
          showHelpMenu={false}
          author="安全管理平台"
          onFontsLoaded={() => setLoading(false)}
          onChange={() => {
            setLoading(false)
            onChange?.()
          }}
          onError={(err) => {
            setLoading(false)
            setError(err.message)
            onError?.(err)
          }}
          className="w-full h-full"
        />
      </div>
    )
  }
)
