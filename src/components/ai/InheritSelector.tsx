import { useMemo, useState } from 'react'
import { History, Copy, ListChecks, FilePlus, CheckSquare, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { DailyReportItem } from '@/types'
import { buildInheritGroups, type InheritGroup, type InheritOption } from '@/services/daily-report.service'

type InheritMode = 'all' | 'select' | 'blank'

export interface InheritSelectorValue {
  mode: InheritMode
  selectedItems: DailyReportItem[]
}

interface InheritSelectorProps {
  yesterdayDate: string
  items: DailyReportItem[]
  onConfirm: (value: InheritSelectorValue) => void
  onSkip: () => void
}

export function InheritSelector({ yesterdayDate, items, onConfirm, onSkip }: InheritSelectorProps) {
  const [mode, setMode] = useState<InheritMode | null>(null)
  const groups = useMemo(() => buildInheritGroups(items), [items])
  const [selection, setSelection] = useState<Map<string, boolean>>(() => {
    const map = new Map<string, boolean>()
    items.forEach((i) => map.set(i.id, true))
    return map
  })

  const toggleOption = (option: InheritOption) => {
    setSelection((prev) => {
      const next = new Map(prev)
      next.set(option.id, !prev.get(option.id))
      return next
    })
  }

  const toggleGroup = (group: InheritGroup, checked: boolean) => {
    setSelection((prev) => {
      const next = new Map(prev)
      group.options.forEach((o) => next.set(o.id, checked))
      return next
    })
  }

  const handleConfirm = () => {
    if (mode === 'blank') {
      onConfirm({ mode: 'blank', selectedItems: [] })
      return
    }
    if (mode === 'all') {
      onConfirm({ mode: 'all', selectedItems: items })
      return
    }
    const selected = items.filter((i) => selection.get(i.id))
    onConfirm({ mode: 'select', selectedItems: selected })
  }

  const selectedCount = Array.from(selection.values()).filter(Boolean).length

  return (
    <Card className="mb-4 border-blue-200 bg-blue-50/60">
      <CardContent className="py-4 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
            <History className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-slate-800">
              检测到 {yesterdayDate} 已填写日报
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              共 {items.length} 条记录可复制到今日，选择继承方式后进入编辑
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setMode('all')}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-left transition-colors ${
              mode === 'all'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white border-slate-200 hover:border-blue-300 text-slate-700'
            }`}
          >
            <Copy className="w-4 h-4 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium">复制全部</p>
              <p className={`text-[10px] ${mode === 'all' ? 'text-blue-100' : 'text-slate-400'}`}>全部 {items.length} 条</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setMode('select')}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-left transition-colors ${
              mode === 'select'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white border-slate-200 hover:border-blue-300 text-slate-700'
            }`}
          >
            <ListChecks className="w-4 h-4 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium">选择性复用</p>
              <p className={`text-[10px] ${mode === 'select' ? 'text-blue-100' : 'text-slate-400'}`}>勾选需要的条目</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setMode('blank')}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-left transition-colors ${
              mode === 'blank'
                ? 'bg-slate-600 text-white border-slate-600'
                : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
            }`}
          >
            <FilePlus className="w-4 h-4 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium">空白开始</p>
              <p className={`text-[10px] ${mode === 'blank' ? 'text-slate-200' : 'text-slate-400'}`}>从零填写</p>
            </div>
          </button>
        </div>

        {mode === 'select' && (
          <div className="bg-white rounded-lg border border-slate-200 p-3 space-y-3">
            {groups.map((group) => {
              const groupSelected = group.options.every((o) => selection.get(o.id))
              const groupPartial = group.options.some((o) => selection.get(o.id)) && !groupSelected
              return (
                <div key={group.type} className="space-y-2">
                  <div
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => toggleGroup(group, !groupSelected)}
                  >
                    {groupSelected ? (
                      <CheckSquare className="w-4 h-4 text-blue-600" />
                    ) : groupPartial ? (
                      <div className="w-4 h-4 rounded bg-blue-600 flex items-center justify-center">
                        <div className="w-2 h-0.5 bg-white rounded-full" />
                      </div>
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                    <span className="text-xs font-medium text-slate-700">{group.label}</span>
                    <Badge variant="secondary" className="text-[10px] h-5 px-1">
                      {group.options.length}
                    </Badge>
                  </div>
                  <div className="pl-6 space-y-1.5">
                    {group.options.map((option) => (
                      <div
                        key={option.id}
                        className="flex items-start gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded-md transition-colors"
                        onClick={() => toggleOption(option)}
                      >
                        {selection.get(option.id) ? (
                          <CheckSquare className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                        )}
                        <span className="text-xs text-slate-600 leading-relaxed">{option.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
            <p className="text-[10px] text-slate-400 pt-1">已选择 {selectedCount} / {items.length} 条</p>
          </div>
        )}

        {mode !== null && (
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={onSkip}>
              跳过
            </Button>
            <Button size="sm" onClick={handleConfirm} className="bg-blue-600 hover:bg-blue-700">
              确认继承
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
