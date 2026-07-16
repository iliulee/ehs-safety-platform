import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Save, Loader2, PanelRightOpen, PanelRightClose, FileDown } from 'lucide-react'
import PizZip from 'pizzip'
import mammoth from 'mammoth'
import { Button } from '@/components/ui/button'
import { DocxEditor, type DocxEditorWrapperRef } from '@/components/editors/DocxEditor'
import VariableMappingEditor from '@/components/business/VariableMappingEditor'
import { templateService } from '@/services/templateService'
import { templateRepo } from '@/db/repositories/template.repo'
import { renderSingle } from '@/services/generate.service'
import { useAppStore } from '@/store'
import { Sheet } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
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
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)
  const [manualVariables, setManualVariables] = useState<VariableMapping[]>([])
  const [manualValues, setManualValues] = useState<Record<string, string>>({})

  const project = useAppStore((s) => s.currentProject)

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
          const buf = templateService.base64ToBuffer(t.content)
          // 校验 buffer 有效性：空内容或非 ZIP 格式会导致编辑器卡住
          if (buf.byteLength === 0) {
            toast.error('模板文件内容为空，无法打开')
            navigate('/templates')
            return
          }
          try {
            // docx 本质是 ZIP，用 PizZip 试解析验证合法性
            new PizZip(buf)
          } catch {
            toast.error('模板文件已损坏，无法解析为有效的 Word 文档')
            navigate('/templates')
            return
          }
          setBuffer(buf)
        } else {
          setBuffer(null)
        }
        // 过滤掉 XML 命名空间变量和纯数字变量名
        const cleanMappings = (t.variableMappings ?? []).filter((m) => {
          if (/^[a-z]+:/i.test(m.name)) return false
          if (/^\d+$/.test(m.name)) return false
          return true
        })
        setVariableMappings(cleanMappings)
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

  const handleExtractVariables = (): string[] => {
    const text = editorRef.current?.getText() ?? ''
    if (!text) return []
    const regex = /\{\{(.+?)\}\}/g
    const names = new Set<string>()
    let match: RegExpExecArray | null
    while ((match = regex.exec(text)) !== null) {
      const name = match[1].trim()
      // 过滤掉 XML 命名空间变量和无效变量名
      if (name && !/^[a-z]+:/i.test(name) && !/^\d+$/.test(name) && name.length > 0) {
        names.add(name)
      }
    }
    const result = Array.from(names)
    if (result.length === 0) {
      toast.info('文档中未找到 {{变量名}} 占位符')
    } else {
      toast.success(`识别到 ${result.length} 个变量`)
    }
    return result
  }

  const handleFallbackToPreview = async () => {
    if (!buffer) return
    setPreviewLoading(true)
    try {
      const result = await mammoth.convertToHtml({ arrayBuffer: buffer }, { includeDefaultStyleMap: true })
      setPreviewHtml(result.value)
    } catch (err) {
      toast.error('文本预览失败：' + (err instanceof Error ? err.message : '未知错误'))
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleGenerateDoc = async () => {
    if (!template?.id) return
    if (!project?.id) {
      toast.error('请先在左下角选择一个项目')
      return
    }
    if (template.isBuiltIn && !template.content) {
      toast.info('内置模板需先上传对应 Word 模板文件才能生成')
      return
    }
    setGenerating(true)
    try {
      const result = await renderSingle(template.id, {
        projectId: project.id,
        manualValues,
      })
      if (result.residualVariables && result.residualVariables.length > 0) {
        toast.warning(
          `文档中有 ${result.residualVariables.length} 个变量未被替换（如 ${result.residualVariables.slice(0, 3).join('、')}），请检查变量名是否与模板中的占位符一致`,
          { duration: 6000 }
        )
      }
      if (result.manualVariables.length > 0) {
        setManualVariables(result.manualVariables)
        const initial: Record<string, string> = {}
        result.manualVariables.forEach((v) => {
          initial[v.name] = manualValues[v.name] ?? ''
        })
        setManualValues((prev) => ({ ...prev, ...initial }))
        setManualOpen(true)
        return
      }
      if (result.missingRequired.length > 0) {
        toast.error(`以下必填变量缺少数据：${result.missingRequired.join('、')}`)
        return
      }
      if (!result.blob) {
        toast.error('生成失败：未得到文档 Blob')
        return
      }
      const url = URL.createObjectURL(result.blob)
      const a = document.createElement('a')
      a.href = url
      a.download = result.fileName
      a.click()
      URL.revokeObjectURL(url)
      toast.success('文档生成成功，开始下载')
    } catch (err) {
      toast.error('生成失败：' + (err instanceof Error ? err.message : '未知错误'))
    } finally {
      setGenerating(false)
    }
  }

  const handleManualConfirm = async () => {
    setManualOpen(false)
    if (!template?.id || !project?.id) return
    if (template.isBuiltIn && !template.content) {
      toast.info('内置模板需先上传对应 Word 模板文件才能生成')
      return
    }
    setGenerating(true)
    try {
      const result = await renderSingle(template.id, {
        projectId: project.id,
        manualValues,
      })
      if (!result.blob) {
        toast.error('生成失败：未得到文档 Blob')
        return
      }
      if (result.residualVariables && result.residualVariables.length > 0) {
        toast.warning(
          `文档中有 ${result.residualVariables.length} 个变量未被替换（如 ${result.residualVariables.slice(0, 3).join('、')}），请检查变量名是否与模板中的占位符一致`,
          { duration: 6000 }
        )
      }
      const url = URL.createObjectURL(result.blob)
      const a = document.createElement('a')
      a.href = url
      a.download = result.fileName
      a.click()
      URL.revokeObjectURL(url)
      toast.success('文档生成成功，开始下载')
    } catch (err) {
      toast.error('生成失败：' + (err instanceof Error ? err.message : '未知错误'))
    } finally {
      setGenerating(false)
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
            <p className="text-sm font-medium text-gray-800 truncate">{template?.name ?? 'Word 编辑器'}</p>
            <p className="text-[11px] text-gray-500 truncate">{dirty ? '有未保存修改' : '已同步至模板库'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="h-9 gap-1.5"
            onClick={handleGenerateDoc}
            disabled={generating || !template?.content}
          >
            {generating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileDown className="w-4 h-4" />
            )}
            {generating ? '生成中...' : '生成文档'}
          </Button>
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
          {previewHtml !== null ? (
            <div className="flex flex-col h-full bg-white rounded-lg border border-slate-200 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-amber-50 flex-shrink-0">
                <span className="text-xs text-amber-700">文本预览模式（编辑器未加载成功，仅显示文档内容）</span>
                <button
                  onClick={() => setPreviewHtml(null)}
                  className="text-xs text-amber-700 hover:text-amber-900 underline"
                >
                  返回编辑器
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                {previewLoading ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mb-2" />
                    <p className="text-sm">正在生成文本预览...</p>
                  </div>
                ) : (
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                  />
                )}
              </div>
            </div>
          ) : (
            <DocxEditor
              ref={editorRef}
              documentBuffer={buffer}
              documentName={template?.name}
              onChange={() => setDirty(true)}
              onError={(err) => toast.error('编辑器错误：' + err.message)}
              onFallbackToPreview={handleFallbackToPreview}
            />
          )}
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
                onExtractVariables={handleExtractVariables}
              />
            </div>
          </div>
        )}
      </div>

      <Sheet
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        title="补填手动变量"
        footer={
          <>
            <Button variant="outline" onClick={() => setManualOpen(false)}>
              取消
            </Button>
            <Button onClick={handleManualConfirm} disabled={generating}>
              {generating ? '生成中...' : '确认并生成'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            以下变量无法自动从项目数据获取，请手动填写后继续生成。
          </p>
          {manualVariables.map((v) => (
            <div key={v.name}>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                {v.label ?? v.name}
                {v.required && <span className="text-red-500 ml-0.5">*</span>}
              </label>
              <Input
                value={manualValues[v.name] ?? ''}
                onChange={(e) =>
                  setManualValues((prev) => ({ ...prev, [v.name]: e.target.value }))
                }
                placeholder={`请输入 ${v.label ?? v.name}`}
                className="h-9 text-sm"
              />
            </div>
          ))}
        </div>
      </Sheet>
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
