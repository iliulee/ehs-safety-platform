import { Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface HazardToolbarProps {
  count: number
  searchText: string
  onSearchChange: (value: string) => void
  onAdd: () => void
}

export function HazardToolbar({ count, searchText, onSearchChange, onAdd }: HazardToolbarProps) {
  return (
    <div className="px-3 py-2 border-b border-gray-200">
      <div className="flex items-center gap-2 min-w-0">
        <h3 className="text-sm font-semibold text-gray-800 truncate flex-shrink-0">
          隐患治理
          <span className="ml-1 text-xs font-normal text-gray-500">({count})</span>
        </h3>
        <div className="flex-1 min-w-0" />
        <div className="relative w-44 md:w-56">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <Input
            value={searchText}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="搜索隐患标题/部位..."
            className="pl-8 h-8 text-xs bg-white"
          />
        </div>
        <Button size="sm" className="h-8 px-2.5 text-xs gap-1 flex-shrink-0" onClick={onAdd}>
          <Plus className="w-3.5 h-3.5" />
          新增
        </Button>
      </div>
    </div>
  )
}
