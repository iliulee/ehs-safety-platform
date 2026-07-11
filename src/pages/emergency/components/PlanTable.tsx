import { Edit3, Trash2 } from 'lucide-react'
import { emergencyPlanService } from '@/services/emergency.service'
import type { EmergencyPlan } from '@/types'

interface Props {
  items: EmergencyPlan[]
  onEdit: (item: EmergencyPlan) => void
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-'
  return dateStr.slice(0, 10)
}

export function PlanTable({ items, onEdit }: Props) {
  if (items.length === 0) {
    return (
      <div className="px-6 py-16 text-center">
        <p className="text-sm text-slate-400">暂无应急预案</p>
        <p className="text-xs text-slate-300 mt-1">点击"新建预案"添加</p>
      </div>
    )
  }

  return (
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
        {items.map((p) => (
          <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
            <td className="px-6 py-3 font-medium text-slate-800">{p.name}</td>
            <td className="px-6 py-3 text-slate-600">{p.category}</td>
            <td className="px-6 py-3 text-slate-600">{p.version || '-'}</td>
            <td className="px-6 py-3 text-slate-600">{formatDate(p.issueDate)}</td>
            <td className="px-6 py-3 text-slate-600">{p.applicableScope || '-'}</td>
            <td className="px-6 py-3 text-right">
              <div className="flex items-center justify-end gap-1">
                <button onClick={() => onEdit(p)} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-teal-600"><Edit3 className="w-4 h-4" /></button>
                <button onClick={async () => { if (p.id && confirm(`确定删除"${p.name}"？`)) await emergencyPlanService.remove(p.id) }} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
