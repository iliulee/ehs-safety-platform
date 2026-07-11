import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet } from '@/components/ui/sheet'
import VariableMappingEditor from '@/components/business/VariableMappingEditor'
import { TemplateDocPreview } from './TemplateDocPreview'
import type { Template, VariableMapping } from '@/types'
import { templateService } from '@/services/templateService'
import mammoth from 'mammoth'

interface VariableMappingSheetProps {
  template: Template | null
  open: boolean
  onClose: () => void
  mappings: VariableMapping[]
  onMappingsChange: (mappings: VariableMapping[]) => void
  onSave: () => void
  onGenerate: () => void
  generating: boolean
}

export function VariableMappingSheet({
  template,
  open,
  onClose,
  mappings,
  onMappingsChange,
  onSave,
  onGenerate,
  generating,
}: VariableMappingSheetProps) {
  const [docHtml, setDocHtml] = useState('')
  const [activeVariable, setActiveVariable] = useState<string | null>(null)
  const variableRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  // 加载文档预览，并给 {{变量}} 添加点击高亮
  useEffect(() => {
    if (!template?.content) {
      setDocHtml('')
      return
    }
    try {
      const buf = templateService.base64ToBuffer(template.content)
      mammoth
        .convertToHtml({ arrayBuffer: buf }, { includeDefaultStyleMap: true })
        .then((result) => {
          // 将 {{变量名}} 包裹为可点击的 span
          const processed = result.value.replace(
            /\{\{([^}]+)\}\}/g,
            (_, name: string) => {
              const varName = name.trim()
              return `<span class="var-tag" data-varname="${varName}" style="background:#EDE9FE;color:#5B21B6;border-radius:4px;padding:1px 6px;cursor:pointer;font-weight:500;border:1px solid #C4B5FD;transition:all 0.15s;">${varName}</span>`
            }
          )
          setDocHtml(processed)
        })
        .catch(() => setDocHtml(''))
    } catch {
      setDocHtml('')
    }
  }, [template])

  // 点击文档中的变量，滚动到右侧对应条目
  const scrollToVariable = useCallback((name: string) => {
    setActiveVariable(name)
    const el = variableRefs.current.get(name)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [])

  // 处理文档预览区的点击事件
  const handleDocClick = useCallback(
    (e: React.MouseEvent) => {
      const target = (e.target as HTMLElement).closest('.var-tag') as HTMLElement | null
      if (target) {
        const varName = target.getAttribute('data-varname')
        if (varName) scrollToVariable(varName)
      }
    },
    [scrollToVariable]
  )

  const unmappedCount = mappings.filter((m) => m.source === 'manual' && !m.defaultValue).length

  const footer = template ? (
    <>
      <Button variant="outline" className="h-9 text-xs px-3" onClick={onSave}>
        保存映射
      </Button>
      <Button
        className="flex-1 h-9 text-xs"
        onClick={onGenerate}
        disabled={generating || (template.isBuiltIn && !template.content)}
      >
        {generating ? '生成中...' : '下载 Word'}
      </Button>
    </>
  ) : undefined

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={template?.name ?? '模板编辑'}
      footer={footer}
      className="max-w-[960px]"
    >
      {template && (
        <div className="flex gap-0" style={{ minHeight: '55vh' }}>
          {/* 左侧：文档预览 */}
          <div className="flex-1 min-w-0 border-r border-gray-100 overflow-y-auto" style={{ maxHeight: '60vh' }}>
            <div className="px-4 py-3 border-b border-gray-50 bg-gray-50/50 sticky top-0 z-10">
              <p className="text-xs font-medium text-gray-600">文档预览</p>
              <p className="text-[11px] text-gray-400 mt-0.5">点击高亮变量可定位到右侧配置</p>
            </div>
            <div className="p-4" onClick={handleDocClick}>
              {docHtml ? (
                <div
                  className="text-sm text-gray-800 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: docHtml }}
                />
              ) : (
                <TemplateDocPreview template={template} />
              )}
            </div>
          </div>

          {/* 右侧：变量配置面板 */}
          <div className="w-[340px] flex-shrink-0 flex flex-col">
            <div className="px-4 py-3 border-b border-gray-50 bg-gray-50/50">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-gray-600">变量配置</p>
                {unmappedCount > 0 && (
                  <span className="text-[11px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                    {unmappedCount} 个未映射
                  </span>
                )}
              </div>
              <Input
                placeholder="搜索变量..."
                className="mt-2 h-7 text-xs"
              />
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3" style={{ maxHeight: '52vh' }}>
              <VariableMappingEditor
                mappings={mappings}
                onChange={onMappingsChange}
                activeVariable={activeVariable}
                variableRefs={variableRefs}
              />
            </div>
          </div>
        </div>
      )}
    </Sheet>
  )
}
