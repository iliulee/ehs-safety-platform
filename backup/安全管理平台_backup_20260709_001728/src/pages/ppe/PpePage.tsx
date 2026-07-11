import { useEffect, useState, useMemo } from 'react'
import { HardHat, Plus, Search, Edit3, Trash2, X } from 'lucide-react'
import { ppeService } from '@/services/ppe.service'
import { getCurrentProjectId } from '@/store'
import type { PpeItem } from '@/types'

const CATEGORIES = ['安全帽', '安全带', '防护服', '防护手套', '防护鞋', '其他']
const UNITS = ['个', '双', '套', '件', '副']
const STATUSES: PpeItem['status'][] = ['充足', '不足', '已过期']

function statusBadge(status: PpeItem['status']) {
  const map: Record<string, string> = {
    '充足': 'bg-emerald-50 text-emerald-700',
    '不足': 'bg-amber-50 text-amber-700',
    '已过期': 'bg-red-50 text-red-700',
  }
  return <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${map[status]}`}>{status}</span>
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-'
  return dateStr.slice(0, 10)
}

export default function PpePage() {
  const [items, setItems] = useState<PpeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchText, setSearchText] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<PpeItem | null>(null)

  const [name, setName] = useState('')
  const [category, setCategory] = useState('安全帽')
  const [specification, setSpecification] = useState('')
  const [unit, setUnit] = useState('个')
  const [quantity, setQuantity] = useState('')
  const [issuedQuantity, setIssuedQuantity] = useState('0')
  const [status, setStatus] = useState<PpeItem['status']>('充足')
  const [lastPurchaseDate, setLastPurchaseDate] = useState('')
  const [supplier, setSupplier] = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  const [remark, setRemark] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const loadData = async () => {
    setLoading(true)
    const list = await ppeService.list()
    setItems(list.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)))
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const filteredItems = useMemo(() => {
    if (!searchText.trim()) return items
    const q = searchText.toLowerCase()
    return items.filter(i =>
      i.name.toLowerCase().includes(q) ||
      (i.specification ?? '').toLowerCase().includes(q) ||
      (i.supplier ?? '').toLowerCase().includes(q) ||
      (i.category ?? '').toLowerCase().includes(q)
    )
  }, [items, searchText])

  const resetForm = () => {
    setName('')
    setCategory('安全帽')
    setSpecification('')
    setUnit('个')
    setQuantity('')
    setIssuedQuantity('0')
    setStatus('充足')
    setLastPurchaseDate('')
    setSupplier('')
    setUnitPrice('')
    setRemark('')
  }

  const openAdd = () => {
    resetForm()
    setEditingItem(null)
    setShowForm(true)
  }

  const openEdit = (item: PpeItem) => {
    setName(item.name)
    setCategory(item.category)
    setSpecification(item.specification ?? '')
    setUnit(item.unit)
    setQuantity(String(item.quantity))
    setIssuedQuantity(String(item.issuedQuantity))
    setStatus(item.status)
    setLastPurchaseDate(item.lastPurchaseDate ?? '')
    setSupplier(item.supplier ?? '')
    setUnitPrice(item.unitPrice != null ? String(item.unitPrice) : '')
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
        specification: specification.trim() || undefined,
        unit,
        quantity: Number(quantity) || 0,
        issuedQuantity: Number(issuedQuantity) || 0,
        status,
        lastPurchaseDate: lastPurchaseDate || undefined,
        supplier: supplier.trim() || undefined,
        unitPrice: unitPrice ? Number(unitPrice) : undefined,
        remark: remark.trim() || undefined,
        projectId: getCurrentProjectId(),
      }
      if (editingItem?.id) {
        await ppeService.update(editingItem.id, data)
      } else {
        await ppeService.create(data as Parameters<typeof ppeService.create>[0])
      }
      setShowForm(false)
      loadData()
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (item: PpeItem) => {
    if (!item.id || !confirm(`确定删除"${item.name}"？`)) return
    await ppeService.remove(item.id)
    loadData()
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
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-800">{editingItem ? '编辑劳保用品' : '新增劳保用品'}</h3>
            <button onClick={() => setShowForm(false)} className="p-1 hover:bg-slate-100 rounded"><X className="w-4 h-4 text-slate-400" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1">名称 <span className="text-red-400">*</span></label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="如：安全帽" className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">类别</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">规格型号</label>
              <input value={specification} onChange={e => setSpecification(e.target.value)} placeholder="如：V-Gard" className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">单位</label>
              <select value={unit} onChange={e => setUnit(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500">
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">库存数量</label>
              <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="0" className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">已发放数量</label>
              <input type="number" value={issuedQuantity} onChange={e => setIssuedQuantity(e.target.value)} placeholder="0" className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">状态</label>
              <select value={status} onChange={e => setStatus(e.target.value as PpeItem['status'])} className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500">
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">最近采购日期</label>
              <input type="date" value={lastPurchaseDate} onChange={e => setLastPurchaseDate(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">供应商</label>
              <input value={supplier} onChange={e => setSupplier(e.target.value)} placeholder="供应商名称" className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">单价</label>
              <input type="number" value={unitPrice} onChange={e => setUnitPrice(e.target.value)} placeholder="0.00" className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
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
            placeholder="搜索用品名称、规格、供应商..."
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
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">名称</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">类别</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">规格型号</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-slate-500">库存数量</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-slate-500">已发放</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-slate-500">单价</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">供应商</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">最近采购</th>
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
                      <HardHat className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="text-sm text-slate-400">暂无劳保用品记录</p>
                    <p className="text-xs text-slate-300 mt-1">点击"入库登记"添加第一批劳保用品</p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-3 font-medium text-slate-800">{item.name}</td>
                    <td className="px-6 py-3 text-slate-600">{item.category}</td>
                    <td className="px-6 py-3 text-slate-600">{item.specification || '-'}</td>
                    <td className="px-6 py-3 text-right text-slate-600">{item.quantity}</td>
                    <td className="px-6 py-3 text-right text-slate-600">{item.issuedQuantity}</td>
                    <td className="px-6 py-3 text-right text-slate-600">{item.unitPrice != null ? `¥${item.unitPrice.toFixed(2)}` : '-'}</td>
                    <td className="px-6 py-3 text-slate-600">{item.supplier || '-'}</td>
                    <td className="px-6 py-3 text-slate-600">{formatDate(item.lastPurchaseDate)}</td>
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