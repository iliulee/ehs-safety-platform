import { useState } from 'react'
import { Folder, Plus, Pencil, Trash2, LayoutGrid, FileQuestion, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { categoryRepo } from '@/db/repositories/category.repo'
import type { CategoryRecord } from '@/types'
import { toast } from 'sonner'
import { UNCATEGORIZED_ID } from '@/pages/templates/hooks/useTemplateLibrary'

interface CategoryTreeNewProps {
  categories: CategoryRecord[]
  templateCounts: Map<string, number>
  uncategorizedCount: number
  selectedId: string | null
  onSelect: (id: string | null, name: string) => void
  onTreeMutated?: () => void
}

export default function CategoryTreeNew({
  categories,
  templateCounts,
  uncategorizedCount,
  selectedId,
  onSelect,
  onTreeMutated,
}: CategoryTreeNewProps) {
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const totalTemplates = Array.from(templateCounts.values()).reduce((a, b) => a + b, 0)

  const handleCreate = async () => {
    const name = newName.trim()
    if (!name || saving) return
    setSaving(true)
    try {
      await categoryRepo.createCustom(name, null)
      onTreeMutated?.()
      toast.success('分类创建成功')
      setNewName('')
      setCreating(false)
    } catch (err) {
      toast.error('创建失败：' + (err instanceof Error ? err.message : '未知错误'))
    } finally {
      setSaving(false)
    }
  }

  const handleRename = async (id: string) => {
    const name = editingName.trim()
    if (!name || name === categories.find((c) => c.id === id)?.name) {
      setEditingId(null)
      return
    }
    setSaving(true)
    try {
      await categoryRepo.updateName(id, name)
      onTreeMutated?.()
      toast.success('已重命名')
    } catch (err) {
      toast.error('重命名失败：' + (err instanceof Error ? err.message : '未知错误'))
    } finally {
      setEditingId(null)
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    const check = await categoryRepo.canDelete(id)
    if (!check.ok) {
      toast.error(check.reason || '无法删除')
      return
    }
    if (check.count && check.count > 0) {
      toast.error(`该分类下有 ${check.count} 个模板，请先移走模板再删除`)
      return
    }
    setDeletingId(id)
    try {
      await categoryRepo.remove(id)
      onTreeMutated?.()
      if (selectedId === id) onSelect(null, '全部模板')
      toast.success('已删除')
    } catch (err) {
      toast.error('删除失败：' + (err instanceof Error ? err.message : '未知错误'))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="w-full bg-white border-r border-gray-100 shadow-sm flex flex-col h-full">
      {/* 标题栏 */}
      <div className="px-3 py-3 border-b border-gray-100">
        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">模板分类</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* 全部模板 */}
        <div
          className={`flex items-center gap-2 mx-2 mt-1.5 px-2 py-2 text-sm cursor-pointer select-none rounded-xl transition-all duration-150 ${
            selectedId === null ? 'bg-primary/5 text-primary font-semibold' : 'text-gray-600 hover:bg-gray-50'
          }`}
          onClick={() => onSelect(null, '全部模板')}
        >
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
              selectedId === null ? 'bg-primary text-white shadow-sm' : 'bg-gray-100 text-gray-500'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
          </div>
          <span className="flex-1 text-[13px] leading-tight">全部模板</span>
          <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 flex-shrink-0 min-w-[20px] text-center">
            {totalTemplates}
          </span>
        </div>

        {/* 未分类（虚拟筛选项） */}
        <div
          className={`flex items-center gap-2 mx-2 mt-0.5 px-2 py-2 text-sm cursor-pointer select-none rounded-xl transition-all duration-150 ${
            selectedId === UNCATEGORIZED_ID ? 'bg-primary/5 text-primary font-semibold' : 'text-gray-600 hover:bg-gray-50'
          }`}
          onClick={() => onSelect(UNCATEGORIZED_ID, '未分类')}
        >
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
              selectedId === UNCATEGORIZED_ID ? 'bg-primary text-white shadow-sm' : 'bg-gray-100 text-gray-500'
            }`}
          >
            <FileQuestion className="w-4 h-4" />
          </div>
          <span className="flex-1 text-[13px] leading-tight">未分类</span>
          <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 flex-shrink-0 min-w-[20px] text-center">
            {uncategorizedCount}
          </span>
        </div>

        {/* 分隔线 */}
        {categories.length > 0 && <div className="mx-3 my-2 border-t border-gray-100" />}

        {/* 分类列表 */}
        {categories.map((cat) => {
          const count = templateCounts.get(cat.id!) || 0
          const isSelected = selectedId === cat.id
          const isEditing = editingId === cat.id
          const isDeleting = deletingId === cat.id

          return (
            <div key={cat.id} className="mx-2 mb-0.5">
              {isEditing ? (
                <div className="flex items-center gap-2 px-2 py-1.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                    <Folder className="w-4 h-4 text-amber-500" />
                  </div>
                  <Input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={() => handleRename(cat.id!)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRename(cat.id!)
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    autoFocus
                    className="h-7 text-xs py-0 flex-1"
                  />
                </div>
              ) : (
                <div
                  className={`flex items-center gap-2 px-2 py-2 text-sm cursor-pointer select-none rounded-xl transition-all duration-150 group ${
                    isSelected ? 'bg-primary/5 text-primary font-semibold' : 'text-gray-600 hover:bg-gray-50'
                  } ${isDeleting ? 'opacity-50 pointer-events-none' : ''}`}
                  onClick={() => onSelect(cat.id!, cat.name)}
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isSelected ? 'bg-primary text-white shadow-sm' : 'bg-amber-50 text-amber-500'
                    }`}
                  >
                    {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Folder className="w-4 h-4" />}
                  </div>
                  <span className="flex-1 text-[13px] leading-tight break-all">{cat.name}</span>
                  <span
                    className={`text-[11px] px-1.5 py-0.5 rounded-full flex-shrink-0 min-w-[20px] text-center ${
                      isSelected ? 'bg-primary/20 text-primary' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {count}
                  </span>
                  {/* 编辑/删除按钮始终可见 */}
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingId(cat.id!)
                        setEditingName(cat.name)
                      }}
                      className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-primary hover:bg-primary/5 rounded-md transition-colors"
                      title="重命名"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(cat.id!)
                      }}
                      className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                      title="删除分类"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 底部新建分类 */}
      <div className="border-t border-gray-100 px-2 py-2">
        {creating ? (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
              <Folder className="w-4 h-4 text-amber-500" />
            </div>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={handleCreate}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate()
                if (e.key === 'Escape') {
                  setCreating(false)
                  setNewName('')
                }
              }}
              autoFocus
              placeholder="新分类名称"
              className="h-7 text-xs py-0 flex-1"
              disabled={saving}
            />
            {saving && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-9 text-sm justify-start text-gray-500 hover:text-primary hover:bg-primary/5 rounded-xl"
            onClick={() => setCreating(true)}
          >
            <Plus className="w-4 h-4 mr-2" /> 新建分类
          </Button>
        )}
      </div>
    </div>
  )
}