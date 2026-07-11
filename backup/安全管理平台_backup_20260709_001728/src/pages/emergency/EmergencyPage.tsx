import { useEffect, useState, useMemo } from 'react'
import { Siren, Plus, Search, Edit3, Trash2, X } from 'lucide-react'
import { emergencyPlanService, emergencySupplyService, emergencyDrillService } from '@/services/emergency.service'
import { getCurrentProjectId } from '@/store'
import type { EmergencyPlan, EmergencySupply, EmergencyDrill } from '@/types'

type TabKey = 'plan' | 'supply' | 'drill'

const PLAN_CATEGORIES = ['综合预案', '专项预案', '现场处置方案']
const SUPPLY_CATEGORIES = ['消防器材', '急救药品', '防护装备', '照明设备', '通讯设备', '其他']
const DRILL_TYPES = ['消防演练', '防汛演练', '坍塌救援', '触电救援', '其他']
const SUPPLY_STATUSES: EmergencySupply['status'][] = ['正常', '即将过期', '已过期', '短缺']

function supplyStatusBadge(status: EmergencySupply['status']) {
  const map: Record<string, string> = {
    '正常': 'bg-emerald-50 text-emerald-700',
    '即将过期': 'bg-amber-50 text-amber-700',
    '已过期': 'bg-red-50 text-red-700',
    '短缺': 'bg-orange-50 text-orange-700',
  }
  return <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${map[status]}`}>{status}</span>
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-'
  return dateStr.slice(0, 10)
}

export default function EmergencyPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('plan')
  const [plans, setPlans] = useState<EmergencyPlan[]>([])
  const [supplies, setSupplies] = useState<EmergencySupply[]>([])
  const [drills, setDrills] = useState<EmergencyDrill[]>([])
  const [loading, setLoading] = useState(true)
  const [searchText, setSearchText] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Plan form
  const [planName, setPlanName] = useState('')
  const [planCategory, setPlanCategory] = useState('综合预案')
  const [planScope, setPlanScope] = useState('')
  const [planVersion, setPlanVersion] = useState('')
  const [planIssueDate, setPlanIssueDate] = useState('')
  const [planContent, setPlanContent] = useState('')

  // Supply form
  const [supplyName, setSupplyName] = useState('')
  const [supplyCategory, setSupplyCategory] = useState('消防器材')
  const [supplySpec, setSupplySpec] = useState('')
  const [supplyQuantity, setSupplyQuantity] = useState('')
  const [supplyUnit, setSupplyUnit] = useState('个')
  const [supplyLocation, setSupplyLocation] = useState('')
  const [supplyLastCheck, setSupplyLastCheck] = useState('')
  const [supplyExpiry, setSupplyExpiry] = useState('')
  const [supplyStatus, setSupplyStatus] = useState<EmergencySupply['status']>('正常')

  // Drill form
  const [drillTitle, setDrillTitle] = useState('')
  const [drillType, setDrillType] = useState('消防演练')
  const [drillDate, setDrillDate] = useState('')
  const [drillLocation, setDrillLocation] = useState('')
  const [drillOrganizer, setDrillOrganizer] = useState('')
  const [drillParticipants, setDrillParticipants] = useState('')
  const [drillContent, setDrillContent] = useState('')
  const [drillEvaluation, setDrillEvaluation] = useState('')
  const [drillIssues, setDrillIssues] = useState('')

  const [submitting, setSubmitting] = useState(false)

  const loadData = async () => {
    setLoading(true)
    const [p, s, d] = await Promise.all([
      emergencyPlanService.list(),
      emergencySupplyService.list(),
      emergencyDrillService.list(),
    ])
    setPlans(p.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)))
    setSupplies(s.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)))
    setDrills(d.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)))
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const filteredPlans = useMemo(() => {
    if (!searchText.trim()) return plans
    const q = searchText.toLowerCase()
    return plans.filter(p => p.name.toLowerCase().includes(q) || (p.category ?? '').toLowerCase().includes(q))
  }, [plans, searchText])

  const filteredSupplies = useMemo(() => {
    if (!searchText.trim()) return supplies
    const q = searchText.toLowerCase()
    return supplies.filter(s => s.name.toLowerCase().includes(q) || (s.category ?? '').toLowerCase().includes(q))
  }, [supplies, searchText])

  const filteredDrills = useMemo(() => {
    if (!searchText.trim()) return drills
    const q = searchText.toLowerCase()
    return drills.filter(d => d.title.toLowerCase().includes(q) || (d.drillType ?? '').toLowerCase().includes(q))
  }, [drills, searchText])

  const resetPlanForm = () => {
    setPlanName(''); setPlanCategory('综合预案'); setPlanScope('')
    setPlanVersion(''); setPlanIssueDate(''); setPlanContent('')
  }

  const resetSupplyForm = () => {
    setSupplyName(''); setSupplyCategory('消防器材'); setSupplySpec('')
    setSupplyQuantity(''); setSupplyUnit('个'); setSupplyLocation('')
    setSupplyLastCheck(''); setSupplyExpiry(''); setSupplyStatus('正常')
  }

  const resetDrillForm = () => {
    setDrillTitle(''); setDrillType('消防演练'); setDrillDate('')
    setDrillLocation(''); setDrillOrganizer(''); setDrillParticipants('')
    setDrillContent(''); setDrillEvaluation(''); setDrillIssues('')
  }

  const openAdd = (tab: TabKey) => {
    setActiveTab(tab)
    setEditingId(null)
    if (tab === 'plan') resetPlanForm()
    if (tab === 'supply') resetSupplyForm()
    if (tab === 'drill') resetDrillForm()
    setShowForm(true)
  }

  const openEditPlan = (p: EmergencyPlan) => {
    setActiveTab('plan')
    setPlanName(p.name); setPlanCategory(p.category)
    setPlanScope(p.applicableScope ?? ''); setPlanVersion(p.version ?? '')
    setPlanIssueDate(p.issueDate ?? ''); setPlanContent(p.content ?? '')
    setEditingId(p.id ?? null); setShowForm(true)
  }

  const openEditSupply = (s: EmergencySupply) => {
    setActiveTab('supply')
    setSupplyName(s.name); setSupplyCategory(s.category)
    setSupplySpec(s.specification ?? ''); setSupplyQuantity(String(s.quantity))
    setSupplyUnit(s.unit); setSupplyLocation(s.storageLocation ?? '')
    setSupplyLastCheck(s.lastCheckDate ?? ''); setSupplyExpiry(s.expiryDate ?? '')
    setSupplyStatus(s.status)
    setEditingId(s.id ?? null); setShowForm(true)
  }

  const openEditDrill = (d: EmergencyDrill) => {
    setActiveTab('drill')
    setDrillTitle(d.title); setDrillType(d.drillType)
    setDrillDate(d.date); setDrillLocation(d.location ?? '')
    setDrillOrganizer(d.organizer ?? ''); setDrillParticipants(d.participantCount != null ? String(d.participantCount) : '')
    setDrillContent(d.content ?? ''); setDrillEvaluation(d.evaluation ?? '')
    setDrillIssues(d.issues ?? '')
    setEditingId(d.id ?? null); setShowForm(true)
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const pid = getCurrentProjectId()
      if (activeTab === 'plan') {
        if (!planName.trim()) return
        const data = {
          name: planName.trim(), category: planCategory,
          applicableScope: planScope.trim() || undefined,
          version: planVersion.trim() || undefined,
          issueDate: planIssueDate || undefined,
          content: planContent.trim() || undefined,
          projectId: pid,
        }
        if (editingId) await emergencyPlanService.update(editingId, data)
        else await emergencyPlanService.create(data as Parameters<typeof emergencyPlanService.create>[0])
      } else if (activeTab === 'supply') {
        if (!supplyName.trim()) return
        const data = {
          name: supplyName.trim(), category: supplyCategory,
          specification: supplySpec.trim() || undefined,
          quantity: Number(supplyQuantity) || 0, unit: supplyUnit,
          storageLocation: supplyLocation.trim() || undefined,
          lastCheckDate: supplyLastCheck || undefined,
          expiryDate: supplyExpiry || undefined,
          status: supplyStatus, projectId: pid,
        }
        if (editingId) await emergencySupplyService.update(editingId, data)
        else await emergencySupplyService.create(data as Parameters<typeof emergencySupplyService.create>[0])
      } else {
        if (!drillTitle.trim() || !drillDate) return
        const data = {
          title: drillTitle.trim(), drillType: drillType,
          date: drillDate, location: drillLocation.trim() || undefined,
          organizer: drillOrganizer.trim() || undefined,
          participantCount: drillParticipants ? Number(drillParticipants) : undefined,
          content: drillContent.trim() || undefined,
          evaluation: drillEvaluation.trim() || undefined,
          issues: drillIssues.trim() || undefined,
          projectId: pid,
        }
        if (editingId) await emergencyDrillService.update(editingId, data)
        else await emergencyDrillService.create(data as Parameters<typeof emergencyDrillService.create>[0])
      }
      setShowForm(false)
      loadData()
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!editingId) return
    const name = activeTab === 'plan' ? planName : activeTab === 'supply' ? supplyName : drillTitle
    if (!confirm(`确定删除"${name}"？`)) return
    if (activeTab === 'plan') await emergencyPlanService.remove(editingId)
    else if (activeTab === 'supply') await emergencySupplyService.remove(editingId)
    else await emergencyDrillService.remove(editingId)
    loadData()
  }

  const tabButtons: { key: TabKey; label: string; count: number }[] = [
    { key: 'plan', label: '应急预案', count: plans.length },
    { key: 'supply', label: '应急物资', count: supplies.length },
    { key: 'drill', label: '演练记录', count: drills.length },
  ]

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

      {/* Tab 切换 */}
      <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        {tabButtons.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setEditingId(null); setShowForm(false) }}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label} <span className="ml-1 text-xs opacity-60">{tab.count}</span>
          </button>
        ))}
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-800">
              {editingId ? '编辑' : '新增'}
              {activeTab === 'plan' ? '应急预案' : activeTab === 'supply' ? '应急物资' : '演练记录'}
            </h3>
            <button onClick={() => setShowForm(false)} className="p-1 hover:bg-slate-100 rounded"><X className="w-4 h-4 text-slate-400" /></button>
          </div>

          {activeTab === 'plan' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">预案名称 <span className="text-red-400">*</span></label>
                <input value={planName} onChange={e => setPlanName(e.target.value)} placeholder="如：防汛应急预案" className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">类别</label>
                <select value={planCategory} onChange={e => setPlanCategory(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500">
                  {PLAN_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">版本号</label>
                <input value={planVersion} onChange={e => setPlanVersion(e.target.value)} placeholder="如：V2.0" className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">发布日期</label>
                <input type="date" value={planIssueDate} onChange={e => setPlanIssueDate(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-slate-500 mb-1">适用范围</label>
                <input value={planScope} onChange={e => setPlanScope(e.target.value)} placeholder="如：适用于本项目施工现场" className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
              </div>
              <div className="md:col-span-3">
                <label className="block text-xs text-slate-500 mb-1">预案内容</label>
                <textarea rows={3} value={planContent} onChange={e => setPlanContent(e.target.value)} placeholder="简要描述预案内容" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none" />
              </div>
            </div>
          )}

          {activeTab === 'supply' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">物资名称 <span className="text-red-400">*</span></label>
                <input value={supplyName} onChange={e => setSupplyName(e.target.value)} placeholder="如：干粉灭火器" className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">类别</label>
                <select value={supplyCategory} onChange={e => setSupplyCategory(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500">
                  {SUPPLY_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">规格</label>
                <input value={supplySpec} onChange={e => setSupplySpec(e.target.value)} placeholder="如：4kg" className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">数量</label>
                <input type="number" value={supplyQuantity} onChange={e => setSupplyQuantity(e.target.value)} placeholder="0" className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">单位</label>
                <select value={supplyUnit} onChange={e => setSupplyUnit(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500">
                  {['个', '箱', '套', '件', '瓶', '台'].map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">状态</label>
                <select value={supplyStatus} onChange={e => setSupplyStatus(e.target.value as EmergencySupply['status'])} className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500">
                  {SUPPLY_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">存放地点</label>
                <input value={supplyLocation} onChange={e => setSupplyLocation(e.target.value)} placeholder="如：仓库A区" className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">最近检查日期</label>
                <input type="date" value={supplyLastCheck} onChange={e => setSupplyLastCheck(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">有效期</label>
                <input type="date" value={supplyExpiry} onChange={e => setSupplyExpiry(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
              </div>
            </div>
          )}

          {activeTab === 'drill' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">演练标题 <span className="text-red-400">*</span></label>
                <input value={drillTitle} onChange={e => setDrillTitle(e.target.value)} placeholder="如：2024年消防应急演练" className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">演练类型</label>
                <select value={drillType} onChange={e => setDrillType(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500">
                  {DRILL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">演练日期 <span className="text-red-400">*</span></label>
                <input type="date" value={drillDate} onChange={e => setDrillDate(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">演练地点</label>
                <input value={drillLocation} onChange={e => setDrillLocation(e.target.value)} placeholder="如：工地东侧空地" className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">组织者</label>
                <input value={drillOrganizer} onChange={e => setDrillOrganizer(e.target.value)} placeholder="姓名" className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">参与人数</label>
                <input type="number" value={drillParticipants} onChange={e => setDrillParticipants(e.target.value)} placeholder="0" className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
              </div>
              <div className="md:col-span-3">
                <label className="block text-xs text-slate-500 mb-1">演练内容</label>
                <textarea rows={2} value={drillContent} onChange={e => setDrillContent(e.target.value)} placeholder="简要描述演练内容" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none" />
              </div>
              <div className="md:col-span-3">
                <label className="block text-xs text-slate-500 mb-1">演练评估</label>
                <textarea rows={2} value={drillEvaluation} onChange={e => setDrillEvaluation(e.target.value)} placeholder="评估演练效果" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none" />
              </div>
              <div className="md:col-span-3">
                <label className="block text-xs text-slate-500 mb-1">存在问题</label>
                <textarea rows={2} value={drillIssues} onChange={e => setDrillIssues(e.target.value)} placeholder="演练中发现的问题" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none" />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-4">
            {editingId && (
              <button onClick={handleDelete} className="px-4 py-2 text-sm text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50">
                <Trash2 className="w-4 h-4 inline mr-1" />删除
              </button>
            )}
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">取消</button>
            <button onClick={handleSubmit} disabled={submitting} className="px-4 py-2 text-sm text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed">
              {submitting ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={activeTab === 'plan' ? '搜索预案名称...' : activeTab === 'supply' ? '搜索物资名称...' : '搜索演练标题...'}
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="px-6 py-16 text-center text-sm text-slate-400">加载中...</div>
          ) : (
            <>
              {/* Plans table */}
              {activeTab === 'plan' && (
                filteredPlans.length === 0 ? (
                  <div className="px-6 py-16 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
                      <Siren className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="text-sm text-slate-400">暂无应急预案</p>
                    <p className="text-xs text-slate-300 mt-1">点击"新建预案"添加</p>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/50">
                        <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">预案名称</th>
                        <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">类别</th>
                        <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">版本</th>
                        <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">发布日期</th>
                        <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">适用范围</th>
                        <th className="text-right px-6 py-3 text-xs font-medium text-slate-500">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPlans.map(p => (
                        <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-3 font-medium text-slate-800">{p.name}</td>
                          <td className="px-6 py-3 text-slate-600">{p.category}</td>
                          <td className="px-6 py-3 text-slate-600">{p.version || '-'}</td>
                          <td className="px-6 py-3 text-slate-600">{formatDate(p.issueDate)}</td>
                          <td className="px-6 py-3 text-slate-600">{p.applicableScope || '-'}</td>
                          <td className="px-6 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => openEditPlan(p)} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-teal-600"><Edit3 className="w-4 h-4" /></button>
                              <button onClick={async () => { if (p.id && confirm(`确定删除"${p.name}"？`)) { await emergencyPlanService.remove(p.id); loadData() } }} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              )}

              {/* Supplies table */}
              {activeTab === 'supply' && (
                filteredSupplies.length === 0 ? (
                  <div className="px-6 py-16 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
                      <Siren className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="text-sm text-slate-400">暂无应急物资</p>
                    <p className="text-xs text-slate-300 mt-1">点击"登记物资"添加</p>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/50">
                        <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">物资名称</th>
                        <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">类别</th>
                        <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">规格</th>
                        <th className="text-right px-6 py-3 text-xs font-medium text-slate-500">数量</th>
                        <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">存放地点</th>
                        <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">有效期</th>
                        <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">状态</th>
                        <th className="text-right px-6 py-3 text-xs font-medium text-slate-500">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSupplies.map(s => (
                        <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-3 font-medium text-slate-800">{s.name}</td>
                          <td className="px-6 py-3 text-slate-600">{s.category}</td>
                          <td className="px-6 py-3 text-slate-600">{s.specification || '-'}</td>
                          <td className="px-6 py-3 text-right text-slate-600">{s.quantity} {s.unit}</td>
                          <td className="px-6 py-3 text-slate-600">{s.storageLocation || '-'}</td>
                          <td className="px-6 py-3 text-slate-600">{formatDate(s.expiryDate)}</td>
                          <td className="px-6 py-3">{supplyStatusBadge(s.status)}</td>
                          <td className="px-6 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => openEditSupply(s)} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-teal-600"><Edit3 className="w-4 h-4" /></button>
                              <button onClick={async () => { if (s.id && confirm(`确定删除"${s.name}"？`)) { await emergencySupplyService.remove(s.id); loadData() } }} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              )}

              {/* Drills table */}
              {activeTab === 'drill' && (
                filteredDrills.length === 0 ? (
                  <div className="px-6 py-16 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
                      <Siren className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="text-sm text-slate-400">暂无演练记录</p>
                    <p className="text-xs text-slate-300 mt-1">点击"登记演练"添加</p>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/50">
                        <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">演练标题</th>
                        <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">类型</th>
                        <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">日期</th>
                        <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">地点</th>
                        <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">组织者</th>
                        <th className="text-right px-6 py-3 text-xs font-medium text-slate-500">参与人数</th>
                        <th className="text-right px-6 py-3 text-xs font-medium text-slate-500">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDrills.map(d => (
                        <tr key={d.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-3 font-medium text-slate-800">{d.title}</td>
                          <td className="px-6 py-3 text-slate-600">{d.drillType}</td>
                          <td className="px-6 py-3 text-slate-600">{formatDate(d.date)}</td>
                          <td className="px-6 py-3 text-slate-600">{d.location || '-'}</td>
                          <td className="px-6 py-3 text-slate-600">{d.organizer || '-'}</td>
                          <td className="px-6 py-3 text-right text-slate-600">{d.participantCount ?? '-'}</td>
                          <td className="px-6 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => openEditDrill(d)} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-teal-600"><Edit3 className="w-4 h-4" /></button>
                              <button onClick={async () => { if (d.id && confirm(`确定删除"${d.title}"？`)) { await emergencyDrillService.remove(d.id); loadData() } }} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}