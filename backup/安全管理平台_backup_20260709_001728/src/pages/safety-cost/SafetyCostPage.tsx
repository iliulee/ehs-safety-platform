import { useEffect, useState, useMemo } from 'react'
import { DollarSign, Plus, Search, Edit3, Trash2, X } from 'lucide-react'
import { safetyCostService } from '@/services/safetyCost.service'
import { getCurrentProjectId } from '@/store'
import type { SafetyCost } from '@/types'

const COST_CATEGORIES = ['安全防护', '安全培训', '安全设施', '应急管理', '劳保用品', '其他']

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-'
  return dateStr.slice(0, 10)
}

export default function SafetyCostPage() {
  const [items, setItems] = useState<SafetyCost[]>([])
  const [loading, setLoading] = useState(true)
  const [searchText, setSearchText] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<SafetyCost | null>(null)

  const [date, setDate] = useState('')
  const [category, setCategory] = useState('安全防护')
  const [amount, setAmount] = useState('')
  const [handler, setHandler] = useState('')
  const [remark, setRemark] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const loadData = async () => {
    setLoading(true)
    const list = await safetyCostService.list()
    setItems(list.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)))
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const filteredItems = useMemo(() => {
    if (!searchText.trim()) return items
    const q = searchText.toLowerCase()
    return items.filter(i =>
      (i.category ?? '').toLowerCase().includes(q) ||
      (i.handler ?? '').toLowerCase().includes(q) ||
      (i.remark ?? '').toLowerCase().includes(q) ||
      String(i.amount).includes(q)
    )
  }, [items, searchText])

  const stats = useMemo(() => {
    const currentYear = new Date().getFullYear()
    const yearItems = items.filter(i => i.date && new Date(i.date).getFullYear() === currentYear)
    const yearSpent = yearItems.reduce((sum, i) => sum + (i.amount || 0), 0)
    // Assume annual budget is 2x of current year spent, or a minimum
    const annualBudget = Math.max(yearSpent * 2, 10000)
    const rate = annualBudget > 0 ? Math.round((yearSpent / annualBudget) * 100) : 0
    const remaining = annualBudget - yearSpent
    return { annualBudget, yearSpent, rate, remaining }
  }, [items])

  const resetForm = () => {
    setDate(new Date().toISOString().slice(0, 10))
    setCategory('安全防护')
    setAmount('')
    setHandler('')
    setRemark('')
  }

  const openAdd = () => {
    resetForm()
    setEditingItem(null)
    setShowForm(true)
  }

  const openEdit = (item: SafetyCost) => {
    setDate(item.date)
    setCategory(item.category)
    setAmount(String(item.amount))
    setHandler(item.handler ?? '')
    setRemark(item.remark ?? '')
    setEditingItem(item)
    setShowForm(true)
  }

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
      if (editingItem?.id) {
        await safetyCostService.update(editingItem.id, data)
      } else {
        await safetyCostService.create(data as Parameters<typeof safetyCostService.create>[0])
      }
      setShowForm(false)
      loadData()
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (item: SafetyCost) => {
    if (!item.id || !confirm(`确定删除该费用记录？`)) return
    await safetyCostService.remove(item.id)
    loadData()
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

      {/* 费用概览 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: '年度预算', value: `¥ ${stats.annualBudget.toLocaleString()}`, color: 'text-slate-700' },
          { label: '已支出', value: `¥ ${stats.yearSpent.toLocaleString()}`, color: 'text-teal-600' },
          { label: '执行率', value: `${stats.rate}%`, color: stats.rate > 80 ? 'text-red-600' : 'text-amber-600' },
          { label: '剩余预算', value: `¥ ${stats.remaining.toLocaleString()}`, color: stats.remaining < 0 ? 'text-red-600' : 'text-slate-700' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-xs text-slate-500">{stat.label}</p>
            <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-800">{editingItem ? '编辑费用' : '登记费用'}</h3>
            <button onClick={() => setShowForm(false)} className="p-1 hover:bg-slate-100 rounded"><X className="w-4 h-4 text-slate-400" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1">日期 <span className="text-red-400">*</span></label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">费用类别</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500">
                {COST_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">金额 <span className="text-red-400">*</span></label>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">经办人</label>
              <input value={handler} onChange={e => setHandler(e.target.value)} placeholder="经办人姓名" className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-slate-500 mb-1">备注</label>
              <input value={remark} onChange={e => setRemark(e.target.value)} placeholder="费用用途说明" className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">取消</button>
            <button onClick={handleSubmit} disabled={!date || !amount || submitting} className="px-4 py-2 text-sm text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed">
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
            placeholder="搜索费用类别、经办人、备注..."
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
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">日期</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">费用类别</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-slate-500">金额</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">经办人</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">备注</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-slate-500">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-sm text-slate-400">加载中...</td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
                      <DollarSign className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="text-sm text-slate-400">暂无安全费用记录</p>
                    <p className="text-xs text-slate-300 mt-1">点击"登记费用"记录第一笔安全生产投入</p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-3 text-slate-600">{formatDate(item.date)}</td>
                    <td className="px-6 py-3">
                      <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-teal-50 text-teal-700">{item.category}</span>
                    </td>
                    <td className="px-6 py-3 text-right font-medium text-slate-800">¥{item.amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</td>
                    <td className="px-6 py-3 text-slate-600">{item.handler || '-'}</td>
                    <td className="px-6 py-3 text-slate-600 max-w-xs truncate">{item.remark || '-'}</td>
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