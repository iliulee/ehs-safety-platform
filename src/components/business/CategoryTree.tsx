import { useState, useEffect, useRef } from 'react'
import {
  Folder,
  FolderOpen,
  Plus,
  Pencil,
  Trash2,
  Shield,
  LayoutGrid,
  GripVertical,
  AlertTriangle,
} from 'lucide-react'
import { categoryRepo, type CategoryNode } from '@/db/repositories/category.repo'
import type { CategoryRecord } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

interface CategoryTreeProps {
  tree: CategoryNode[]
  templateCounts: Map<string, number>
  selectedId?: string | null
  onSelect?: (id: string | null, name: string) => void
  onDropTemplate?: (categoryId: string | null, templateIds: string[]) => void
  onTreeMutated?: () => void
}

type CreatingState = { parentId: string | null } | null
type ContextMenuState = { x: number; y: number; node: CategoryRecord } | null
type ConfirmState = { message: string; title: string; onConfirm: () => void } | null

export default function CategoryTree({
  tree,
  templateCounts,
  selectedId,
  onSelect,
  onDropTemplate,
  onTreeMutated,
}: CategoryTreeProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [creating, setCreating] = useState<CreatingState>(null)
  const [newName, setNewName] = useState('')
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null)
  const [confirmState, setConfirmState] = useState<ConfirmState>(null)
  // 拖拽排序状态
  const [dragCategoryId, setDragCategoryId] = useState<string | null>(null)
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | 'inside' | null>(null)
  // 防止 onKeyDown(Enter) + onBlur 双重触发 confirmCreate
  const creatingGuard = useRef(false)

  // 关闭右键菜单
  useEffect(() => {
    if (!contextMenu) return
    const close = () => setContextMenu(null)
    document.addEventListener('click', close)
    document.addEventListener('contextmenu', close)
    return () => {
      document.removeEventListener('click', close)
      document.removeEventListener('contextmenu', close)
    }
  }, [contextMenu])

  const handleSelect = (id: string | null, name: string) => {
    onSelect?.(id, name)
  }

  const startCreate = (parentId: string | null) => {
    setCreating({ parentId })
    setNewName('')
  }

  const confirmCreate = async () => {
    if (!creating || !newName.trim() || creatingGuard.current) {
      setCreating(null)
      return
    }
    creatingGuard.current = true
    try {
      await categoryRepo.createCustom(newName.trim(), creating.parentId)
      onTreeMutated?.()
      toast.success('分类创建成功')
    } catch (err) {
      toast.error('创建失败：' + (err instanceof Error ? err.message : '未知错误'))
    } finally {
      setCreating(null)
      setNewName('')
      creatingGuard.current = false
    }
  }

  const startRename = (item: CategoryRecord) => {
    setEditingId(item.id!)
    setEditingName(item.name)
  }

  const confirmRename = async () => {
    if (!editingId || !editingName.trim()) {
      setEditingId(null)
      return
    }
    try {
      await categoryRepo.updateName(editingId, editingName.trim())
      onTreeMutated?.()
      toast.success('重命名成功')
    } catch (err) {
      toast.error('重命名失败：' + (err instanceof Error ? err.message : '未知错误'))
    } finally {
      setEditingId(null)
    }
  }

  const handleDelete = async (id: string) => {
    const check = await categoryRepo.canDelete(id)
    if (!check.ok) {
      toast.error(check.reason ?? '该分类不可删除')
      return
    }
    const message = check.reason
      ? `该分类包含 ${check.count ?? 0} 个模板，删除后将一并清除。`
      : '删除后不可恢复。'
    setConfirmState({
      title: '删除分类',
      message,
      onConfirm: async () => {
        try {
          const result = await categoryRepo.removeWithCascade(id)
          onTreeMutated?.()
          toast.success(`删除成功：清除 ${result.categories} 个分类、${result.templates} 个模板`)
          if (selectedId === id) handleSelect(null, '全部')
        } catch (err) {
          toast.error('删除失败：' + (err instanceof Error ? err.message : '未知错误'))
        }
      },
    })
  }

  const handleContextMenu = (e: React.MouseEvent, node: CategoryRecord) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, node })
  }

  // 模板拖拽到分类（已有功能）
  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    setDragOverId(id)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverId(null)
  }

  const handleDrop = (e: React.DragEvent, categoryId: string | null) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverId(null)
    try {
      const ids: string[] = JSON.parse(e.dataTransfer.getData('application/template-ids'))
      if (ids.length > 0) {
        onDropTemplate?.(categoryId, ids)
      }
    } catch {
      // 忽略解析失败
    }
  }

  // 分类拖拽排序
  const handleCategoryDragStart = (e: React.DragEvent, nodeId: string) => {
    e.dataTransfer.setData('application/category-id', nodeId)
    e.dataTransfer.effectAllowed = 'move'
    setDragCategoryId(nodeId)
  }

  const handleCategoryDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const relY = e.clientY - rect.top
    const h = rect.height
    if (relY < h * 0.25) setDropPosition('before')
    else if (relY > h * 0.75) setDropPosition('after')
    else setDropPosition('inside')
  }

  const handleCategoryDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDropPosition(null)
  }

  const handleCategoryDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    e.stopPropagation()
    const sourceId = e.dataTransfer.getData('application/category-id')
    setDragCategoryId(null)
    setDropPosition(null)
    if (!sourceId || sourceId === targetId) return

    try {
      if (dropPosition === 'inside') {
        // 移入作为子分类：将 source 的 parentId 改为 targetId
        await categoryRepo.update(sourceId, { parentId: targetId } as Partial<CategoryRecord>)
        onTreeMutated?.()
        toast.success('已移入子分类')
      } else {
        // 上下排序：需要重新计算同级顺序
        const target = await categoryRepo.getById(targetId)
        if (!target) return
        const siblings = await categoryRepo.getChildren(target.parentId ?? null)
        const currentIndex = siblings.findIndex((s) => s.id === sourceId)
        const targetIndex = siblings.findIndex((s) => s.id === targetId)

        // 更新 source 的 parentId 为目标的 parentId + 重新排序
        const updates: Promise<void>[] = []
        updates.push(categoryRepo.update(sourceId, { parentId: target.parentId ?? null } as Partial<CategoryRecord>))

        const newList = siblings.filter((s) => s.id !== sourceId)
        const insertAt = dropPosition === 'before' ? targetIndex : targetIndex + 1
        newList.splice(Math.max(0, insertAt), 0, siblings[currentIndex])

        newList.forEach((s, i) => {
          updates.push(categoryRepo.updateSortOrder(s.id!, i + 1))
        })
        await Promise.all(updates)
        onTreeMutated?.()
        toast.success('排序已更新')
      }
    } catch (err) {
      toast.error('排序失败：' + (err instanceof Error ? err.message : '未知错误'))
    }
  }

  const isSelectedAll = selectedId === null || selectedId === undefined

  const indent = (depth: number) => ({ paddingLeft: `${4 + depth * 16}px` })

  const renderNode = (node: CategoryNode, depth = 0) => {
    const hasChildren = node.children.length > 0
    const isSelected = selectedId === node.id
    const isCreatingHere = creating?.parentId === node.id
    const count = templateCounts.get(node.id!) || 0

    return (
      <div key={node.id}>
        <div
          draggable
          title={node.isBuiltIn ? `${node.code} ${node.name}` : node.name}
          className={`group flex items-center gap-3 px-3 py-2.5 text-sm cursor-pointer select-none rounded-xl mx-2 mb-1 transition-all duration-150 ${
            isSelected
              ? 'bg-primary/10 text-primary'
              : dragOverId === node.id
                ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-400'
                : 'text-gray-700 hover:bg-gray-50'
          } ${
            dropPosition === 'before' && dragCategoryId
              ? 'border-t-2 border-blue-500 rounded-t-none'
              : dropPosition === 'after' && dragCategoryId
                ? 'border-b-2 border-blue-500 rounded-b-none'
                : ''
          }`}
          style={indent(depth)}
          onClick={() => handleSelect(node.id!, node.name)}
          onContextMenu={(e) => handleContextMenu(e, node)}
          onDragOver={(e) => {
            // 判断拖拽的是模板还是分类
            if (e.dataTransfer.types.includes('application/category-id')) {
              handleCategoryDragOver(e)
            } else {
              handleDragOver(e, node.id!)
            }
          }}
          onDragLeave={(e) => {
            handleDragLeave(e)
            handleCategoryDragLeave(e)
          }}
          onDrop={(e) => {
            if (e.dataTransfer.types.includes('application/category-id')) {
              handleCategoryDrop(e, node.id!)
            } else {
              handleDrop(e, node.id!)
            }
          }}
          onDragStart={(e) => handleCategoryDragStart(e, node.id!)}
        >
          {/* 拖拽手柄 */}
          <div className="w-5 h-10 flex items-center justify-center opacity-0 group-hover:opacity-40 cursor-grab active:cursor-grabbing flex-shrink-0 -ml-1">
            <GripVertical className="w-3.5 h-3.5" />
          </div>
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
              isSelected
                ? 'bg-primary text-white shadow-sm'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            {hasChildren ? (
              <FolderOpen className="w-5 h-5" />
            ) : (
              <Folder className="w-5 h-5" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            {editingId === node.id ? (
              <Input
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={confirmRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') confirmRename()
                  if (e.key === 'Escape') setEditingId(null)
                }}
                autoFocus
                className="h-8 text-xs py-0 w-full"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <div className="flex items-center gap-2">
                <span className="flex-1 truncate font-medium text-[13px]">
                  {node.isBuiltIn ? `${node.code} ${node.name}` : node.name}
                </span>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full ${
                    isSelected
                      ? 'bg-primary/20 text-primary'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {count}
                </span>
              </div>
            )}
          </div>
          {node.isBuiltIn && <Shield className="w-4 h-4 text-amber-500 flex-shrink-0" />}
          {!node.isBuiltIn && (
            <div className="flex items-center gap-1 opacity-100">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  startCreate(node.id!)
                }}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg flex-shrink-0 transition-colors"
                title="新建子分类"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  startRename(node)
                }}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg flex-shrink-0 transition-colors"
                title="重命名"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete(node.id!)
                }}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg flex-shrink-0 transition-colors"
                title="删除分类"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
        {/* 分类树永久展开：子节点无条件渲染 */}
        {node.children.map((child) => renderNode(child, depth + 1))}
        {isCreatingHere && (
          <div className="flex items-center gap-3 px-3 py-2 mx-2 mb-1 animate-in fade-in slide-in-from-top-1 duration-200" style={indent(depth + 1)}>
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Folder className="w-5 h-5 text-amber-500" />
            </div>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={confirmCreate}
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmCreate()
                if (e.key === 'Escape') setCreating(null)
              }}
              autoFocus
              placeholder="新分类名称"
              className="h-8 text-xs py-0 flex-1"
            />
          </div>
        )}
      </div>
    )
  }

  const isCreatingRoot = creating?.parentId === null

  const totalTemplates = templateCounts.size > 0
    ? Array.from(templateCounts.values()).reduce((a, b) => a + b, 0)
    : 0

  return (
    <div className="absolute left-0 top-0 bottom-0 w-full bg-white border-r border-gray-100 shadow-sm z-20 flex flex-col">
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-gray-400 uppercase">模板分类</span>
          <button
            onClick={() => startCreate(null)}
            className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
            title="新建分类"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div
          className="flex items-center gap-2.5 px-2.5 py-2.5 text-sm cursor-pointer select-none rounded-xl transition-all duration-150 bg-gray-50 hover:bg-gray-100 text-gray-700"
          onClick={() => handleSelect(null, '全部')}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'move' }}
          onDrop={(e) => handleDrop(e, null)}
        >
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isSelectedAll ? 'bg-primary text-white' : 'bg-white text-gray-500 shadow-sm'
            }`}
          >
            <LayoutGrid className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`flex-1 truncate font-semibold ${isSelectedAll ? 'text-primary' : ''}`}>
                全部模板
              </span>
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full ${
                  isSelectedAll ? 'bg-primary/20 text-primary' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {totalTemplates}
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {tree.map((node) => renderNode(node))}
      </div>
      <div className="border-t border-gray-100 px-3 py-2">
        {!isCreatingRoot ? (
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-10 text-sm justify-start text-gray-500 hover:text-primary hover:bg-primary/5 rounded-xl"
            onClick={() => startCreate(null)}
          >
            <Plus className="w-4 h-4 mr-2" /> 新建分类
          </Button>
        ) : (
          <div className="flex items-center gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Folder className="w-5 h-5 text-amber-500" />
            </div>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={confirmCreate}
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmCreate()
                if (e.key === 'Escape') setCreating(null)
              }}
              autoFocus
              placeholder="新分类名称"
              className="h-8 text-xs py-0 flex-1"
            />
          </div>
        )}
      </div>
      {/* 右键菜单 */}
      {contextMenu && !contextMenu.node.isBuiltIn && (
        <div
          className="fixed z-[100] bg-white rounded-xl shadow-lg border border-gray-200 py-1 min-w-[140px] animate-in fade-in zoom-in-95 duration-150"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            onClick={() => { startCreate(contextMenu.node.id!); setContextMenu(null) }}
          >
            <Plus className="w-4 h-4" />
            新建子分类
          </button>
          <button
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            onClick={() => { startRename(contextMenu.node); setContextMenu(null) }}
          >
            <Pencil className="w-4 h-4" />
            重命名
          </button>
          <div className="border-t border-gray-100 my-1" />
          <button
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            onClick={() => { handleDelete(contextMenu.node.id!); setContextMenu(null) }}
          >
            <Trash2 className="w-4 h-4" />
            删除
          </button>
        </div>
      )}
      {/* 自定义确认弹窗（替代原生 confirm） */}
      {confirmState && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30 animate-in fade-in duration-150" onClick={() => setConfirmState(null)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 animate-in zoom-in-95 duration-150" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 mb-1">{confirmState.title}</h3>
                <p className="text-sm text-gray-500">{confirmState.message}</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setConfirmState(null)}>
                取消
              </Button>
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700"
                onClick={() => {
                  confirmState.onConfirm()
                  setConfirmState(null)
                }}
              >
                确认删除
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}