import { useEffect, useState } from 'react'
import mammoth from 'mammoth'
import { Loader2, FileText } from 'lucide-react'
import { templateService } from '@/services/templateService'
import type { Template } from '@/types'

interface TemplateDocPreviewProps {
  template: Template
}

export function TemplateDocPreview({ template }: TemplateDocPreviewProps) {
  const [html, setHtml] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    if (!template.content) {
      setHtml('')
      setError('该模板没有文件内容，请先上传或导入 Word 模板文件。')
      return
    }

    let cancelled = false
    setLoading(true)
    setError('')

    const buf = templateService.base64ToBuffer(template.content)
    mammoth
      .convertToHtml({ arrayBuffer: buf }, { includeDefaultStyleMap: true })
      .then((result) => {
        if (cancelled) return
        setHtml(result.value)
      })
      .catch((err) => {
        if (cancelled) return
        setError('文档预览失败：' + (err instanceof Error ? err.message : '未知错误'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [template.id, template.content])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin mb-2" />
        <p className="text-xs">正在加载文档预览...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <FileText className="w-8 h-8 mb-2 text-gray-300" />
        <p className="text-xs text-center max-w-xs">{error}</p>
      </div>
    )
  }

  return (
    <div
      className="prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-table:border-collapse prose-td:border prose-td:border-gray-200 prose-td:p-1.5 prose-th:border prose-th:border-gray-200 prose-th:p-1.5 prose-th:bg-gray-50"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
