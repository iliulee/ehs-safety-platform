import { useMemo, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { safetyCostService } from '@/services/safetyCost.service'
import { useSafetyCostList, useSafetyCostStats } from './hooks/useSafetyCost'
import { SafetyCostStats } from './components/SafetyCostStats'
import { SafetyCostForm } from './components/SafetyCostForm'
import { SafetyCostTable } from './components/SafetyCostTable'
import type { SafetyCost } from '@/types'

export default function SafetyCostPage() {
  const items = useSafetyCostList()
  const stats = useSafetyCostStats(items)
  const [searchText, setSearchText] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<SafetyCost | null>(null)

  const filteredItems = useMemo(() => {
    if (!searchText.trim()) return items
    const q = searchText.toLowerCase()
    return items.filter((i) =>
      (i.category ?? '').toLowerCase().includes(q) ||
      (i.handler ?? '').toLowerCase().includes(q) ||
      (i.remark ?? '').toLowerCase().includes(q) ||
      String(i.amount).includes(q)
    )
  }, [items, searchText])

  const openAdd = () => {
    setEditingItem(null)
    setShowForm(true)
  }

  const openEdit = (item: SafetyCost) => {
    setEditingItem(item)
    setShowForm(true)
  }

  const handleSaved = () => {
    setShowForm(false)
    setEditingItem(null)
  }

  const handleDelete = async (item: SafetyCost) => {
    if (!item.id || !confirm('确定删除该费用记录？')) return
    await safetyCostService.remove(item.id)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">安全费用</h1>
          <p className="text-sm text-slate-500 mt-1">管理安全生产费用台账，包括投入计划、实际支出、统计分析</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium">
          <Plus className="w-4 h-4" />
          登记费用
        </button>
      </div>

      <SafetyCostStats stats={stats} />

      {showForm && (
        <SafetyCostForm
          item={editingItem}
          onClose={() => setShowForm(false)}
          onSaved={handleSaved}
        />
      )}

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="搜索费用类别、经办人、备注..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          />
        </div>
      </div>

      <SafetyCostTable items={filteredItems} onEdit={openEdit} onDelete={handleDelete} />
    </div>
  )
}
