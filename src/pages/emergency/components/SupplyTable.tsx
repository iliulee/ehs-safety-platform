import { Edit3, Trash2 } from 'lucide-react'
import { emergencySupplyService } from '@/services/emergency.service'
import type { EmergencySupply } from '@/types'

interface Props {
  items: EmergencySupply[]
  onEdit: (item: EmergencySupply) => void
}

const statusMap: Record<string, string> = {
  '正常': 'bg-emerald-50 text-emerald-700',
  '即将过期': 'bg-amber-50 text-amber-700',
  '已过期': 'bg-red-50 text-red-700',
  '短缺': 'bg-orange-50 text-orange-700',
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-'
  return dateStr.slice(0, 10)
}

export function SupplyTable({ items, onEdit }: Props) {
  if (items.length === 0) {
    return (
      <div className="px-6 py-16 text-center">
        <p className="text-sm text-slate-400">暂无应急物资</p>
        <p className="text-xs text-slate-300 mt-1">点击"登记物资"添加</p>
      </div>
    )
  }

  return (
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
        {items.map((s) => (
          <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
            <td className="px-6 py-3 font-medium text-slate-800">{s.name}</td>
            <td className="px-6 py-3 text-slate-600">{s.category}</td>
            <td className="px-6 py-3 text-slate-600">{s.specification || '-'}</td>
            <td className="px-6 py-3 text-right text-slate-600">{s.quantity} {s.unit}</td>
            <td className="px-6 py-3 text-slate-600">{s.storageLocation || '-'}</td>
            <td className="px-6 py-3 text-slate-600">{formatDate(s.expiryDate)}</td>
            <td className="px-6 py-3">
              <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${statusMap[s.status]}`}>{s.status}</span>
            </td>
            <td className="px-6 py-3 text-right">
              <div className="flex items-center justify-end gap-1">
                <button onClick={() => onEdit(s)} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-teal-600"><Edit3 className="w-4 h-4" /></button>
                <button onClick={async () => { if (s.id && confirm(`确定删除"${s.name}"？`)) await emergencySupplyService.remove(s.id) }} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
