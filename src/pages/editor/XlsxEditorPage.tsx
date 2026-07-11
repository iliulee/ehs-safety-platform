import { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Save, Loader2, PanelRightOpen, PanelRightClose } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { XlsxEditor } from '@/components/editors/XlsxEditor'
import VariableMappingEditor from '@/components/business/VariableMappingEditor'
import { templateService } from '@/services/templateService'
import { templateRepo } from '@/db/repositories/template.repo'
import { xlsxBufferToUniverWorkbookData, univerWorkbookDataToXlsxBuffer } from '@/services/xlsx-univer.service'
import { toast } from 'sonner'
import type { Template, VariableMapping } from '@/types'
import type { IWorkbookData } from '@univerjs/core'

export default function XlsxEditorPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const saveApiRef = useRef<{ save: () => IWorkbookData } | null>(null)

  const [template, setTemplate] = useState<Template | null>(null)
  const [initialData, setInitialData] = useState<Partial<IWorkbookData> | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState<string>('')
  const [variableMappings, setVariableMappings] = useState<VariableMapping[]>([])
  const [showVariablePanel, setShowVariablePanel] = useState(false)

  const templateId = searchParams.get('id')

  const handleInsertVariable = (variableName: string) => {
    // 对于 Excel 编辑器，插入变量到指定单元格暂时不支持光标位置插入
    // 但按钮仍需显示，仅提示用户手动复制
    navigator.clipboard.writeText(`{{${variableName}}}`)
    toast.success(`已复制 {{${variableName}}} 到剪贴板，在 Excel 单元格中粘贴即可`)
  }

  useEffect(() => {
    if (!templateId) {
      toast.error('缺少模板 ID')
      navigate('/templates')
      return
    }

    let cancelled = false
    setLoading(true)
    setError('')

    templateService
      .get(templateId)
      .then(async (t) => {
        if (cancelled) return
        if (!t) {
          toast.error('模板不存在')
          navigate('/templates')
          return
        }
        if (t.fileType !== 'xlsx') {
          toast.error('该文件不是 Excel 模板')
          navigate('/templates')
          return
        }
        setTemplate(t)
        setVariableMappings(t.variableMappings ?? [])

        if (t.content) {
          try {
            const buffer = templateService.base64ToBuffer(t.content)
            const data = await xlsxBufferToUniverWorkbookData(buffer)
            setInitialData(data)
          } catch (err) {
            if (cancelled) return
            const message = err instanceof Error ? err.message : '解析失败'
            setError('解析 Excel 失败：' + message)
            setInitialData({ name: t.name })
          }
        } else {
          setInitialData({ name: t.name })
        }
      })
      .catch((err) => {
        if (cancelled) return
        toast.error('加载模板失败：' + (err instanceof Error ? err.message : '未知错误'))
        navigate('/templates')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [templateId, navigate])

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  const handleSave = async () => {
    if (!saveApiRef.current || !template?.id) return
    setSaving(true)
    try {
      const workbookData = saveApiRef.current.save()
      const buffer = await univerWorkbookDataToXlsxBuffer(workbookData)
      const base64 = await arrayBufferToBase64(buffer)
      await templateRepo.update(template.id, {
        content: base64,
        fileSize: buffer.byteLength,
        variableMappings: variableMappings.length > 0 ? variableMappings : undefined,
      } as Partial<Template>)
      setDirty(false)
      toast.success('已保存到模板库')
    } catch (err) {
      toast.error('保存失败：' + (err instanceof Error ? err.message : '未知错误'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-120px)] text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin mb-2" />
        <p className="text-sm">正在加载模板...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] -m-6 p-6 bg-slate-50">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => navigate('/templates')}>
            <ArrowLeft className="w-4 h-4" />
            返回模板库
          </Button>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{template?.name ?? 'Excel 编辑器'}</p>
            <p className="text-[11px] text-gray-500 truncate">{dirty ? '有未保存修改' : '已同步至模板库'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            onClick={() => setShowVariablePanel((v) => !v)}
            title={showVariablePanel ? '隐藏变量面板' : '显示变量面板'}
          >
            {showVariablePanel ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
            变量
          </Button>
          <Button size="sm" className="h-9 gap-1.5" onClick={handleSave} disabled={saving || !!error || !dirty}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? '保存中...' : '保存'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 text-red-700 text-sm">
          {error}，当前以空白工作簿打开，编辑后仍可保存。
        </div>
      )}

      <div className="flex-1 min-h-0 flex gap-0">
        <div className="flex-1 min-w-0">
          <XlsxEditor
            initialData={initialData}
            onReady={(api) => {
              saveApiRef.current = api
            }}
            onChange={() => setDirty(true)}
          />
        </div>
        {showVariablePanel && (
          <div className="w-[380px] flex-shrink-0 border-l border-gray-200 bg-white flex flex-col rounded-r-lg">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <p className="text-xs font-medium text-gray-600">变量配置</p>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setShowVariablePanel(false)}
                title="隐藏变量面板"
              >
                <PanelRightClose className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3">
              <VariableMappingEditor
                mappings={variableMappings}
                onChange={setVariableMappings}
                onInsert={handleInsertVariable}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function arrayBufferToBase64(buffer: ArrayBuffer): Promise<string> {
  return new Promise((resolve) => {
    const blob = new Blob([buffer])
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1]
      resolve(base64)
    }
    reader.readAsDataURL(blob)
  })
}