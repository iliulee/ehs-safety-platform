import { TemplateCard } from './TemplateCard'
import { BatchActions } from './BatchActions'
import { EmptyTemplateState } from './EmptyTemplateState'
import type { Template } from '@/types'

interface TemplateListProps {
  templates: Template[]
  selectedIds: Set<string>
  deletingIds?: Set<string>
  movingIds?: Set<string>
  onToggleSelect: (id: string) => void
  onToggleSelectAll: () => void
  onClearSelection: () => void
  onGenerate: (t: Template) => void
  onOpenEditor?: (t: Template) => void
  onDelete: (id: string) => void
  onMove?: (t: Template) => void
  onDragStart?: (e: React.DragEvent, template: Template) => void
  onImport: () => void
  onScan: () => void
}

export function TemplateList({
  templates,
  selectedIds,
  deletingIds = new Set(),
  movingIds = new Set(),
  onToggleSelect,
  onToggleSelectAll,
  onClearSelection,
  onGenerate,
  onOpenEditor,
  onDelete,
  onMove,
  onDragStart,
  onImport,
  onScan,
}: TemplateListProps) {
  const busyIds = new Set([...Array.from(deletingIds), ...Array.from(movingIds)])
  if (templates.length === 0) {
    return <EmptyTemplateState onImport={onImport} onScan={onScan} />
  }

  return (
    <div className="p-3 space-y-2.5">
      <BatchActions
        selectedCount={selectedIds.size}
        totalCount={templates.length}
        onToggleSelectAll={onToggleSelectAll}
        onClearSelection={onClearSelection}
      />

      {templates.map((t) => (
        <TemplateCard
          key={t.id}
          template={t}
          selected={selectedIds.has(t.id!)}
          deleting={busyIds.has(t.id!)}
          onToggleSelect={() => onToggleSelect(t.id!)}
          onGenerate={() => onGenerate(t)}
          onOpenEditor={onOpenEditor ? () => onOpenEditor(t) : undefined}
          onDelete={() => onDelete(t.id!)}
          onMove={onMove ? () => onMove(t) : undefined}
          onDragStart={onDragStart ? (e) => onDragStart(e, t) : undefined}
        />
      ))}
    </div>
  )
}