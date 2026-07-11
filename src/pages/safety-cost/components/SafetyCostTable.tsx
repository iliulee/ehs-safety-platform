import { DollarSign, Edit3, Trash2 } from 'lucide-react'
import type { SafetyCost } from '@/types'

interface Props {
  items: SafetyCost[]
  onEdit: (item: SafetyCost) => void
  onDelete: (item: SafetyCost) => void
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-'
  return dateStr.slice(0, 10)
}

export function SafetyCostTable({ items, onEdit, onDelete }: Props) {
  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 py-16 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
          <DollarSign className="w-8 h-8 text-slate-300" />
        </div>
        <p className="text-sm text-slate-400">暂无安全费用记录</p>
        <p className="text-xs text-slate-300 mt-1">点击"登记费用"记录第一笔安全生产投入</p>
      </div>
    )
  }

  return (
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
            {items.map((item) => (
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
                    <button onClick={() => onEdit(item)} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-teal-600"><Edit3 className="w-4 h-4" /></button>
                    <button onClick={() => onDelete(item)} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
