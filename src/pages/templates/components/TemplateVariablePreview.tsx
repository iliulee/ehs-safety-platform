import { useEffect, useMemo, useState } from 'react'
import mammoth from 'mammoth'
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { renderSingle } from '@/services/generate.service'
import { projectService } from '@/services/projectService'
import { variableSettingsService } from '@/services/variable-settings.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Template, VariableMapping } from '@/types'

interface TemplateVariablePreviewProps {
  template: Template
  mappings: VariableMapping[]
  manualValues: Record<string, string>
  onManualValuesChange: (values: Record<string, string>) => void
}

const SOURCE_LABEL: Record<string, string> = {
  field: '项目字段',
  extraField: '扩展字段',
  statistic: '统计值',
  related: '关联清单',
  ai: 'AI 生成',
  currentUser: '当前用户',
  currentDate: '当前日期',
  formula: '公式',
  manual: '手动填写',
}

export function TemplateVariablePreview({
  template,
  mappings,
  manualValues,
  onManualValuesChange,
}: TemplateVariablePreviewProps) {
  const [project, setProject] = useState<Awaited<ReturnType<typeof projectService.getCurrent>> | null>(null)
  const [variables, setVariables] = useState<Awaited<ReturnType<typeof variableSettingsService.list>> | null>(null)
  const [renderedHtml, setRenderedHtml] = useState<string>('')
  const [renderLoading, setRenderLoading] = useState(false)
  const [renderError, setRenderError] = useState<string>('')
  const [missing, setMissing] = useState<string[]>([])

  useEffect(() => {
    projectService.getCurrent().then(setProject).catch(console.error)
    variableSettingsService.list().then(setVariables).catch(console.error)
  }, [template.id])

  const manualMappings = useMemo(() => mappings.filter((m) => m.source === 'manual'), [mappings])

  const resolved = useMemo(() => {
    if (!project || !variables) return []
    return mappings.map((m) => {
      let value = ''
      let missing = false

      if (m.source === 'manual') {
        value = manualValues[m.name] ?? m.defaultValue ?? ''
        missing = value === '' && m.required !== false
      } else if (m.source === 'currentDate') {
        value = new Date().toLocaleDateString('zh-CN')
      } else if (m.source === 'field' && m.field) {
        const v = (project as unknown as Record<string, unknown>)[m.field]
        value = v !== undefined && v !== null ? String(v) : ''
        missing = value === '' && m.required !== false
      } else if (m.source === 'extraField' && m.extraFieldKey) {
        const v = project.extraFields?.[m.extraFieldKey]
        value = v !== undefined && v !== null ? String(v) : ''
        missing = value === '' && m.required !== false
      } else if (m.source === 'currentUser') {
        value = '当前用户'
      }

      return { ...m, displayValue: value, missing }
    })
  }, [mappings, project, variables, manualValues])

  const handleRender = async () => {
    if (!template.content) {
      setRenderError('模板没有文件内容，无法渲染预览。')
      return
    }
    setRenderLoading(true)
    setRenderError('')
    setRenderedHtml('')
    try {
      const result = await renderSingle(template.id!, { manualValues })
      setMissing(result.missingRequired)
      if (result.manualVariables.length > 0) {
        setRenderError(`还有 ${result.manualVariables.length} 个手动变量未填写。`)
      } else if (result.blob) {
        const arrayBuffer = await result.blob.arrayBuffer()
        const htmlResult = await mammoth.convertToHtml({ arrayBuffer }, { includeDefaultStyleMap: true })
        setRenderedHtml(htmlResult.value)
      }
    } catch (err) {
      setRenderError('渲染失败：' + (err instanceof Error ? err.message : '未知错误'))
    } finally {
      setRenderLoading(false)
    }
  }

  const hasMissing = resolved.some((r) => r.missing)

  return (
    <div className="space-y-4">
      {hasMissing && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>部分必填变量未取值，生成文档时可能留空或弹窗提示。</p>
        </div>
      )}

      <div className="border border-gray-100 rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-3 py-2 text-xs font-medium text-gray-600 flex items-center gap-2">
          <span className="flex-1">变量</span>
          <span className="w-20 text-center">来源</span>
          <span className="w-32 text-right">当前值</span>
        </div>
        <div className="divide-y divide-gray-100 max-h-[240px] overflow-y-auto">
          {resolved.map((item) => (
            <div
              key={item.name}
              className={`px-3 py-2 flex items-center gap-2 text-xs ${item.missing ? 'bg-red-50/50' : ''}`}
            >
              <span className="flex-1 truncate font-medium text-gray-800" title={item.name}>
                {item.label || item.name}
              </span>
              <span className="w-20 text-center text-gray-500">{SOURCE_LABEL[item.source] || item.source}</span>
              <span className="w-32 text-right truncate text-gray-600">
                {item.displayValue || <span className="text-gray-300">未设置</span>}
              </span>
            </div>
          ))}
          {resolved.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-4">没有变量</p>
          )}
        </div>
      </div>

      {manualMappings.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-gray-700">手动填写变量</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {manualMappings.map((m) => (
              <div key={m.name}>
                <label className="text-[11px] text-gray-500 mb-1 block">{m.label || m.name}</label>
                <Input
                  value={manualValues[m.name] ?? m.defaultValue ?? ''}
                  onChange={(e) => onManualValuesChange({ ...manualValues, [m.name]: e.target.value })}
                  placeholder={m.defaultValue || '请输入'}
                  className="h-8 text-xs"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          className="h-9 text-xs"
          onClick={handleRender}
          disabled={renderLoading || !template.content}
        >
          {renderLoading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />}
          渲染后预览
        </Button>
        {missing.length > 0 && (
          <span className="text-[11px] text-red-600">缺失：{missing.join('、')}</span>
        )}
      </div>

      {renderError && (
        <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>{renderError}</p>
        </div>
      )}

      {renderedHtml && (
        <div className="border border-gray-100 rounded-lg p-3 bg-white">
          <h4 className="text-xs font-medium text-gray-700 mb-2">渲染结果预览</h4>
          <div
            className="prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-table:border-collapse prose-td:border prose-td:border-gray-200 prose-td:p-1.5 prose-th:border prose-th:border-gray-200 prose-th:p-1.5 prose-th:bg-gray-50"
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />
        </div>
      )}
    </div>
  )
}
