import { AlertOctagon, Edit3, Trash2 } from 'lucide-react'
import { accidentService } from '@/services/accident.service'
import type { AccidentRecord } from '@/types'

interface Props {
  items: AccidentRecord[]
  onEdit: (item: AccidentRecord) => void
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-'
  return dateStr.slice(0, 10)
}

const severityMap: Record<string, string> = {
  '轻伤': 'bg-amber-50 text-amber-700',
  '重伤': 'bg-orange-50 text-orange-700',
  '死亡': 'bg-red-50 text-red-700',
  '未遂': 'bg-slate-100 text-slate-500',
}

const statusMap: Record<string, string> = {
  '调查中': 'bg-amber-50 text-amber-700',
  '已结案': 'bg-emerald-50 text-emerald-700',
  '已上报': 'bg-blue-50 text-blue-700',
}

export function AccidentTable({ items, onEdit }: Props) {
  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 py-16 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
          <AlertOctagon className="w-8 h-8 text-slate-300" />
        </div>
        <p className="text-sm text-slate-400">暂无事故记录</p>
        <p className="text-xs text-slate-300 mt-1">安全第一，预防为主</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">事故标题</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">事故类型</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">发生日期</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">受害人</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">严重程度</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">状态</th>
              <th className="text-right px-6 py-3 text-xs font-medium text-slate-500">操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-3 font-medium text-slate-800">{item.title}</td>
                <td className="px-6 py-3 text-slate-600">{item.accidentType}</td>
                <td className="px-6 py-3 text-slate-600">{formatDate(item.occurrenceDate)}</td>
                <td className="px-6 py-3 text-slate-600">{item.victimName || '-'}</td>
                <td className="px-6 py-3"><span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${severityMap[item.severity]}`}>{item.severity}</span></td>
                <td className="px-6 py-3"><span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${statusMap[item.status]}`}>{item.status}</span></td>
                <td className="px-6 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => onEdit(item)} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-teal-600"><Edit3 className="w-4 h-4" /></button>
                    <button onClick={async () => { if (item.id && confirm(`确定删除"${item.title}"？`)) await accidentService.remove(item.id) }} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
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