import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { useEquipmentList } from './hooks/useEquipment'
import { EquipmentTable } from './components/EquipmentTable'

export default function EquipmentPage() {
  const navigate = useNavigate()
  const items = useEquipmentList()
  const [searchText, setSearchText] = useState('')

  const filteredItems = useMemo(() => {
    if (!searchText.trim()) return items
    const q = searchText.toLowerCase()
    return items.filter((i) =>
      i.name.toLowerCase().includes(q) ||
      (i.model ?? '').toLowerCase().includes(q) ||
      (i.serialNumber ?? '').toLowerCase().includes(q) ||
      (i.ownerUnit ?? '').toLowerCase().includes(q)
    )
  }, [items, searchText])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">机械设备</h1>
          <p className="text-sm text-slate-500 mt-1">管理施工现场机械设备台账，包括进场、退场、检验、使用状态</p>
        </div>
        <button
          onClick={() => navigate('/equipment/new')}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />登记设备
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="搜索设备名称、型号、编号..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          />
        </div>
      </div>

      <EquipmentTable items={filteredItems} onEdit={(item) => navigate(`/equipment/${item.id}/edit`)} />
    </div>
  )
}
