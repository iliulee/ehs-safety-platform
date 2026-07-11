import { useEffect, useState } from 'react'
import * as ContextMenu from '@radix-ui/react-context-menu'
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  Plus,
  Pencil,
  Trash2,
  Shield,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react'
import { categoryRepo, type CategoryNode } from '@/db/repositories/category.repo'
import type { CategoryRecord } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

interface CategoryTreeProps {
  selectedId?: string | null
  onSelect?: (id: string | null, name: string) => void
  collapsed?: boolean
  onToggleCollapse?: () => void
  /** 外部触发重新加载分类树，值变化时刷新 */
  refreshKey?: number | string
  /** 分类删除完成后回调，方便父组件清理相关状态 */
  onAfterDelete?: () => void
}

type CreatingState = { parentId: string | null } | null

export default function CategoryTree({
  selectedId,
  onSelect,
  collapsed = false,
  onToggleCollapse,
  refreshKey,
  onAfterDelete,
}: CategoryTreeProps) {
  const [tree, setTree] = useState<CategoryNode[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [creating, setCreating] = useState<CreatingState>(null)
  const [newName, setNewName] = useState('')

  const load = async () => {
    const data = await categoryRepo.getTree()
    setTree(data)
  }

  useEffect(() => {
    load()
  }, [refreshKey])

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSelect = (id: string | null, name: string) => {
    onSelect?.(id, name)
  }

  const startCreate = (parentId: string | null) => {
    setCreating({ parentId })
    setNewName('')
    if (parentId) {
      setExpanded((prev) => new Set(prev).add(parentId))
    }
  }

  const confirmCreate = async () => {
    if (!creating || !newName.trim()) {
      setCreating(null)
      return
    }
    try {
      await categoryRepo.createCustom(newName.trim(), creating.parentId)
      toast.success('分类创建成功')
      await load()
    } catch (err) {
      toast.error('创建失败：' + (err instanceof Error ? err.message : '未知错误'))
    } finally {
      setCreating(null)
      setNewName('')
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
      toast.success('重命名成功')
      await load()
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
      ? `确定删除此分类吗？\n${check.reason}，此操作不可恢复。`
      : '确定删除此分类吗？此操作不可恢复。'
    if (!confirm(message)) return
    try {
      const result = await categoryRepo.removeWithCascade(id)
      toast.success(`删除成功：清除 ${result.categories} 个分类、${result.templates} 个模板`)
      if (selectedId === id) handleSelect(null, '全部')
      onAfterDelete?.()
      await load()
    } catch (err) {
      toast.error('删除失败：' + (err instanceof Error ? err.message : '未知错误'))
    }
  }

  const isSelectedAll = selectedId === null || selectedId === undefined

  const indent = (depth: number) => ({ paddingLeft: `${12 + depth * 16}px` })

  const renderNode = (node: CategoryNode, depth = 0) => {
    const hasChildren = node.children.length > 0
    const isExpanded = expanded.has(node.id!)
    const isSelected = selectedId === node.id
    const isCreatingHere = creating?.parentId === node.id

    return (
      <div key={node.id}>
        <ContextMenu.Root>
          <ContextMenu.Trigger asChild>
            <div
              title={node.isBuiltIn ? `${node.code} ${node.name}` : node.name}
              className={`group flex items-center gap-1 px-2 py-1.5 text-xs cursor-pointer select-none rounded-md mx-1 ${
                isSelected ? 'bg-primary/10 text-primary' : 'text-gray-700 hover:bg-gray-100'
              }`}
              style={indent(depth)}
              onClick={() => {
                handleSelect(node.id!, node.name)
                if (hasChildren) toggle(node.id!)
              }}
            >
              {hasChildren ? (
                isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />
              ) : (
                <span className="w-3" />
              )}
              {isExpanded ? (
                <FolderOpen className="w-3.5 h-3.5 text-amber-500" />
              ) : (
                <Folder className="w-3.5 h-3.5 text-amber-500" />
              )}
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
                  className="h-6 text-xs py-0 flex-1"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="flex-1 truncate">
                  {node.isBuiltIn ? `${node.code} ${node.name}` : node.name}
                </span>
              )}
              {node.isBuiltIn && <Shield className="w-3 h-3 text-amber-500 flex-shrink-0" />}
              {!node.isBuiltIn && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(node.id!)
                  }}
                  className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded flex-shrink-0 transition-colors"
                  title="删除分类"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </ContextMenu.Trigger>
          <ContextMenu.Portal>
            <ContextMenu.Content className="min-w-[140px] bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50">
              <ContextMenu.Item
                className="px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-gray-100 cursor-pointer outline-none"
                onClick={() => startCreate(node.id!)}
              >
                <Plus className="w-3 h-3" /> 新增子分类
              </ContextMenu.Item>
              <ContextMenu.Item
                className="px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-gray-100 cursor-pointer outline-none"
                onClick={() => startRename(node)}
              >
                <Pencil className="w-3 h-3" /> 重命名
              </ContextMenu.Item>
              <ContextMenu.Item
                className="px-3 py-1.5 text-xs flex items-center gap-2 text-red-600 hover:bg-red-50 cursor-pointer outline-none"
                onClick={() => handleDelete(node.id!)}
              >
                <Trash2 className="w-3 h-3" /> 删除
              </ContextMenu.Item>
            </ContextMenu.Content>
          </ContextMenu.Portal>
        </ContextMenu.Root>
        {isExpanded && node.children.map((child) => renderNode(child, depth + 1))}
        {isExpanded && isCreatingHere && (
          <div className="flex items-center gap-1 px-2 py-1 mx-1" style={indent(depth + 1)}>
            <Folder className="w-3.5 h-3.5 text-amber-500" />
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
              className="h-6 text-xs py-0 flex-1"
            />
          </div>
        )}
      </div>
    )
  }

  const isCreatingRoot = creating?.parentId === null

  const renderCollapsedNode = (node: CategoryNode) => {
    const isSelected = selectedId === node.id
    const hasChildren = node.children.length > 0
    return (
      <div key={node.id} className="flex flex-col items-center relative group">
        <button
          title={node.name}
          className={`w-8 h-8 rounded-md flex items-center justify-center mb-0.5 ${
            isSelected ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:bg-gray-100'
          }`}
          onClick={() => handleSelect(node.id!, node.name)}
        >
          <Folder className="w-4 h-4" />
        </button>
        {hasChildren && (
          <div className="absolute left-9 top-0 hidden group-hover:block bg-white border border-gray-200 rounded-md shadow-lg py-1 px-1 min-w-[120px] z-50">
            <p className="text-[10px] text-gray-400 px-2 py-1 border-b border-gray-100">{node.name}</p>
            {node.children.map((child) => (
              <button
                key={child.id}
                title={child.name}
                className={`w-full text-left px-2 py-1 text-[11px] rounded hover:bg-gray-50 truncate ${
                  selectedId === child.id ? 'text-primary bg-primary/5' : 'text-gray-700'
                }`}
                onClick={(e) => {
                  e.stopPropagation()
                  handleSelect(child.id!, child.name)
                }}
              >
                {child.isBuiltIn ? `${child.code} ${child.name}` : child.name}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (collapsed) {
    return (
      <div className="h-full flex flex-col bg-gray-50/50 border-r border-gray-200 w-11">
        <div className="p-2 border-b border-gray-200 flex justify-center">
          <button
            onClick={onToggleCollapse}
            title="展开分类树"
            className="text-gray-500 hover:text-gray-700"
          >
            <PanelLeft className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-2 space-y-1">
          <button
            title="全部模板"
            className={`w-full h-8 flex items-center justify-center ${
              isSelectedAll ? 'text-primary bg-primary/10' : 'text-gray-600 hover:bg-gray-100'
            }`}
            onClick={() => handleSelect(null, '全部')}
          >
            <FolderOpen className="w-5 h-5" />
          </button>
          {tree.map((node) => renderCollapsedNode(node))}
        </div>
      </div>
    )
  }

  return (
    <div className="absolute left-0 top-0 bottom-0 w-36 bg-white border-r border-gray-200 shadow-xl z-20 flex flex-col">
      <div className="p-2 border-b border-gray-200 flex items-center justify-between">
        <div
          className={`flex items-center gap-2 px-2 py-1.5 text-xs cursor-pointer rounded-md ${
            isSelectedAll ? 'bg-primary/10 text-primary' : 'text-gray-700 hover:bg-gray-100'
          }`}
          onClick={() => handleSelect(null, '全部')}
        >
          <FolderOpen className="w-4 h-4 text-primary" />
          <span className="font-medium">全部模板</span>
        </div>
        <button
          onClick={onToggleCollapse}
          title="收起分类树"
          className="text-gray-400 hover:text-gray-600 p-1"
        >
          <PanelLeftClose className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {tree.map((node) => renderNode(node))}
        {!isCreatingRoot ? (
          <div className="px-2 py-1 mx-1" style={indent(0)}>
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-7 text-[11px] justify-start text-gray-500"
              onClick={() => startCreate(null)}
            >
              <Plus className="w-3 h-3 mr-1" /> 新建一级分类
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-1 px-2 py-1 mx-1" style={indent(0)}>
            <Folder className="w-3.5 h-3.5 text-amber-500" />
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
              className="h-6 text-xs py-0 flex-1"
            />
          </div>
        )}
      </div>
    </div>
  )
}
