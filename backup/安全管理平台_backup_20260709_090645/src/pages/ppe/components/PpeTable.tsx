import { HardHat, Edit3, Trash2 } from 'lucide-react'
import { ppeService } from '@/services/ppe.service'
import type { PpeItem } from '@/types'

interface Props {
  items: PpeItem[]
  onEdit: (item: PpeItem) => void
}

const statusMap: Record<string, string> = {
  '充足': 'bg-emerald-50 text-emerald-700',
  '不足': 'bg-amber-50 text-amber-700',
  '已过期': 'bg-red-50 text-red-700',
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-'
  return dateStr.slice(0, 10)
}

export function PpeTable({ items, onEdit }: Props) {
  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 py-16 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
          <HardHat className="w-8 h-8 text-slate-300" />
        </div>
        <p className="text-sm text-slate-400">暂无劳保用品记录</p>
        <p className="text-xs text-slate-300 mt-1">点击"入库登记"添加第一批劳保用品</p>
      </div>
    )
  }

  return (
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
            {items.map((item) => (
              <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-3 font-medium text-slate-800">{item.name}</td>
                <td className="px-6 py-3 text-slate-600">{item.category}</td>
                <td className="px-6 py-3 text-slate-600">{item.specification || '-'}</td>
                <td className="px-6 py-3 text-right text-slate-600">{item.quantity}</td>
                <td className="px-6 py-3 text-right text-slate-600">{item.issuedQuantity}</td>
                <td className="px-6 py-3 text-right text-slate-600">{item.unitPrice != null ? `¥${item.unitPrice.toFixed(2)}` : '-'}</td>
                <td className="px-6 py-3 text-slate-600">{item.supplier || '-'}</td>
                <td className="px-6 py-3 text-slate-600">{formatDate(item.lastPurchaseDate)}</td>
                <td className="px-6 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${statusMap[item.status]}`}>{item.status}</span>
                </td>
                <td className="px-6 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => onEdit(item)} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-teal-600"><Edit3 className="w-4 h-4" /></button>
                    <button onClick={async () => { if (item.id && confirm(`确定删除"${item.name}"？`)) await ppeService.remove(item.id) }} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
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
