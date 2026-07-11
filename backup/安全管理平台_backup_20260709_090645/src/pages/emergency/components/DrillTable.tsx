import { Edit3, Trash2 } from 'lucide-react'
import { emergencyDrillService } from '@/services/emergency.service'
import type { EmergencyDrill } from '@/types'

interface Props {
  items: EmergencyDrill[]
  onEdit: (item: EmergencyDrill) => void
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-'
  return dateStr.slice(0, 10)
}

export function DrillTable({ items, onEdit }: Props) {
  if (items.length === 0) {
    return (
      <div className="px-6 py-16 text-center">
        <p className="text-sm text-slate-400">暂无演练记录</p>
        <p className="text-xs text-slate-300 mt-1">点击"登记演练"添加</p>
      </div>
    )
  }

  return (
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
        {items.map((d) => (
          <tr key={d.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
            <td className="px-6 py-3 font-medium text-slate-800">{d.title}</td>
            <td className="px-6 py-3 text-slate-600">{d.drillType}</td>
            <td className="px-6 py-3 text-slate-600">{formatDate(d.date)}</td>
            <td className="px-6 py-3 text-slate-600">{d.location || '-'}</td>
            <td className="px-6 py-3 text-slate-600">{d.organizer || '-'}</td>
            <td className="px-6 py-3 text-right text-slate-600">{d.participantCount ?? '-'}</td>
            <td className="px-6 py-3 text-right">
              <div className="flex items-center justify-end gap-1">
                <button onClick={() => onEdit(d)} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-teal-600"><Edit3 className="w-4 h-4" /></button>
                <button onClick={async () => { if (d.id && confirm(`确定删除"${d.title}"？`)) await emergencyDrillService.remove(d.id) }} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
