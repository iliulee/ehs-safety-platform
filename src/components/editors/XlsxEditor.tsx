import { useEffect, useRef, useState } from 'react'
import { createUniver, LocaleType, mergeLocales } from '@univerjs/presets'
import { UniverSheetsCorePreset } from '@univerjs/preset-sheets-core'
import UniverPresetSheetsCoreZhCN from '@univerjs/preset-sheets-core/locales/zh-CN'
import { defaultTheme } from '@univerjs/themes'
import '@univerjs/preset-sheets-core/lib/index.css'
import type { IWorkbookData, IDisposable } from '@univerjs/core'

interface XlsxEditorProps {
  initialData?: Partial<IWorkbookData>
  onReady?: (api: { save: () => IWorkbookData }) => void
  onChange?: () => void
}

export function XlsxEditor({ initialData, onReady, onChange }: XlsxEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const univerRef = useRef<ReturnType<typeof createUniver> | null>(null)
  const apiRef = useRef<{ save: () => IWorkbookData } | null>(null)
  const listenersRef = useRef<IDisposable[]>([])
  const dataRef = useRef(initialData)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  dataRef.current = initialData

  useEffect(() => {
    let disposed = false
    const container = containerRef.current
    if (!container) return

    const cleanup = () => {
      disposed = true
      listenersRef.current.forEach((l) => { try { l.dispose() } catch {} })
      listenersRef.current = []
      try {
        univerRef.current?.univer.dispose()
      } catch {
        // ignore dispose errors
      }
      univerRef.current = null
      apiRef.current = null
    }

    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const init = () => {
      if (disposed || !container) return
      const rect = container.getBoundingClientRect()
      if (rect.width < 200 || rect.height < 200) {
        timeoutId = setTimeout(init, 100)
        return
      }

      try {
        const { univerAPI, univer } = createUniver({
          locale: LocaleType.ZH_CN,
          locales: {
            [LocaleType.ZH_CN]: mergeLocales(UniverPresetSheetsCoreZhCN),
          },
          theme: defaultTheme,
          presets: [
            UniverSheetsCorePreset({
              container,
              toolbar: true,
              formulaBar: true,
              statusBarStatistic: true,
            }),
          ],
        })

        if (disposed) {
          univer.dispose()
          return
        }

        univerRef.current = { univerAPI, univer }

        const workbook = univerAPI.createWorkbook(dataRef.current ?? { name: '工作簿1' })
        apiRef.current = {
          save: () => workbook.save(),
        }

        if (onChange) {
          const disposable = univerAPI.addEvent(univerAPI.Event.CommandExecuted, (event) => {
            const commandId = event?.id ?? ''
            // 过滤掉非数据变更命令，避免选中、滚动等触发 dirty
            if (
              commandId.includes('set-range-values') ||
              commandId.includes('set-range-styles') ||
              commandId.includes('insert-row') ||
              commandId.includes('insert-column') ||
              commandId.includes('delete-row') ||
              commandId.includes('delete-column') ||
              commandId.includes('merge-cell') ||
              commandId.includes('unmerge-cell') ||
              commandId.includes('set-worksheet') ||
              commandId.includes('clear-range')
            ) {
              onChange()
            }
          })
          listenersRef.current.push(disposable)
        }

        onReady?.(apiRef.current)
        setStatus('ready')
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.error('Univer 初始化失败:', err)
        setErrorMsg(message || '表格编辑器初始化失败')
        setStatus('error')
      }
    }

    timeoutId = setTimeout(init, 50)

    return () => {
      if (timeoutId) clearTimeout(timeoutId)
      cleanup()
    }
  }, [onReady, onChange])

  return (
    <div className="relative w-full h-full min-h-[500px] bg-white rounded-lg border border-slate-200 overflow-hidden">
      {status !== 'ready' && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white text-slate-400 text-sm">
          {status === 'loading' && (
            <>
              <span className="w-5 h-5 border-2 border-slate-200 border-t-emerald-500 rounded-full animate-spin mb-2" />
              正在加载表格编辑器...
            </>
          )}
          {status === 'error' && (
            <div className="text-center px-6">
              <p className="text-red-500 mb-1">表格编辑器加载失败</p>
              <p className="text-xs text-slate-500 break-all">{errorMsg}</p>
            </div>
          )}
        </div>
      )}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  )
}
