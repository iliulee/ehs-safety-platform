import { useMemo, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { useAccidentList } from './hooks/useAccident'
import { AccidentStats } from './components/AccidentStats'
import { AccidentForm } from './components/AccidentForm'
import { AccidentTable } from './components/AccidentTable'
import type { AccidentRecord } from '@/types'

export default function AccidentPage() {
  const items = useAccidentList()
  const [searchText, setSearchText] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<AccidentRecord | null>(null)

  const filteredItems = useMemo(() => {
    if (!searchText.trim()) return items
    const q = searchText.toLowerCase()
    return items.filter((r) =>
      r.title.toLowerCase().includes(q) ||
      (r.accidentType ?? '').toLowerCase().includes(q) ||
      (r.victimName ?? '').toLowerCase().includes(q) ||
      (r.occurrenceLocation ?? '').toLowerCase().includes(q)
    )
  }, [items, searchText])

  const openAdd = () => { setEditingItem(null); setShowForm(true) }
  const openEdit = (item: AccidentRecord) => { setEditingItem(item); setShowForm(true) }
  const handleSaved = () => { setShowForm(false); setEditingItem(null) }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">事故管理</h1>
          <p className="text-sm text-slate-500 mt-1">记录和跟踪安全事故、未遂事件、工伤处理</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium">
          <Plus className="w-4 h-4" />上报事故
        </button>
      </div>

      <AccidentStats items={items} />

      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">{editingItem ? '编辑事故' : '上报事故'}</h3>
          <AccidentForm item={editingItem} onClose={() => setShowForm(false)} onSaved={handleSaved} />
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="搜索事故标题、类型、受害人..." value={searchText} onChange={(e) => setSearchText(e.target.value)} className="w-full h-10 pl-9 pr-4 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
        </div>
      </div>

      <AccidentTable items={filteredItems} onEdit={openEdit} />
    </div>
  )
}