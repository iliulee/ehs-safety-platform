import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import type { VariableMapping } from '@/types'

const SOURCE_OPTIONS: { value: VariableMapping['source']; label: string }[] = [
  { value: 'field', label: '项目字段' },
  { value: 'related', label: '关联列表' },
  { value: 'currentDate', label: '当前日期' },
  { value: 'currentUser', label: '当前用户' },
  { value: 'manual', label: '手动填写' },
  { value: 'formula', label: '公式' },
  { value: 'statistic', label: '统计' },
  { value: 'ai', label: 'AI 生成' },
]

const PROJECT_FIELDS = [
  'name', 'code', 'location', 'startDate', 'endDate',
  'contractor', 'supervisor', 'owner',
  'managerName', 'techDirector',
  'safetyOfficer', 'safetyOfficerPhone', 'description',
]

interface VariableMappingEditorProps {
  mappings: VariableMapping[]
  onChange?: (mappings: VariableMapping[]) => void
  readOnly?: boolean
}

export default function VariableMappingEditor({
  mappings,
  onChange,
  readOnly = false,
}: VariableMappingEditorProps) {
  const [items, setItems] = useState<VariableMapping[]>([])

  useEffect(() => {
    setItems(mappings ?? [])
  }, [mappings])

  const updateItem = (index: number, patch: Partial<VariableMapping>) => {
    setItems((prev) => {
      const next = prev.map((m, i) => (i === index ? { ...m, ...patch } : m))
      onChange?.(next)
      return next
    })
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-12 gap-2 text-[10px] text-gray-500 px-1">
        <div className="col-span-2">变量名</div>
        <div className="col-span-2">显示名</div>
        <div className="col-span-3">数据来源 / 映射</div>
        <div className="col-span-3">默认值</div>
        <div className="col-span-1 text-center">必填</div>
        <div className="col-span-1" />
      </div>
      {items.map((m, index) => (
        <div
          key={`${m.name}-${index}`}
          className="grid grid-cols-12 gap-2 items-start bg-gray-50 rounded-md p-2"
        >
          <div className="col-span-2 flex items-center h-8">
            <code className="text-[11px] bg-white border border-gray-200 rounded px-1.5 py-0.5 truncate">
              {'{{'}{m.name}{'}}'}
            </code>
          </div>
          <div className="col-span-2">
            <Input
              value={m.label ?? m.name}
              onChange={(e) => updateItem(index, { label: e.target.value })}
              disabled={readOnly}
              className="h-7 text-xs"
            />
          </div>
          <div className="col-span-3 space-y-1">
            <select
              value={m.source}
              onChange={(e) =>
                updateItem(index, {
                  source: e.target.value as VariableMapping['source'],
                  table: undefined,
                  field: undefined,
                  queryKey: undefined,
                })
              }
              disabled={readOnly}
              className="w-full h-7 text-xs border border-gray-200 rounded-md px-2 bg-white"
            >
              {SOURCE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {m.source === 'field' && (
              <div className="flex items-center gap-1">
                <select
                  value={m.table ?? 'projects'}
                  onChange={(e) => updateItem(index, { table: e.target.value })}
                  disabled={readOnly}
                  className="h-7 text-xs border border-gray-200 rounded-md px-1 bg-white flex-1"
                >
                  <option value="projects">projects</option>
                </select>
                <select
                  value={m.field ?? ''}
                  onChange={(e) => updateItem(index, { field: e.target.value })}
                  disabled={readOnly}
                  className="h-7 text-xs border border-gray-200 rounded-md px-1 bg-white flex-1"
                >
                  <option value="">选择字段</option>
                  {PROJECT_FIELDS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {m.source === 'related' && (
              <Input
                value={m.queryKey ?? ''}
                onChange={(e) => updateItem(index, { queryKey: e.target.value })}
                placeholder="如 hazardList、workerList"
                disabled={readOnly}
                className="h-7 text-xs"
              />
            )}
            {m.source === 'formula' && (
              <Input
                value={m.expr ?? ''}
                onChange={(e) => updateItem(index, { expr: e.target.value })}
                placeholder="公式表达式"
                disabled={readOnly}
                className="h-7 text-xs"
              />
            )}
            {m.source === 'ai' && (
              <Input
                value={m.prompt ?? ''}
                onChange={(e) => updateItem(index, { prompt: e.target.value })}
                placeholder="AI 提示词"
                disabled={readOnly}
                className="h-7 text-xs"
              />
            )}
          </div>
          <div className="col-span-3">
            <Input
              value={m.defaultValue ?? ''}
              onChange={(e) => updateItem(index, { defaultValue: e.target.value })}
              placeholder={m.source === 'manual' ? '手动变量的默认值' : '非手动来源无效'}
              disabled={readOnly || m.source !== 'manual'}
              className="h-7 text-xs"
            />
          </div>
          <div className="col-span-1 flex items-center justify-center h-8">
            <input
              type="checkbox"
              checked={m.required ?? false}
              onChange={(e) => updateItem(index, { required: e.target.checked })}
              disabled={readOnly}
              className="w-4 h-4 accent-primary"
            />
          </div>
          <div className="col-span-1 flex items-center justify-end h-8">
            <span
              className={`w-2 h-2 rounded-full ${
                m.source === 'manual' ? 'bg-red-400' : 'bg-emerald-400'
              }`}
              title={m.source === 'manual' ? '需手动填写' : '可自动填充'}
            />
          </div>
        </div>
      ))}
      {items.length === 0 && (
        <div className="text-center py-4 text-xs text-gray-400">
          该模板未识别到变量，导入 Word 模板时会自动提取
        </div>
      )}
    </div>
  )
}
