import { useEffect, useState } from 'react'
import { Folder, MoveRight } from 'lucide-react'
import { Sheet } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { categoryRepo, type CategoryNode } from '@/db/repositories/category.repo'
import type { CategoryRecord } from '@/types'

interface MoveCategoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (categoryId: string | null) => void
  currentCategoryId?: string | null
  excludeIds?: string[]
}

function flatten(nodes: CategoryNode[], excludeIds: Set<string>, depth = 0): Array<{ item: CategoryRecord; depth: number }> {
  const result: Array<{ item: CategoryRecord; depth: number }> = []
  for (const node of nodes) {
    if (!excludeIds.has(node.id!)) {
      result.push({ item: node, depth })
      result.push(...flatten(node.children, excludeIds, depth + 1))
    }
  }
  return result
}

export function MoveCategoryDialog({
  open,
  onOpenChange,
  onConfirm,
  currentCategoryId,
  excludeIds = [],
}: MoveCategoryDialogProps) {
  const [categories, setCategories] = useState<CategoryNode[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    categoryRepo.getTree().then((tree) => {
      setCategories(tree)
      setSelectedId(currentCategoryId ?? null)
    })
  }, [open, currentCategoryId])

  const handleConfirm = () => {
    onConfirm(selectedId)
    onOpenChange(false)
  }

  const items = flatten(categories, new Set(excludeIds))

  return (
    <Sheet
      open={open}
      onClose={() => onOpenChange(false)}
      title={
        <span className="flex items-center gap-2">
          <MoveRight className="w-4 h-4" />
          移动到分类
        </span>
      }
      footer={
        <>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button size="sm" onClick={handleConfirm}>
            确认移动
          </Button>
        </>
      }
    >
      <div className="space-y-1 py-2">
        <button
          onClick={() => setSelectedId(null)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
            selectedId === null
              ? 'bg-primary/10 text-primary'
              : 'hover:bg-gray-50 text-gray-700'
          }`}
        >
          <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
            <Folder className="w-4 h-4 text-gray-500" />
          </div>
          <span className="flex-1 text-left">全部模板（未分类）</span>
        </button>

        {items.map(({ item, depth }) => (
          <button
            key={item.id}
            onClick={() => setSelectedId(item.id!)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
              selectedId === item.id
                ? 'bg-primary/10 text-primary'
                : 'hover:bg-gray-50 text-gray-700'
            }`}
            style={{ paddingLeft: `${12 + depth * 24}px` }}
          >
            <Folder className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="flex-1 text-left truncate">
              {item.isBuiltIn ? `${item.code} ${item.name}` : item.name}
            </span>
          </button>
        ))}

        {items.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-4">暂无可用分类</p>
        )}
      </div>
    </Sheet>
  )
}
