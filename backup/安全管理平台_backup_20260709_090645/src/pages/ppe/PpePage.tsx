import { useMemo, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { usePpeList } from './hooks/usePpe'
import { PpeForm } from './components/PpeForm'
import { PpeTable } from './components/PpeTable'
import type { PpeItem } from '@/types'

export default function PpePage() {
  const items = usePpeList()
  const [searchText, setSearchText] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<PpeItem | null>(null)

  const filteredItems = useMemo(() => {
    if (!searchText.trim()) return items
    const q = searchText.toLowerCase()
    return items.filter((i) =>
      i.name.toLowerCase().includes(q) ||
      (i.specification ?? '').toLowerCase().includes(q) ||
      (i.supplier ?? '').toLowerCase().includes(q) ||
      (i.category ?? '').toLowerCase().includes(q)
    )
  }, [items, searchText])

  const openAdd = () => {
    setEditingItem(null)
    setShowForm(true)
  }

  const openEdit = (item: PpeItem) => {
    setEditingItem(item)
    setShowForm(true)
  }

  const handleSaved = () => {
    setShowForm(false)
    setEditingItem(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">劳保用品</h1>
          <p className="text-sm text-slate-500 mt-1">管理安全帽、安全带、防护服等劳保用品的采购、发放、报废记录</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium">
          <Plus className="w-4 h-4" />
          入库登记
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">{editingItem ? '编辑劳保用品' : '新增劳保用品'}</h3>
          <PpeForm item={editingItem} onClose={() => setShowForm(false)} onSaved={handleSaved} />
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="搜索用品名称、规格、供应商..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          />
        </div>
      </div>

      <PpeTable items={filteredItems} onEdit={openEdit} />
    </div>
  )
}
