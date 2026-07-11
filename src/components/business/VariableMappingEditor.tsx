import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Input } from '@/components/ui/input'
import { Search, AlertCircle, CheckCircle2, Plus, Trash2, PlusCircle } from 'lucide-react'
import type { VariableMapping } from '@/types'

// 本地扩展类型：添加 _localId 用于稳定 React key
type LocalVariable = VariableMapping & { _localId?: string }

const FIELD_LABELS: Record<string, string> = {
  name: '项目名称',
  code: '项目编号',
  location: '项目地点',
  startDate: '计划开工日期',
  endDate: '计划竣工日期',
  contractor: '施工单位',
  supervisor: '监理单位',
  owner: '建设单位',
  managerName: '项目经理',
  techDirector: '技术负责人',
  safetyOfficer: '安全员',
  safetyOfficerPhone: '安全员电话',
  description: '项目简介',
}

const EXTRA_FIELD_LABELS: Record<string, string> = {
  designUnit: '设计单位',
  surveyUnit: '勘察单位',
  safetyDirector: '安全负责人',
  qualityDirector: '质量负责人',
  qualityInspector: '质量员',
  productionManager: '生产经理',
  constructionWorker: '施工员',
  surveyor: '测量员',
  tester: '试验员',
}

const FIELD_GROUPS = [
  {
    key: 'basic',
    label: '项目基础信息',
    fields: ['name', 'code', 'location', 'startDate', 'endDate', 'description'],
  },
  { key: 'units', label: '参建单位', fields: ['owner', 'contractor', 'supervisor'] },
  { key: 'personnel', label: '项目人员', fields: ['managerName', 'techDirector', 'safetyOfficer', 'safetyOfficerPhone'] },
]

const EXTRA_FIELDS_ORDER = Object.keys(EXTRA_FIELD_LABELS)

// 扩展来源选项：嵌入项目字段和扩展字段的直接映射，实现一键选择
const EXPANDED_SOURCE_OPTIONS: { value: string; label: string; group: string }[] = [
  { value: 'currentDate', label: '当前日期', group: '自动填充' },
  { value: 'currentUser', label: '当前用户', group: '自动填充' },
  { value: 'manual', label: '手动填写', group: '手动输入' },
  { value: 'formula', label: '公式计算', group: '高级' },
  { value: 'statistic', label: '统计汇总', group: '高级' },
  { value: 'ai', label: 'AI 生成', group: '高级' },
  { value: 'related', label: '关联列表', group: '高级' },
  ...FIELD_GROUPS.flatMap((g) =>
    g.fields.map((f) => ({
      value: `field:${f}`,
      label: `${g.label} - ${FIELD_LABELS[f] || f}`,
      group: '项目字段',
    }))
  ),
  ...EXTRA_FIELDS_ORDER.map((k) => ({
    value: `extraField:${k}`,
    label: `扩展字段 - ${EXTRA_FIELD_LABELS[k]}`,
    group: '项目字段',
  })),
]

// 根据 source 值解析出 source 和 field
function parseSourceValue(value: string): { source: VariableMapping['source']; field?: string; extraFieldKey?: string } {
  if (value === 'field') return { source: 'field' }
  if (value.startsWith('field:')) return { source: 'field', field: value.slice(6) }
  if (value.startsWith('extraField:')) return { source: 'extraField', extraFieldKey: value.slice(11) }
  return { source: value as VariableMapping['source'] }
}

// 根据 source/field 组合出选项值
function buildSourceValue(source: VariableMapping['source'], field?: string, extraFieldKey?: string): string {
  if (source === 'field' && field) return `field:${field}`
  if (source === 'extraField' && extraFieldKey) return `extraField:${extraFieldKey}`
  return source
}

interface VariableMappingEditorProps {
  mappings: VariableMapping[]
  onChange?: (mappings: VariableMapping[]) => void
  onInsert?: (variableName: string) => void
  readOnly?: boolean
  activeVariable?: string | null
  variableRefs?: React.MutableRefObject<Map<string, HTMLDivElement>>
}

export default function VariableMappingEditor({
  mappings,
  onChange,
  onInsert,
  readOnly = false,
  activeVariable,
  variableRefs: _variableRefs,
}: VariableMappingEditorProps) {
  // 从 props 初始化本地状态，后续不再同步（依赖 key={templateId} 重挂载来切换模板）
  const [items, setItems] = useState<LocalVariable[]>(() => (mappings ?? []) as LocalVariable[])
  const [keyword, setKeyword] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()
  const onChangeRef = useRef(onChange)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  onChangeRef.current = onChange

  // 组件卸载时立即 flush 未提交的变更
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  // 防抖提交：本地立即更新，500ms 静默后批量通知父组件
  const flushCommit = (next: LocalVariable[]) => {
    clearTimeout(debounceRef.current)
    onChangeRef.current?.(next)
  }

  const updateItem = (index: number, patch: Partial<VariableMapping>) => {
    setItems((prev) => {
      const next = prev.map((m, i) => (i === index ? { ...m, ...patch } : m))
      // 防抖：500ms 内无新操作才提交
      clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => onChangeRef.current?.(next), 500)
      return next
    })
  }

  const addVariable = () => {
    const newItem: LocalVariable = {
      _localId: crypto.randomUUID(),
      name: '',
      source: 'manual',
      defaultValue: '',
      label: '',
    }
    setItems((prev) => {
      const next = [...prev, newItem]
      flushCommit(next)
      return next
    })
  }

  const deleteVariable = (index: number) => {
    setItems((prev) => {
      const next = prev.filter((_, i) => i !== index)
      flushCommit(next)
      return next
    })
  }

  const handleInsert = (name: string) => {
    // 插入前 flush 未提交的编辑
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      onChangeRef.current?.(items)
    }
    const displayName = name || '新变量'
    onInsert?.(displayName)
  }

  const filteredItems = useMemo(() => {
    if (!keyword.trim()) return items
    const lower = keyword.toLowerCase()
    return items.filter((m) =>
      (m.name ?? '').toLowerCase().includes(lower) ||
      (m.label ?? '').toLowerCase().includes(lower) ||
      (m.field && FIELD_LABELS[m.field]?.includes(keyword)) ||
      (m.extraFieldKey && EXTRA_FIELD_LABELS[m.extraFieldKey]?.includes(keyword))
    )
  }, [items, keyword])

  const unmappedCount = items.filter((m) => m.source === 'manual' && !m.defaultValue).length

  // 虚拟滚动
  const getScrollElement = useCallback(() => scrollContainerRef.current, [])
  const estimateSize = useCallback(() => 80, [])

  const rowVirtualizer = useVirtualizer(
    useMemo(
      () => ({
        count: filteredItems.length,
        getScrollElement,
        estimateSize,
        overscan: 5,
      }),
      [filteredItems.length, getScrollElement, estimateSize],
    ),
  )

  return (
    <div className="space-y-3">
      {onInsert && (
        <div className="text-xs text-gray-500 bg-blue-50 rounded-lg px-3 py-2">
          点击变量行右侧的「插入」按钮，将变量插入到文档光标位置
        </div>
      )}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索变量名或字段..."
            className="pl-9 h-9 text-sm"
          />
        </div>
        {!readOnly && (
          <button
            onClick={addVariable}
            className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 hover:bg-primary/5 px-3 py-2 rounded-lg transition-colors"
            title="添加变量"
          >
            <Plus className="w-3.5 h-3.5" />
            添加变量
          </button>
        )}
        {unmappedCount > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
            <AlertCircle className="w-3.5 h-3.5" />
            未映射 {unmappedCount} 项
          </div>
        )}
        {unmappedCount === 0 && items.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg">
            <CheckCircle2 className="w-3.5 h-3.5" />
            全部已映射
          </div>
        )}
      </div>

      <div className="space-y-2 flex flex-col min-h-0 flex-1">
        <div className="grid grid-cols-12 gap-3 text-xs text-gray-500 px-2 flex-shrink-0">
          <div className="col-span-2">模板变量</div>
          <div className="col-span-3">数据来源</div>
          <div className="col-span-4">默认值</div>
          <div className="col-span-1 text-center">必填</div>
          <div className="col-span-2 text-center">操作</div>
        </div>
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto min-h-0 rounded-lg">
          <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const m = filteredItems[virtualRow.index]
              const originalIndex = items.findIndex((x) => (x as LocalVariable)._localId
                ? (x as LocalVariable)._localId === (m as LocalVariable)._localId
                : x.name === m.name)
              const stableKey = (m as LocalVariable)._localId ?? `var-${originalIndex}`
              return (
                <div
                  key={stableKey}
                  data-index={virtualRow.index}
                  ref={rowVirtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  className={`grid grid-cols-12 gap-3 items-start rounded-xl p-3 border transition-all duration-200 ${
                    m.source === 'manual' && !m.defaultValue
                      ? 'bg-amber-50/50 border-amber-100'
                      : 'bg-gray-50 border-transparent'
                  } ${activeVariable === m.name ? 'ring-2 ring-purple-400 bg-purple-50/50 border-purple-200' : ''}`}
                >
              <div className="col-span-2 min-w-0">
                {m.name ? (
                  <div className="flex items-center gap-2">
                    <span
                      className="text-sm font-medium text-gray-800 truncate block max-w-[120px]"
                      title={`变量名：${m.name}${m.label ? `\n中文名：${m.label}` : ''}\n模板中写作：{{${m.label || m.name}}}`}
                    >
                      {m.label || m.name}
                    </span>
                  </div>
                ) : (
                  <Input
                    value={m.name}
                    onChange={(e) => updateItem(originalIndex, { name: e.target.value })}
                    placeholder="输入变量名"
                    disabled={readOnly}
                    className="h-8 text-xs"
                  />
                )}
                <p className="text-[11px] text-gray-400 mt-0.5 truncate" title={`模板中写作：{{${m.label || m.name}}}`}>
                  {'{{'}{m.label || m.name || '...'}{'}}'}
                </p>
              </div>

              <div className="col-span-3 space-y-1.5">
                <select
                  value={buildSourceValue(m.source, m.field, m.extraFieldKey)}
                  onChange={(e) => {
                    const parsed = parseSourceValue(e.target.value)
                    const patch: Partial<VariableMapping> = {
                      source: parsed.source,
                      table: parsed.source === 'field' || parsed.source === 'extraField' ? 'projects' : undefined,
                      field: parsed.field,
                      extraFieldKey: parsed.extraFieldKey,
                      queryKey: undefined,
                    }
                    // 自动设置中文标签和变量名
                    if (parsed.field && FIELD_LABELS[parsed.field]) {
                      patch.label = FIELD_LABELS[parsed.field]
                      if (!m.name) patch.name = parsed.field
                    } else if (parsed.extraFieldKey && EXTRA_FIELD_LABELS[parsed.extraFieldKey]) {
                      patch.label = EXTRA_FIELD_LABELS[parsed.extraFieldKey]
                      if (!m.name) patch.name = parsed.extraFieldKey
                    }
                    updateItem(originalIndex, patch)
                  }}
                  disabled={readOnly}
                  className="w-full h-8 text-xs border border-gray-200 rounded-lg px-2 bg-white"
                >
                  <option value="">选择数据来源</option>
                  {(() => {
                    const groups = new Map<string, typeof EXPANDED_SOURCE_OPTIONS>()
                    EXPANDED_SOURCE_OPTIONS.forEach((opt) => {
                      if (!groups.has(opt.group)) groups.set(opt.group, [])
                      groups.get(opt.group)!.push(opt)
                    })
                    return Array.from(groups.entries()).map(([group, opts]) => (
                      <optgroup key={group} label={group}>
                        {opts.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </optgroup>
                    ))
                  })()}
                </select>

                {m.source === 'related' && (
                  <Input
                    value={m.queryKey ?? ''}
                    onChange={(e) => updateItem(originalIndex, { queryKey: e.target.value })}
                    placeholder="如：人员列表、隐患列表"
                    disabled={readOnly}
                    className="h-8 text-xs"
                  />
                )}
                {m.source === 'formula' && (
                  <Input
                    value={m.expr ?? ''}
                    onChange={(e) => updateItem(originalIndex, { expr: e.target.value })}
                    placeholder="如：{{开工日期}} + ～ + {{竣工日期}}"
                    disabled={readOnly}
                    className="h-8 text-xs"
                  />
                )}
                {m.source === 'ai' && (
                  <Input
                    value={m.prompt ?? ''}
                    onChange={(e) => updateItem(originalIndex, { prompt: e.target.value })}
                    placeholder="AI 提示词"
                    disabled={readOnly}
                    className="h-8 text-xs"
                  />
                )}
              </div>

              <div className="col-span-4">
                <label className="text-[10px] text-gray-400 mb-1 block">
                  {m.source === 'manual' ? '默认值（生成时自动填入）' : '自动填充（不可手动修改）'}
                </label>
                <Input
                  value={m.defaultValue ?? ''}
                  onChange={(e) => updateItem(originalIndex, { defaultValue: e.target.value })}
                  placeholder={m.source === 'manual' ? '填写后生成报告时自动使用此值' : '来自系统数据，无需填写'}
                  disabled={readOnly || m.source !== 'manual'}
                  className="h-8 text-xs"
                />
                {m.source === 'field' && m.field && (
                  <p className="text-[11px] text-gray-400 mt-1">对应项目信息：{FIELD_LABELS[m.field] || m.field}</p>
                )}
                {m.source === 'extraField' && m.extraFieldKey && (
                  <p className="text-[11px] text-gray-400 mt-1">对应扩展字段：{EXTRA_FIELD_LABELS[m.extraFieldKey] || m.extraFieldKey}</p>
                )}
              </div>

              <div className="col-span-1 flex items-center justify-center h-8">
                <input
                  type="checkbox"
                  checked={m.required ?? false}
                  onChange={(e) => updateItem(originalIndex, { required: e.target.checked })}
                  disabled={readOnly}
                  className="w-4 h-4 accent-primary"
                  title="设为必填变量"
                />
              </div>

              <div className="col-span-2 flex items-center justify-center gap-1 h-8">
                {onInsert && (
                  <button
                    onClick={() => handleInsert(m.label || m.name)}
                    disabled={readOnly || (!m.name && !m.label)}
                    className="w-7 h-7 flex items-center justify-center rounded-md text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-colors disabled:opacity-40"
                    title="插入到文档光标位置"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                  </button>
                )}
                {!readOnly && (
                  <button
                    onClick={() => deleteVariable(originalIndex)}
                    className="w-7 h-7 flex items-center justify-center rounded-md text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors"
                    title="删除此变量"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
              )
            })}
          </div>
        </div>
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-6 text-sm text-gray-400">
          {keyword ? '没有匹配的变量' : '该模板未识别到变量，导入 Word 模板时会自动提取'}
        </div>
      )}
    </div>
  )
}
