import { useState } from 'react'
import { Search, FileText } from 'lucide-react'
import { Sheet } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import type { Template } from '@/types'
import { cn } from '@/lib/utils'

interface TemplateSelectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  templates: Template[]
  selectedId: string
  onSelect: (id: string) => void
}

export default function TemplateSelectDialog({
  open,
  onOpenChange,
  templates,
  selectedId,
  onSelect,
}: TemplateSelectDialogProps) {
  const [keyword, setKeyword] = useState('')

  const filtered = templates.filter(t =>
    t.name.toLowerCase().includes(keyword.toLowerCase())
  )

  const handleSelect = (id: string) => {
    onSelect(id)
    onOpenChange(false)
  }

  return (
    <Sheet
      open={open}
      onClose={() => onOpenChange(false)}
      title={<span className="flex items-center gap-2"><FileText className="w-4 h-4" />选择日报模板</span>}
    >
      <div className="space-y-3 py-2">
        <div className="px-1">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索模板名称..."
              className="pl-9 h-9 text-sm"
            />
          </div>
        </div>
        <div className="overflow-y-auto max-h-[50vh]">
          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-400">
              没有匹配的模板
            </div>
          ) : (
            filtered.map((t) => (
              <button
                key={t.id}
                onClick={() => handleSelect(t.id!)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors rounded-xl',
                  selectedId === t.id ? 'bg-emerald-50 text-emerald-700' : 'text-gray-700'
                )}
              >
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'text-sm truncate',
                    selectedId === t.id ? 'font-medium' : 'font-normal'
                  )}>
                    {t.name}
                  </p>
                  {t.description && (
                    <p className="text-xs text-gray-400 truncate">{t.description}</p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </Sheet>
  )
}
