import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { DocxEditor as EigenpalDocxEditor } from '@eigenpal/docx-editor-react'
import '@eigenpal/docx-editor-react/styles.css'
import { Loader2, AlertCircle, RefreshCw, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { DocxEditorRef } from '@eigenpal/docx-editor-react'

const LOADING_TIMEOUT_MS = 8000

export interface DocxEditorWrapperRef {
  save: () => Promise<ArrayBuffer | null>
  insertText: (text: string) => void
  getText: () => string
}

interface DocxEditorWrapperProps {
  documentBuffer: ArrayBuffer | null
  documentName?: string
  onChange?: () => void
  onError?: (err: Error) => void
  onFallbackToPreview?: () => void
}

export const DocxEditor = forwardRef<DocxEditorWrapperRef, DocxEditorWrapperProps>(
  function DocxEditorWrapper({ documentBuffer, documentName, onChange, onError, onFallbackToPreview }, ref) {
    const editorRef = useRef<DocxEditorRef>(null)
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string>('')
    const [retryKey, setRetryKey] = useState(0)

    const clearLoading = useCallback(() => {
      setLoading(false)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }, [])

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
      getText: () => {
        const state = editorRef.current?.getEditorRef?.()?.getState()
        return state?.doc?.textContent ?? ''
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

    // 当 documentBuffer 变化时（打开新模板），重置 loading 并启动超时
    useEffect(() => {
      if (documentBuffer) {
        setLoading(true)
      }
    }, [documentBuffer])

    // 加载超时保护：如果 8 秒内 onFontsLoaded/onChange 没触发，自动关闭 loading
    useEffect(() => {
      if (!documentBuffer || !loading) return

      timeoutRef.current = setTimeout(() => {
        setLoading(false)
        setError('加载超时，文档可能无法正常显示。请尝试刷新页面或重新导入文件。')
      }, LOADING_TIMEOUT_MS)

      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
          timeoutRef.current = null
        }
      }
    }, [documentBuffer, loading])

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
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white px-6 text-center">
            <AlertCircle className="w-8 h-8 mb-2 text-red-400" />
            <p className="text-sm text-slate-500 mb-4">{error}</p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5"
                onClick={() => {
                  setError('')
                  setLoading(true)
                  setRetryKey((k) => k + 1)
                }}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                重试
              </Button>
              {onFallbackToPreview && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5"
                  onClick={onFallbackToPreview}
                >
                  <Eye className="w-3.5 h-3.5" />
                  使用文本预览
                </Button>
              )}
            </div>
          </div>
        )}
        <EigenpalDocxEditor
          key={retryKey}
          ref={editorRef}
          documentBuffer={documentBuffer}
          documentName={documentName ?? '未命名文档'}
          documentNameEditable={false}
          showToolbar
          showFileOpen={false}
          showHelpMenu={false}
          author="安全管理平台"
          onFontsLoaded={() => {
            console.log('[DocxEditor] onFontsLoaded fired')
            clearLoading()
          }}
          onChange={() => {
            console.log('[DocxEditor] onChange fired')
            clearLoading()
            onChange?.()
          }}
          onError={(err) => {
            console.log('[DocxEditor] onError fired:', err.message)
            clearLoading()
            setError(err.message)
            onError?.(err)
          }}
          className="w-full h-full"
        />
      </div>
    )
  }
)
