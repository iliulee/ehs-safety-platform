import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Save, Loader2, PanelRightOpen, PanelRightClose } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DocxEditor, type DocxEditorWrapperRef } from '@/components/editors/DocxEditor'
import VariableMappingEditor from '@/components/business/VariableMappingEditor'
import { templateService } from '@/services/templateService'
import { templateRepo } from '@/db/repositories/template.repo'
import { toast } from 'sonner'
import type { Template, VariableMapping } from '@/types'

export default function DocxEditorPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const editorRef = useRef<DocxEditorWrapperRef>(null)
  const [template, setTemplate] = useState<Template | null>(null)
  const [buffer, setBuffer] = useState<ArrayBuffer | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [variableMappings, setVariableMappings] = useState<VariableMapping[]>([])
  const [showVariablePanel, setShowVariablePanel] = useState(false)

  const templateId = searchParams.get('id')

  useEffect(() => {
    if (!templateId) {
      toast.error('缺少模板 ID')
      navigate('/templates')
      return
    }

    let cancelled = false
    setLoading(true)

    templateService
      .get(templateId)
      .then((t) => {
        if (cancelled) return
        if (!t) {
          toast.error('模板不存在')
          navigate('/templates')
          return
        }
        if (t.fileType !== 'docx') {
          toast.error('该文件不是 Word 模板')
          navigate('/templates')
          return
        }
        setTemplate(t)
        if (t.content) {
          setBuffer(templateService.base64ToBuffer(t.content))
        } else {
          setBuffer(null)
        }
        setVariableMappings(t.variableMappings ?? [])
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
    if (!editorRef.current || !template?.id) return
    setSaving(true)
    try {
      const newBuffer = await editorRef.current.save()
      if (!newBuffer) {
        toast.error('保存失败：编辑器未返回内容')
        return
      }
      const base64 = await arrayBufferToBase64(newBuffer)
      await templateRepo.update(template.id, {
        content: base64,
        fileSize: newBuffer.byteLength,
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

  const handleInsertVariable = (variableName: string) => {
    editorRef.current?.insertText(`{{${variableName}}}`)
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
            <p className="text-sm font-medium text-gray-800 truncate">{template?.name ?? 'Word 编辑器'}</p>
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
          <Button size="sm" className="h-9 gap-1.5" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? '保存中...' : '保存'}
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex gap-0">
        <div className="flex-1 min-w-0">
          <DocxEditor
            ref={editorRef}
            documentBuffer={buffer}
            documentName={template?.name}
            onChange={() => setDirty(true)}
            onError={(err) => toast.error('编辑器错误：' + err.message)}
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
                key={template?.id}
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
