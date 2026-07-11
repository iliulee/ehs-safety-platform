import { Clock, CheckCircle2, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet } from '@/components/ui/sheet'
import { hazardService } from '@/services/hazardService'
import { getDictLabel } from '@/store'
import { effectiveStatus, isOverdue } from '../hooks/useHazardList'
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

interface HazardDetailSheetProps {
  hazard: Hazard
  onClose: () => void
  onRectify: () => void
  onReview: () => void
  onDeleted: () => void
}

export function HazardDetailSheet({ hazard, onClose, onRectify, onReview, onDeleted }: HazardDetailSheetProps) {
  const status = effectiveStatus(hazard)
  const statusStyle = STATUS_COLORS[status]
  const levelStyle = LEVEL_COLORS[hazard.level] ?? LEVEL_COLORS.general

  const handleDelete = async () => {
    if (!confirm('确定删除该隐患记录？')) return
    if (hazard.id) await hazardService.remove(hazard.id)
    onDeleted()
  }

  return (
    <Sheet
      open={true}
      onClose={onClose}
      title="隐患详情"
      footer={
        <>
          {(hazard.status === 'pending' || isOverdue(hazard)) && (
            <Button className="flex-1 bg-amber-600 hover:bg-amber-700" onClick={onRectify}>
              <Clock className="w-4 h-4 mr-1" /> 整改
            </Button>
          )}
          {hazard.status === 'rectifying' && (
            <Button className="flex-1" onClick={onReview}>
              <CheckCircle2 className="w-4 h-4 mr-1" /> 复查
            </Button>
          )}
          {hazard.status === 'closed' && (
            <Button variant="outline" className="flex-1" onClick={handleDelete}>
              删除
            </Button>
          )}
          <Button variant="outline" className="flex-1" onClick={onClose}>
            关闭
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge className={`${levelStyle.bg} ${levelStyle.text} border-0`}>{levelStyle.label}</Badge>
          <Badge className={`${statusStyle.bg} ${statusStyle.text} border-0`}>{statusStyle.label}</Badge>
        </div>
        <div>
          <h4 className="text-base font-semibold text-gray-900 mb-1">{hazard.title}</h4>
          {hazard.location && (
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {hazard.location}
            </p>
          )}
        </div>

        {hazard.description && (
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">隐患描述</p>
            <p className="text-sm text-gray-800">{hazard.description}</p>
          </div>
        )}

        {hazard.category && <InfoRow label="隐患分类" value={getDictLabel('hazard_category', hazard.category)} />}
        {hazard.rectifyDeadline && <InfoRow label="整改期限" value={formatDate(hazard.rectifyDeadline)} />}
        {hazard.rectifyPersonId && <InfoRow label="整改责任人" value={hazard.rectifyPersonId} />}

        {hazard.rectifyMeasure && (
          <div className="bg-amber-50 rounded-lg p-3">
            <p className="text-xs text-amber-700 mb-1 font-medium">整改措施（{formatDate(hazard.rectifyDate)}）</p>
            <p className="text-sm text-gray-800">{hazard.rectifyMeasure}</p>
          </div>
        )}

        {hazard.reviewComment && (
          <div className="bg-emerald-50 rounded-lg p-3">
            <p className="text-xs text-emerald-700 mb-1 font-medium">复查意见（{formatDate(hazard.reviewDate)}）</p>
            <p className="text-sm text-gray-800">{hazard.reviewComment}</p>
          </div>
        )}

        <p className="text-xs text-gray-400">记录时间：{formatDate(new Date(hazard.createdAt ?? Date.now()).toISOString())}</p>
      </div>
    </Sheet>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500 text-xs">{label}</span>
      <span className="text-gray-900">{value}</span>
    </div>
  )
}
