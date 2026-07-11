import { useMemo, useState } from 'react'
import { Plus, Search, X } from 'lucide-react'
import { useEmergencyData } from './hooks/useEmergency'
import { PlanForm } from './components/PlanForm'
import { SupplyForm } from './components/SupplyForm'
import { DrillForm } from './components/DrillForm'
import { PlanTable } from './components/PlanTable'
import { SupplyTable } from './components/SupplyTable'
import { DrillTable } from './components/DrillTable'
import type { EmergencyPlan, EmergencySupply, EmergencyDrill } from '@/types'

type TabKey = 'plan' | 'supply' | 'drill'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'plan', label: '应急预案' },
  { key: 'supply', label: '应急物资' },
  { key: 'drill', label: '演练记录' },
]

export default function EmergencyPage() {
  const { plans, supplies, drills } = useEmergencyData()
  const [activeTab, setActiveTab] = useState<TabKey>('plan')
  const [searchText, setSearchText] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingPlan, setEditingPlan] = useState<EmergencyPlan | null>(null)
  const [editingSupply, setEditingSupply] = useState<EmergencySupply | null>(null)
  const [editingDrill, setEditingDrill] = useState<EmergencyDrill | null>(null)

  const filteredPlans = useMemo(() => {
    if (!searchText.trim()) return plans
    const q = searchText.toLowerCase()
    return plans.filter((p) => p.name.toLowerCase().includes(q) || (p.category ?? '').toLowerCase().includes(q))
  }, [plans, searchText])

  const filteredSupplies = useMemo(() => {
    if (!searchText.trim()) return supplies
    const q = searchText.toLowerCase()
    return supplies.filter((s) => s.name.toLowerCase().includes(q) || (s.category ?? '').toLowerCase().includes(q))
  }, [supplies, searchText])

  const filteredDrills = useMemo(() => {
    if (!searchText.trim()) return drills
    const q = searchText.toLowerCase()
    return drills.filter((d) => d.title.toLowerCase().includes(q) || (d.drillType ?? '').toLowerCase().includes(q))
  }, [drills, searchText])

  const counts = { plan: plans.length, supply: supplies.length, drill: drills.length }

  const openAdd = (tab: TabKey) => {
    setActiveTab(tab)
    setEditingPlan(null)
    setEditingSupply(null)
    setEditingDrill(null)
    setShowForm(true)
  }

  const openEditPlan = (p: EmergencyPlan) => { setActiveTab('plan'); setEditingPlan(p); setShowForm(true) }
  const openEditSupply = (s: EmergencySupply) => { setActiveTab('supply'); setEditingSupply(s); setShowForm(true) }
  const openEditDrill = (d: EmergencyDrill) => { setActiveTab('drill'); setEditingDrill(d); setShowForm(true) }

  const handleSaved = () => {
    setShowForm(false)
    setEditingPlan(null)
    setEditingSupply(null)
    setEditingDrill(null)
  }

  const switchTab = (tab: TabKey) => {
    setActiveTab(tab)
    setShowForm(false)
    setSearchText('')
  }

  const searchPlaceholder = activeTab === 'plan' ? '搜索预案名称...' : activeTab === 'supply' ? '搜索物资名称...' : '搜索演练标题...'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">应急管理</h1>
          <p className="text-sm text-slate-500 mt-1">管理应急预案、应急物资、应急演练记录</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => openAdd('plan')} className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium">
            <Plus className="w-4 h-4" />新建预案
          </button>
          <button onClick={() => openAdd('supply')} className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium">
            <Plus className="w-4 h-4" />登记物资
          </button>
          <button onClick={() => openAdd('drill')} className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium">
            <Plus className="w-4 h-4" />登记演练
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => switchTab(tab.key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label} <span className="ml-1 text-xs opacity-60">{counts[tab.key]}</span>
          </button>
        ))}
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-800">
              {activeTab === 'plan' ? (editingPlan ? '编辑应急预案' : '新建应急预案') :
               activeTab === 'supply' ? (editingSupply ? '编辑应急物资' : '登记应急物资') :
               editingDrill ? '编辑演练记录' : '登记演练记录'}
            </h3>
            <button onClick={() => setShowForm(false)} className="p-1 hover:bg-slate-100 rounded"><X className="w-4 h-4 text-slate-400" /></button>
          </div>
          {activeTab === 'plan' && <PlanForm item={editingPlan} onClose={() => setShowForm(false)} onSaved={handleSaved} />}
          {activeTab === 'supply' && <SupplyForm item={editingSupply} onClose={() => setShowForm(false)} onSaved={handleSaved} />}
          {activeTab === 'drill' && <DrillForm item={editingDrill} onClose={() => setShowForm(false)} onSaved={handleSaved} />}
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          {activeTab === 'plan' && <PlanTable items={filteredPlans} onEdit={openEditPlan} />}
          {activeTab === 'supply' && <SupplyTable items={filteredSupplies} onEdit={openEditSupply} />}
          {activeTab === 'drill' && <DrillTable items={filteredDrills} onEdit={openEditDrill} />}
        </div>
      </div>
    </div>
  )
}
