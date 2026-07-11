import { useEffect, useState } from 'react'
import { getCurrentProjectId } from '@/store'
import { ppeService } from '@/services/ppe.service'
import type { PpeItem } from '@/types'

const CATEGORIES = ['安全帽', '安全带', '防护服', '防护手套', '防护鞋', '其他']
const UNITS = ['个', '双', '套', '件', '副']
const STATUSES: PpeItem['status'][] = ['充足', '不足', '已过期']

interface Props {
  item: PpeItem | null
  onClose: () => void
  onSaved: () => void
}

export function PpeForm({ item, onClose, onSaved }: Props) {
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

  useEffect(() => {
    if (item) {
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
    } else {
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
  }, [item])

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
      if (item?.id) {
        await ppeService.update(item.id, data)
      } else {
        await ppeService.create(data as Parameters<typeof ppeService.create>[0])
      }
      onSaved()
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!item?.id) return
    await ppeService.remove(item.id)
    onSaved()
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label className="block text-xs text-slate-500 mb-1">名称 <span className="text-red-400">*</span></label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="如：安全帽" className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">类别</label>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500">
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">规格型号</label>
        <input value={specification} onChange={(e) => setSpecification(e.target.value)} placeholder="如：V-Gard" className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">单位</label>
        <select value={unit} onChange={(e) => setUnit(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500">
          {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">库存数量</label>
        <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="0" className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">已发放数量</label>
        <input type="number" value={issuedQuantity} onChange={(e) => setIssuedQuantity(e.target.value)} placeholder="0" className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">状态</label>
        <select value={status} onChange={(e) => setStatus(e.target.value as PpeItem['status'])} className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500">
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">最近采购日期</label>
        <input type="date" value={lastPurchaseDate} onChange={(e) => setLastPurchaseDate(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">供应商</label>
        <input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="供应商名称" className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">单价</label>
        <input type="number" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} placeholder="0.00" className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
      </div>
      <div className="md:col-span-3">
        <label className="block text-xs text-slate-500 mb-1">备注</label>
        <input value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="备注信息" className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
      </div>
      <div className="md:col-span-3 flex justify-end gap-2">
        {item?.id && (
          <button onClick={handleDelete} className="px-4 py-2 text-sm text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50">
            删除
          </button>
        )}
        <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">取消</button>
        <button onClick={handleSubmit} disabled={!name.trim() || submitting} className="px-4 py-2 text-sm text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed">
          {submitting ? '保存中...' : '保存'}
        </button>
      </div>
    </div>
  )
}
