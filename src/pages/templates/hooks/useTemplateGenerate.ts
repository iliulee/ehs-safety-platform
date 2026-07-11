import { useState } from 'react'
import { renderSingle, batchGenerateAndDownload, type RenderResult, type BatchRenderResult } from '@/services/generate.service'
import { useAppStore } from '@/store'
import type { Template, VariableMapping } from '@/types'
import { toast } from 'sonner'

export function useTemplateGenerate() {
  const [generating, setGenerating] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)
  const [manualTemplate, setManualTemplate] = useState<Template | null>(null)
  const [manualVariables, setManualVariables] = useState<VariableMapping[]>([])
  const [manualValues, setManualValues] = useState<Record<string, string>>({})
  const [batchResult, setBatchResult] = useState<BatchRenderResult | null>(null)
  const [batchOpen, setBatchOpen] = useState(false)

  const project = useAppStore((s) => s.currentProject)

  const finishDownload = async (result: RenderResult) => {
    if (!result.blob) return
    const url = URL.createObjectURL(result.blob)
    const a = document.createElement('a')
    a.href = url
    a.download = result.fileName
    a.click()
    URL.revokeObjectURL(url)
    toast.success('文档生成成功，开始下载')
  }

  const executeRender = async (template: Template) => {
    setGenerating(true)
    try {
      if (template.isBuiltIn && !template.content) {
        toast.info('内置模板需先上传对应 Word 模板文件才能生成')
        return
      }
      const result = await renderSingle(template.id!, { projectId: project?.id, manualValues })
      if (result.manualVariables.length > 0) {
        setManualTemplate(template)
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
      await finishDownload(result)
    } catch (err) {
      toast.error('生成失败：' + (err instanceof Error ? err.message : '未知错误'))
    } finally {
      setGenerating(false)
    }
  }

  const handleGenerate = async (template: Template) => {
    await executeRender(template)
  }

  const handleManualConfirm = async () => {
    setManualOpen(false)
    if (!manualTemplate) return
    await executeRender(manualTemplate)
  }

  const handleBatchGenerate = async (selectedIds: Set<string>) => {
    if (selectedIds.size === 0) {
      toast.error('请至少选择一个模板')
      return
    }
    if (!project?.id) {
      toast.error('请先在左下角选择一个项目')
      return
    }
    setGenerating(true)
    try {
      const result = await batchGenerateAndDownload(Array.from(selectedIds), { projectId: project.id })
      setBatchResult(result)
      setBatchOpen(true)
      if (result.success > 0) {
        toast.success(`批量生成完成：成功 ${result.success} 份，跳过 ${result.skipped} 份，失败 ${result.failed} 份`)
      } else if (result.skipped > 0) {
        toast.warning('有模板需要手动填写变量或缺少必填数据')
      } else if (result.failed > 0) {
        toast.error('批量生成失败，请查看详情')
      }
    } catch (err) {
      toast.error('批量生成失败：' + (err instanceof Error ? err.message : '未知错误'))
    } finally {
      setGenerating(false)
    }
  }

  return {
    generating,
    manualOpen,
    setManualOpen,
    manualTemplate,
    manualVariables,
    manualValues,
    setManualValues,
    batchResult,
    batchOpen,
    setBatchOpen,
    handleGenerate,
    handleManualConfirm,
    handleBatchGenerate,
  }
}
