import { ChevronRight, CreditCard, Phone, User as UserIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Worker } from '@/types'

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  active: { label: '在岗', color: 'bg-emerald-50 text-emerald-700' },
  left: { label: '离场', color: 'bg-gray-100 text-gray-600' },
  suspended: { label: '停工', color: 'bg-amber-50 text-amber-700' },
}

function maskIdCard(id?: string): string {
  if (!id) return '-'
  if (id.length <= 8) return id
  return id.slice(0, 4) + '********' + id.slice(-4)
}

interface WorkerCardProps {
  worker: Worker
  workTypeLabel: string
  subcontractorName: string
  onClick: () => void
  onLeave: () => void
  onDelete: () => void
}

export function WorkerCard({
  worker,
  workTypeLabel,
  subcontractorName,
  onClick,
  onLeave,
  onDelete,
}: WorkerCardProps) {
  const st = STATUS_MAP[worker.status] ?? STATUS_MAP.active

  const handleAction = (e: React.MouseEvent, cb: () => void) => {
    e.stopPropagation()
    cb()
  }

  return (
    <Card className="cursor-pointer transition-colors hover:border-gray-300 active:bg-gray-50" onClick={onClick}>
      <CardContent className="p-3">
        <div className="flex items-start gap-2.5">
          <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
            <UserIcon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <p className="text-sm font-medium text-gray-900 truncate">{worker.name}</p>
              <Badge className={`${st.color} border-0 text-[10px] px-1.5 py-0 h-4 font-normal`}>{st.label}</Badge>
            </div>
            <div className="space-y-0.5">
              {workTypeLabel && <p className="text-xs text-gray-500">{workTypeLabel}</p>}
              {subcontractorName && <p className="text-xs text-gray-500">{subcontractorName}</p>}
              {worker.idCard && (
                <p className="text-[11px] text-gray-400 flex items-center gap-1">
                  <CreditCard className="w-3 h-3" />
                  {maskIdCard(worker.idCard)}
                </p>
              )}
              {worker.phone && (
                <p className="text-[11px] text-gray-400 flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {worker.phone}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {worker.status === 'active' && (
              <button
                onClick={(e) => handleAction(e, onLeave)}
                className="h-7 px-2 rounded-md bg-amber-50 flex items-center gap-1 text-amber-700 hover:bg-amber-100 text-[10px] font-medium transition-colors"
              >
                离场
              </button>
            )}
            {worker.status === 'left' && (
              <button
                onClick={(e) => handleAction(e, onDelete)}
                className="h-7 px-2 rounded-md bg-red-50 flex items-center gap-1 text-red-700 hover:bg-red-100 text-[10px] font-medium transition-colors"
              >
                删除
              </button>
            )}
            <ChevronRight className="w-4 h-4 text-gray-300" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
