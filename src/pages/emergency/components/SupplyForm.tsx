import { useEffect, useState } from 'react'
import { getCurrentProjectId } from '@/store'
import { emergencySupplyService } from '@/services/emergency.service'
import type { EmergencySupply } from '@/types'

const CATEGORIES = ['消防器材', '急救药品', '防护装备', '照明设备', '通讯设备', '其他']
const STATUSES: EmergencySupply['status'][] = ['正常', '即将过期', '已过期', '短缺']

interface Props {
  item: EmergencySupply | null
  onClose: () => void
  onSaved: () => void
}

export function SupplyForm({ item, onClose, onSaved }: Props) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState('消防器材')
  const [specification, setSpecification] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('个')
  const [location, setLocation] = useState('')
  const [lastCheck, setLastCheck] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [status, setStatus] = useState<EmergencySupply['status']>('正常')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (item) {
      setName(item.name)
      setCategory(item.category)
      setSpecification(item.specification ?? '')
      setQuantity(String(item.quantity))
      setUnit(item.unit)
      setLocation(item.storageLocation ?? '')
      setLastCheck(item.lastCheckDate ?? '')
      setExpiryDate(item.expiryDate ?? '')
      setStatus(item.status)
    } else {
      setName('')
      setCategory('消防器材')
      setSpecification('')
      setQuantity('')
      setUnit('个')
      setLocation('')
      setLastCheck('')
      setExpiryDate('')
      setStatus('正常')
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
        quantity: Number(quantity) || 0,
        unit,
        storageLocation: location.trim() || undefined,
        lastCheckDate: lastCheck || undefined,
        expiryDate: expiryDate || undefined,
        status,
        projectId: getCurrentProjectId(),
      }
      if (item?.id) {
        await emergencySupplyService.update(item.id, data)
      } else {
        await emergencySupplyService.create(data as Parameters<typeof emergencySupplyService.create>[0])
      }
      onSaved()
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!item?.id) return
    await emergencySupplyService.remove(item.id)
    onSaved()
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label className="block text-xs text-slate-500 mb-1">物资名称 <span className="text-red-400">*</span></label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="如：干粉灭火器" className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">类别</label>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500">
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">规格</label>
        <input value={specification} onChange={(e) => setSpecification(e.target.value)} placeholder="如：4kg" className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">数量</label>
        <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="0" className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">单位</label>
        <select value={unit} onChange={(e) => setUnit(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500">
          {['个', '箱', '套', '件', '瓶', '台'].map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">状态</label>
        <select value={status} onChange={(e) => setStatus(e.target.value as EmergencySupply['status'])} className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500">
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">存放地点</label>
        <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="如：仓库A区" className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">最近检查日期</label>
        <input type="date" value={lastCheck} onChange={(e) => setLastCheck(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">有效期</label>
        <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
      </div>
      <div className="md:col-span-3 flex justify-end gap-2">
        {item?.id && (
          <button onClick={handleDelete} className="px-4 py-2 text-sm text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50">
            删除
          </button>
        )}
        <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">取消</button>
        <button onClick={handleSubmit} disabled={submitting} className="px-4 py-2 text-sm text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed">
          {submitting ? '保存中...' : '保存'}
        </button>
      </div>
    </div>
  )
}
