import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Search, Plus, Trash2, PlusCircle, ScanSearch, ListPlus, Pencil, Check } from 'lucide-react'
import type { VariableMapping } from '@/types'
import { toast } from 'sonner'

type LocalVariable = VariableMapping & { _localId?: string }

function isCleanVariableName(name: string): boolean {
  if (!name || !name.trim()) return false
  const trimmed = name.trim()
  if (/^\d+$/.test(trimmed)) return false
  if (/^[a-z]+:/i.test(trimmed)) return false
  return true
}

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
  { key: 'basic', label: '项目基础信息', fields: ['name', 'code', 'location', 'startDate', 'endDate', 'description'] },
  { key: 'units', label: '参建单位', fields: ['owner', 'contractor', 'supervisor'] },
  { key: 'personnel', label: '项目人员', fields: ['managerName', 'techDirector', 'safetyOfficer', 'safetyOfficerPhone'] },
]

const EXTRA_FIELDS_ORDER = Object.keys(EXTRA_FIELD_LABELS)

const SIMPLE_SOURCE_OPTIONS = [
  { value: 'manual', label: '手动填写', group: '基础' },
  { value: 'currentDate', label: '当前日期', group: '基础' },
  { value: 'field', label: '项目字段', group: '基础' },
]

interface VariableMappingEditorProps {
  mappings: VariableMapping[]
  onChange?: (mappings: VariableMapping[]) => void
  onInsert?: (variableName: string) => void
  onExtractVariables?: () => string[]
  readOnly?: boolean
  activeVariable?: string | null
  variableRefs?: React.MutableRefObject<Map<string, HTMLDivElement>>
}

function VariableMappingEditor({
  mappings,
  onChange,
  onInsert,
  onExtractVariables,
  readOnly = false,
  activeVariable,
  variableRefs: _variableRefs,
}: VariableMappingEditorProps) {
  const [items, setItems] = useState<LocalVariable[]>(() => {
    const raw = (mappings ?? []) as LocalVariable[]
    const clean = raw.filter((m) => isCleanVariableName(m.name))
    const removed = raw.length - clean.length
    if (removed > 0) {
      toast.info(`已清理 ${removed} 个无关变量（如 Word XML 命名空间元素）`)
    }
    return clean
  })
  const [keyword, setKeyword] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingLabel, setEditingLabel] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()
  const nameCheckRef = useRef<ReturnType<typeof setTimeout>>()
  const warnedNamesRef = useRef<Set<string>>(new Set())
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
        onChangeRef.current?.(items)
      }
      if (nameCheckRef.current) {
        clearTimeout(nameCheckRef.current)
      }
    }
  }, [])

  const flushCommit = (next: LocalVariable[]) => {
    clearTimeout(debounceRef.current)
    onChangeRef.current?.(next)
  }

  const updateItem = (index: number, patch: Partial<VariableMapping>) => {
    setItems((prev) => {
      const next = prev.map((m, i) => (i === index ? { ...m, ...patch } : m))
      clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => onChangeRef.current?.(next), 500)
      return next
    })
    // 当用户修改变量名时，检查文档中是否有对应的 {{占位符}}
    if (patch.name && onExtractVariables) {
      clearTimeout(nameCheckRef.current)
      nameCheckRef.current = setTimeout(() => {
        const docVars = onExtractVariables()
        const warned = warnedNamesRef.current
        if (!docVars.includes(patch.name!) && !warned.has(patch.name!)) {
          warned.add(patch.name!)
          toast.warning(
            `变量名「${patch.name}」在文档中未找到对应的 {{${patch.name}}} 占位符，请同步更新文档中的占位符`,
            { duration: 5000 }
          )
        }
      }, 800)
    }
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
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      onChangeRef.current?.(items)
    }
    onInsert?.(name || '新变量')
  }

  const handleExtractVariables = () => {
    if (!onExtractVariables) return
    const extracted = onExtractVariables()
    if (extracted.length === 0) return

    setItems((prev) => {
      const existingNames = new Set(prev.map((m) => m.name).filter(Boolean))
      const newItems: LocalVariable[] = []
      for (const name of extracted) {
        if (!existingNames.has(name)) {
          existingNames.add(name)
          newItems.push({
            _localId: crypto.randomUUID(),
            name,
            source: 'manual',
            defaultValue: '',
            label: name,
          })
        }
      }
      if (newItems.length === 0) return prev
      const next = [...prev, ...newItems]
      flushCommit(next)
      return next
    })
  }

  const handleInsertAll = () => {
    if (!onInsert) return
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      onChangeRef.current?.(items)
    }
    const names = items.map((m) => m.name || m.label).filter(Boolean)
    if (names.length === 0) return
    const text = names.map((n) => `{{${n}}}`).join('\n')
    onInsert(text)
  }

  const filteredItems = useMemo(() => {
    if (!keyword.trim()) return items
    const lower = keyword.toLowerCase()
    return items.filter((m) =>
      (m.name ?? '').toLowerCase().includes(lower) ||
      (m.label ?? '').toLowerCase().includes(lower)
    )
  }, [items, keyword])

  const today = new Date().toISOString().slice(0, 10)

  // 匹配状态统计
  const matchedCount = items.filter((m) => !!m.name).length
  const unmatchedCount = items.length - matchedCount

  // 来源 Badge 样式
  const getSourceBadge = (m: LocalVariable) => {
    if (m.source === 'field' || m.source === 'extraField') {
      return <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50 text-[10px] px-1.5 py-0 h-5">项目字段</Badge>
    }
    if (m.source === 'currentDate') {
      return <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200 hover:bg-green-50 text-[10px] px-1.5 py-0 h-5">系统自动</Badge>
    }
    return <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50 text-[10px] px-1.5 py-0 h-5">手动填写</Badge>
  }

  return (
    <div className="flex flex-col h-full max-h-[500px]">
      {/* 顶部工具栏 */}
      <div className="flex-shrink-0 space-y-2.5 mb-3">
        {/* 标题行 */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-800">变量配置</span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 bg-gray-100 text-gray-600 border-0">
            {items.length} 个变量
          </Badge>
        </div>

        {/* 搜索 + 按钮 */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索变量..."
              className="pl-8 h-8 text-xs"
            />
          </div>
          {!readOnly && (
            <button
              onClick={addVariable}
              className="flex items-center gap-1 text-xs text-primary hover:bg-primary/5 px-2 py-1.5 rounded-lg transition-colors flex-shrink-0"
              title="添加变量"
            >
              <Plus className="w-3.5 h-3.5" />
              添加
            </button>
          )}
        </div>

        {/* 操作按钮 + 匹配状态 */}
        {!readOnly && (
          <div className="flex items-center gap-2 flex-wrap">
            {onExtractVariables && (
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleExtractVariables}>
                <ScanSearch className="w-3.5 h-3.5" />
                提取变量
              </Button>
            )}
            {onInsert && items.length > 0 && (
              <Button size="sm" className="h-7 text-xs gap-1" onClick={handleInsertAll}>
                <ListPlus className="w-3.5 h-3.5" />
                全部插入
              </Button>
            )}
            <span className="text-[11px] text-gray-500 ml-auto">
              已匹配 <span className="font-medium text-green-600">{matchedCount}</span>
              {' / '}
              未匹配 <span className="font-medium text-red-500">{unmatchedCount}</span>
            </span>
          </div>
        )}
      </div>

      {/* 变量卡片列表 */}
      <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
        {filteredItems.map((m) => {
          const originalIndex = items.findIndex((x) =>
            (x as LocalVariable)._localId
              ? (x as LocalVariable)._localId === (m as LocalVariable)._localId
              : x.name === m.name
          )
          const stableKey = (m as LocalVariable)._localId ?? `var-${originalIndex}`
          const isActive = activeVariable === m.name
          const isManual = m.source === 'manual'
          const isField = m.source === 'field' || m.source === 'extraField'
          const isDate = m.source === 'currentDate'
          const isMatched = !!m.name
          const displayName = m.label || m.name
          const isEditingLabel = editingId === stableKey

          return (
            <Card
              key={stableKey}
              className={`transition-all ${
                isActive ? 'ring-2 ring-purple-400 border-purple-300' : ''
              } ${
                !isMatched ? 'border-l-2 border-l-amber-400 bg-amber-50/30' : ''
              }`}
            >
              <CardContent className="p-3 space-y-2">
                {/* 第一行：变量名 + 编辑 + 状态 + 操作 */}
                <div className="flex items-center gap-2">
                  {/* 变量名 */}
                  {isEditingLabel ? (
                    <div className="flex items-center gap-1 flex-1 min-w-0">
                      <Input
                        value={editingLabel}
                        onChange={(e) => setEditingLabel(e.target.value)}
                        onBlur={() => {
                          updateItem(originalIndex, { label: editingLabel.trim() })
                          setEditingId(null)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            updateItem(originalIndex, { label: editingLabel.trim() })
                            setEditingId(null)
                          }
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                        autoFocus
                        className="h-7 text-xs py-0 flex-1"
                      />
                      <button
                        onClick={() => {
                          updateItem(originalIndex, { label: editingLabel.trim() })
                          setEditingId(null)
                        }}
                        className="w-6 h-6 flex items-center justify-center rounded-md text-green-600 hover:bg-green-50 flex-shrink-0"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <Input
                          value={m.name}
                          onChange={(e) => updateItem(originalIndex, { name: e.target.value })}
                          placeholder="变量名"
                          disabled={readOnly}
                          className="h-7 text-xs border-0 bg-transparent px-0 focus-visible:ring-0 font-medium truncate"
                        />
                        {displayName && (
                          <p className="text-[10px] text-gray-400 truncate mt-0.5">
                            {`{{${displayName}}}`}
                          </p>
                        )}
                      </div>
                      {!readOnly && (
                        <button
                          onClick={() => {
                            setEditingId(stableKey)
                            setEditingLabel(m.label || m.name)
                          }}
                          className="w-6 h-6 flex items-center justify-center rounded-md text-gray-400 hover:text-primary hover:bg-primary/5 flex-shrink-0"
                          title="编辑显示名"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      )}
                    </>
                  )}

                  {/* 匹配状态 */}
                  <span className={`text-[10px] font-medium flex-shrink-0 ${isMatched ? 'text-green-600' : 'text-red-500'}`}>
                    {isMatched ? '已匹配' : '未匹配'}
                  </span>

                  {/* 操作按钮 */}
                  {!isEditingLabel && (
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      {onInsert && (
                        <button
                          onClick={() => handleInsert(displayName || m.source)}
                          disabled={readOnly}
                          className="w-6 h-6 flex items-center justify-center rounded-md text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-30"
                          title="插入此变量到文档"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {!readOnly && (
                        <button
                          onClick={() => deleteVariable(originalIndex)}
                          className="w-6 h-6 flex items-center justify-center rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="删除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* 第二行：来源 Badge + 配置 */}
                <div className="flex items-center gap-2 flex-wrap">
                  {getSourceBadge(m)}

                  {/* 来源选择 */}
                  <select
                    value={m.source}
                    onChange={(e) => {
                      const source = e.target.value as VariableMapping['source']
                      updateItem(originalIndex, {
                        source,
                        field: undefined,
                        extraFieldKey: undefined,
                        table: undefined,
                        queryKey: undefined,
                      })
                    }}
                    disabled={readOnly}
                    className="h-7 text-xs border border-gray-200 rounded-md px-1.5 bg-white text-gray-700 w-[80px] flex-shrink-0"
                  >
                    {SIMPLE_SOURCE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>

                  {/* 项目字段二级下拉 */}
                  {isField && (
                    <select
                      value={m.source === 'extraField' ? `extraField:${m.extraFieldKey}` : `field:${m.field || ''}`}
                      onChange={(e) => {
                        const val = e.target.value
                        const patch: Partial<VariableMapping> = {
                          source: val.startsWith('extraField:') ? 'extraField' : 'field',
                          table: 'projects',
                          field: val.startsWith('extraField:') ? undefined : val.slice(6),
                          extraFieldKey: val.startsWith('extraField:') ? val.slice(11) : undefined,
                        }
                        if (patch.field && FIELD_LABELS[patch.field]) {
                          patch.label = FIELD_LABELS[patch.field]
                          if (!m.name) patch.name = patch.field
                        } else if (patch.extraFieldKey && EXTRA_FIELD_LABELS[patch.extraFieldKey]) {
                          patch.label = EXTRA_FIELD_LABELS[patch.extraFieldKey]
                          if (!m.name) patch.name = patch.extraFieldKey
                        }
                        updateItem(originalIndex, patch)
                      }}
                      disabled={readOnly}
                      className="h-7 text-xs border border-gray-200 rounded-md px-1.5 bg-white text-gray-700 max-w-[130px]"
                    >
                      <option value="">选择字段</option>
                      {FIELD_GROUPS.map((g) => (
                        <optgroup key={g.key} label={g.label}>
                          {g.fields.map((f) => (
                            <option key={f} value={`field:${f}`}>
                              {FIELD_LABELS[f] || f}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                      <optgroup label="扩展字段">
                        {EXTRA_FIELDS_ORDER.map((k) => (
                          <option key={k} value={`extraField:${k}`}>
                            {EXTRA_FIELD_LABELS[k]}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  )}

                  {/* 当前日期：静态文本 */}
                  {isDate && (
                    <span className="h-7 inline-flex items-center text-xs text-blue-500 font-medium px-1.5 bg-blue-50 rounded whitespace-nowrap flex-shrink-0">
                      当前日期
                    </span>
                  )}

                  {/* 手动填写：默认值输入 */}
                  {isManual && (
                    <Input
                      value={m.defaultValue ?? ''}
                      onChange={(e) => updateItem(originalIndex, { defaultValue: e.target.value })}
                      placeholder="请输入..."
                      disabled={readOnly}
                      className="h-7 text-xs w-[110px] flex-shrink-0"
                    />
                  )}
                </div>

                {/* 第三行：辅助说明 */}
                {isDate && (
                  <p className="text-[10px] text-green-600 pl-0.5">
                    生成时自动填入当天日期（{today}）
                  </p>
                )}
              </CardContent>
            </Card>
          )
        })}

        {filteredItems.length === 0 && (
          <div className="text-center py-10 text-sm text-gray-400">
            {keyword ? '没有匹配的变量' : '该模板未识别到变量，点击「添加」手动创建'}
          </div>
        )}
      </div>
    </div>
  )
}

export default React.memo(VariableMappingEditor)