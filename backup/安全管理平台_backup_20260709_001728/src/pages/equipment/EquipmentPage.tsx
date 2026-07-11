import { useEffect, useState, useMemo } from 'react'
import { Wrench, Plus, Search, Edit3, Trash2, X } from 'lucide-react'
import { equipmentService } from '@/services/equipment.service'
import { getCurrentProjectId } from '@/store'
import type { Equipment } from '@/types'

const CATEGORIES = ['起重机械', '土方机械', '混凝土机械', '运输机械', '其他']
const STATUSES: Equipment['status'][] = ['在用', '停用', '已退场', '待检验']

function statusBadge(status: Equipment['status']) {
  const map: Record<string, string> = {
    '在用': 'bg-emerald-50 text-emerald-700',
    '停用': 'bg-slate-100 text-slate-500',
    '已退场': 'bg-gray-100 text-gray-500',
    '待检验': 'bg-amber-50 text-amber-700',
  }
  return <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${map[status]}`}>{status}</span>
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-'
  return dateStr.slice(0, 10)
}

export default function EquipmentPage() {
  const [items, setItems] = useState<Equipment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchText, setSearchText] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<Equipment | null>(null)

  const [name, setName] = useState('')
  const [category, setCategory] = useState('起重机械')
  const [model, setModel] = useState('')
  const [serialNumber, setSerialNumber] = useState('')
  const [ownerUnit, setOwnerUnit] = useState('')
  const [entryDate, setEntryDate] = useState('')
  const [exitDate, setExitDate] = useState('')
  const [inspectionDate, setInspectionDate] = useState('')
  const [nextInspectionDate, setNextInspectionDate] = useState('')
  const [status, setStatus] = useState<Equipment['status']>('在用')
  const [remark, setRemark] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const loadData = async () => {
    setLoading(true)
    const list = await equipmentService.list()
    setItems(list.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)))
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const filteredItems = useMemo(() => {
    if (!searchText.trim()) return items
    const q = searchText.toLowerCase()
    return items.filter(i =>
      i.name.toLowerCase().includes(q) ||
      (i.model ?? '').toLowerCase().includes(q) ||
      (i.serialNumber ?? '').toLowerCase().includes(q) ||
      (i.ownerUnit ?? '').toLowerCase().includes(q) ||
      (i.category ?? '').toLowerCase().includes(q)
    )
  }, [items, searchText])

  const resetForm = () => {
    setName('')
    setCategory('起重机械')
    setModel('')
    setSerialNumber('')
    setOwnerUnit('')
    setEntryDate('')
    setExitDate('')
    setInspectionDate('')
    setNextInspectionDate('')
    setStatus('在用')
    setRemark('')
  }

  const openAdd = () => {
    resetForm()
    setEditingItem(null)
    setShowForm(true)
  }

  const openEdit = (item: Equipment) => {
    setName(item.name)
    setCategory(item.category)
    setModel(item.model ?? '')
    setSerialNumber(item.serialNumber ?? '')
    setOwnerUnit(item.ownerUnit ?? '')
    setEntryDate(item.entryDate ?? '')
    setExitDate(item.exitDate ?? '')
    setInspectionDate(item.inspectionDate ?? '')
    setNextInspectionDate(item.nextInspectionDate ?? '')
    setStatus(item.status)
    setRemark(item.remark ?? '')
    setEditingItem(item)
    setShowForm(true)
  }

  const handleSubmit = async () => {
    if (!name.trim()) return
    setSubmitting(true)
    try {
      const data = {
        name: name.trim(),
        category,
        model: model.trim() || undefined,
        serialNumber: serialNumber.trim() || undefined,
        ownerUnit: ownerUnit.trim() || undefined,
        entryDate: entryDate || undefined,
        exitDate: exitDate || undefined,
        inspectionDate: inspectionDate || undefined,
        nextInspectionDate: nextInspectionDate || undefined,
        status,
        remark: remark.trim() || undefined,
        projectId: getCurrentProjectId(),
      }
      if (editingItem?.id) {
        await equipmentService.update(editingItem.id, data)
      } else {
        await equipmentService.create(data as Parameters<typeof equipmentService.create>[0])
      }
      setShowForm(false)
      loadData()
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (item: Equipment) => {
    if (!item.id || !confirm(`确定删除"${item.name}"？`)) return
    await equipmentService.remove(item.id)
    loadData()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">机械设备</h1>
          <p className="text-sm text-slate-500 mt-1">管理施工现场机械设备台账、进场验收、维修保养记录</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium">
          <Plus className="w-4 h-4" />
          登记设备
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-800">{editingItem ? '编辑设备' : '登记设备'}</h3>
            <button onClick={() => setShowForm(false)} className="p-1 hover:bg-slate-100 rounded"><X className="w-4 h-4 text-slate-400" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1">设备名称 <span className="text-red-400">*</span></label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="如：塔式起重机" className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">类别</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">型号</label>
              <input value={model} onChange={e => setModel(e.target.value)} placeholder="如：QTZ80" className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">出厂编号</label>
              <input value={serialNumber} onChange={e => setSerialNumber(e.target.value)} placeholder="出厂编号" className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">所属单位</label>
              <input value={ownerUnit} onChange={e => setOwnerUnit(e.target.value)} placeholder="所属单位" className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">状态</label>
              <select value={status} onChange={e => setStatus(e.target.value as Equipment['status'])} className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500">
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">进场日期</label>
              <input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">退场日期</label>
              <input type="date" value={exitDate} onChange={e => setExitDate(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">上次检验日期</label>
              <input type="date" value={inspectionDate} onChange={e => setInspectionDate(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">下次检验日期</label>
              <input type="date" value={nextInspectionDate} onChange={e => setNextInspectionDate(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs text-slate-500 mb-1">备注</label>
              <input value={remark} onChange={e => setRemark(e.target.value)} placeholder="备注信息" className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">取消</button>
            <button onClick={handleSubmit} disabled={!name.trim() || submitting} className="px-4 py-2 text-sm text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed">
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
            placeholder="搜索设备名称、编号、型号..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">设备名称</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">类别</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">型号</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">编号</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">所属单位</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">进场日期</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">退场日期</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">下次检验</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">状态</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-slate-500">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-6 py-16 text-center text-sm text-slate-400">加载中...</td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-16 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
                      <Wrench className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="text-sm text-slate-400">暂无机械设备记录</p>
                    <p className="text-xs text-slate-300 mt-1">点击"登记设备"按钮添加第一台设备</p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-3 font-medium text-slate-800">{item.name}</td>
                    <td className="px-6 py-3 text-slate-600">{item.category}</td>
                    <td className="px-6 py-3 text-slate-600">{item.model || '-'}</td>
                    <td className="px-6 py-3 text-slate-600">{item.serialNumber || '-'}</td>
                    <td className="px-6 py-3 text-slate-600">{item.ownerUnit || '-'}</td>
                    <td className="px-6 py-3 text-slate-600">{formatDate(item.entryDate)}</td>
                    <td className="px-6 py-3 text-slate-600">{formatDate(item.exitDate)}</td>
                    <td className="px-6 py-3 text-slate-600">{formatDate(item.nextInspectionDate)}</td>
                    <td className="px-6 py-3">{statusBadge(item.status)}</td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(item)} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-teal-600"><Edit3 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(item)} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}