import { CheckSquare, Square } from 'lucide-react'

interface BatchActionsProps {
  selectedCount: number
  totalCount: number
  onToggleSelectAll: () => void
  onClearSelection: () => void
}

export function BatchActions({
  selectedCount,
  totalCount,
  onToggleSelectAll,
  onClearSelection,
}: BatchActionsProps) {
  const allSelected = totalCount > 0 && selectedCount === totalCount

  return (
    <div className="flex items-center justify-between px-1">
      <button
        onClick={onToggleSelectAll}
        className="flex items-center gap-1.5 text-[11px] text-gray-600 hover:text-primary transition-colors"
      >
        {allSelected ? (
          <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
        ) : (
          <Square className="w-3.5 h-3.5" />
        )}
        <span>
          全选{selectedCount > 0 ? `(${selectedCount}/${totalCount})` : ''}
        </span>
      </button>

      {selectedCount > 0 && (
        <button
          onClick={onClearSelection}
          className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
        >
          取消选择
        </button>
      )}
    </div>
  )
}
