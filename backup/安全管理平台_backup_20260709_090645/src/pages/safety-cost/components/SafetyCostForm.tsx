import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { getCurrentProjectId } from '@/store'
import { safetyCostService } from '@/services/safetyCost.service'
import type { SafetyCost } from '@/types'

const COST_CATEGORIES = ['安全防护', '安全培训', '安全设施', '应急管理', '劳保用品', '其他']

interface Props {
  item: SafetyCost | null
  onClose: () => void
  onSaved: () => void
}

export function SafetyCostForm({ item, onClose, onSaved }: Props) {
  const [date, setDate] = useState('')
  const [category, setCategory] = useState('安全防护')
  const [amount, setAmount] = useState('')
  const [handler, setHandler] = useState('')
  const [remark, setRemark] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (item) {
      setDate(item.date)
      setCategory(item.category)
      setAmount(String(item.amount))
      setHandler(item.handler ?? '')
      setRemark(item.remark ?? '')
    } else {
      setDate(new Date().toISOString().slice(0, 10))
      setCategory('安全防护')
      setAmount('')
      setHandler('')
      setRemark('')
    }
  }, [item])

  const handleSubmit = async () => {
    if (!date || !amount) return
    setSubmitting(true)
    try {
      const data = {
        date,
        category,
        amount: Number(amount) || 0,
        handler: handler.trim() || undefined,
        remark: remark.trim() || undefined,
        projectId: getCurrentProjectId(),
      }
      if (item?.id) {
        await safetyCostService.update(item.id, data)
      } else {
        await safetyCostService.create(data as Parameters<typeof safetyCostService.create>[0])
      }
      onSaved()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-800">{item ? '编辑费用' : '登记费用'}</h3>
        <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded"><X className="w-4 h-4 text-slate-400" /></button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs text-slate-500 mb-1">日期 <span className="text-red-400">*</span></label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">费用类别</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500">
            {COST_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">金额 <span className="text-red-400">*</span></label>
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">经办人</label>
          <input value={handler} onChange={(e) => setHandler(e.target.value)} placeholder="经办人姓名" className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs text-slate-500 mb-1">备注</label>
          <input value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="费用用途说明" className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">取消</button>
        <button onClick={handleSubmit} disabled={!date || !amount || submitting} className="px-4 py-2 text-sm text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed">
          {submitting ? '保存中...' : '保存'}
        </button>
      </div>
    </div>
  )
}
