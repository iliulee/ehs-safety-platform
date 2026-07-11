import { Calendar, CheckCircle2, ChevronRight, Clock, MapPin, Trash2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { effectiveStatus } from '../hooks/useHazardList'
import type { Hazard } from '@/types'

const LEVEL_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  general: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: '一般隐患' },
  major: { bg: 'bg-amber-50', text: 'text-amber-700', label: '较大隐患' },
  serious: { bg: 'bg-red-50', text: 'text-red-700', label: '重大隐患' },
}

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-red-50', text: 'text-red-700', label: '待整改' },
  rectifying: { bg: 'bg-amber-50', text: 'text-amber-700', label: '整改中' },
  reviewing: { bg: 'bg-blue-50', text: 'text-blue-700', label: '复查中' },
  closed: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: '已闭环' },
  overdue: { bg: 'bg-red-100', text: 'text-red-800', label: '已逾期' },
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-'
  return dateStr.slice(0, 10)
}

interface HazardCardProps {
  hazard: Hazard
  onClick: () => void
  onRectify: () => void
  onReview: () => void
  onDelete: () => void
}

export function HazardCard({ hazard, onClick, onRectify, onReview, onDelete }: HazardCardProps) {
  const status = effectiveStatus(hazard)
  const statusStyle = STATUS_COLORS[status]
  const levelStyle = LEVEL_COLORS[hazard.level] ?? LEVEL_COLORS.general

  const handleAction = (e: React.MouseEvent, cb: () => void) => {
    e.stopPropagation()
    cb()
  }

  const renderAction = () => {
    if (status === 'pending' || status === 'overdue') {
      return (
        <button
          onClick={(e) => handleAction(e, onRectify)}
          className="h-7 px-2 rounded-md bg-amber-50 flex items-center gap-1 text-amber-700 hover:bg-amber-100 text-[10px] font-medium transition-colors"
        >
          <Clock className="w-3 h-3" /> 整改
        </button>
      )
    }
    if (status === 'rectifying') {
      return (
        <button
          onClick={(e) => handleAction(e, onReview)}
          className="h-7 px-2 rounded-md bg-blue-50 flex items-center gap-1 text-blue-700 hover:bg-blue-100 text-[10px] font-medium transition-colors"
        >
          <CheckCircle2 className="w-3 h-3" /> 复查
        </button>
      )
    }
    if (status === 'closed') {
      return (
        <button
          onClick={(e) => handleAction(e, onDelete)}
          className="h-7 px-2 rounded-md bg-red-50 flex items-center gap-1 text-red-700 hover:bg-red-100 text-[10px] font-medium transition-colors"
        >
          <Trash2 className="w-3 h-3" /> 删除
        </button>
      )
    }
    return null
  }

  return (
    <Card className="cursor-pointer transition-colors hover:border-gray-300 active:bg-gray-50" onClick={onClick}>
      <CardContent className="p-3">
        <div className="flex items-start gap-2.5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <p className="text-sm font-medium text-gray-900 truncate flex-1">{hazard.title}</p>
              <Badge className={`${levelStyle.bg} ${levelStyle.text} border-0 text-[10px] flex-shrink-0`}>
                {levelStyle.label}
              </Badge>
            </div>
            {hazard.location && (
              <div className="flex items-center gap-1 text-xs text-gray-500 mb-1.5">
                <MapPin className="w-3 h-3" />
                <span className="truncate">{hazard.location}</span>
              </div>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={`${statusStyle.bg} ${statusStyle.text} border-0 text-[10px]`}>
                {statusStyle.label}
              </Badge>
              {hazard.rectifyDeadline && (
                <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
                  <Calendar className="w-3 h-3" />
                  {formatDate(hazard.rectifyDeadline)}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {renderAction()}
            <ChevronRight className="w-4 h-4 text-gray-300" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
