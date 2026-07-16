import { useState } from 'react'
import { Wrench, Edit3, Trash2 } from 'lucide-react'
import { equipmentService } from '@/services/equipment.service'
import { Sheet } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import type { Equipment } from '@/types'

interface Props {
  items: Equipment[]
  onEdit: (item: Equipment) => void
}

const statusMap: Record<string, string> = {
  '在用': 'bg-emerald-50 text-emerald-700',
  '停用': 'bg-slate-50 text-slate-600',
  '已退场': 'bg-amber-50 text-amber-700',
  '待检验': 'bg-orange-50 text-orange-700',
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-'
  return dateStr.slice(0, 10)
}

export function EquipmentTable({ items, onEdit }: Props) {
  const [deleting, setDeleting] = useState<Equipment | null>(null)
  const [deletingLoading, setDeletingLoading] = useState(false)

  const handleConfirmDelete = async () => {
    if (!deleting?.id) return
    setDeletingLoading(true)
    try {
      await equipmentService.remove(deleting.id)
      toast.success(`已删除「${deleting.name}」`)
      setDeleting(null)
    } catch (err) {
      toast.error('删除失败：' + (err instanceof Error ? err.message : '未知错误'))
    } finally {
      setDeletingLoading(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 py-16 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
          <Wrench className="w-8 h-8 text-slate-300" />
        </div>
        <p className="text-sm text-slate-400">暂无机械设备记录</p>
        <p className="text-xs text-slate-300 mt-1">点击"登记设备"添加第一台机械设备</p>
      </div>
    )
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">设备名称</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">类别</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">型号</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">出厂编号</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">所属单位</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">进场日期</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">下次检验</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">状态</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-slate-500">操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-3 font-medium text-slate-800">{item.name}</td>
                  <td className="px-6 py-3 text-slate-600">{item.category}</td>
                  <td className="px-6 py-3 text-slate-600">{item.model || '-'}</td>
                  <td className="px-6 py-3 text-slate-600 font-mono text-xs">{item.serialNumber || '-'}</td>
                  <td className="px-6 py-3 text-slate-600">{item.ownerUnit || '-'}</td>
                  <td className="px-6 py-3 text-slate-600">{formatDate(item.entryDate)}</td>
                  <td className="px-6 py-3 text-slate-600">{formatDate(item.nextInspectionDate)}</td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${statusMap[item.status]}`}>{item.status}</span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => onEdit(item)} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-teal-600" title="修改"><Edit3 className="w-4 h-4" /></button>
                      <button onClick={() => setDeleting(item)} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-red-600" title="删除"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Sheet
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="确认删除设备"
        footer={
          <>
            <Button variant="outline" className="flex-1" onClick={() => setDeleting(null)} disabled={deletingLoading}>取消</Button>
            <Button variant="destructive" className="flex-1" onClick={handleConfirmDelete} disabled={deletingLoading}>
              {deletingLoading ? '删除中...' : '确认删除'}
            </Button>
          </>
        }
      >
        {deleting && (
          <div className="space-y-2">
            <p className="text-sm text-slate-700">
              确定删除设备「<span className="font-semibold">{deleting.name}</span>」？
            </p>
            <p className="text-xs text-red-500">此操作不可撤销，删除后无法恢复。</p>
            {deleting.model && <p className="text-xs text-slate-500">型号：{deleting.model}</p>}
            {deleting.serialNumber && <p className="text-xs text-slate-500">出厂编号：{deleting.serialNumber}</p>}
          </div>
        )}
      </Sheet>
    </>
  )
}