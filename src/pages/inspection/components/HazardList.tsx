import { FileSearch } from 'lucide-react'
import { HazardCard } from './HazardCard'
import { STATUS_TABS, type StatusFilter } from '../hooks/useHazardList'
import type { Hazard } from '@/types'

interface HazardListProps {
  hazards: Hazard[]
  loading: boolean
  statusFilter: StatusFilter
  counts: Record<StatusFilter, number>
  onStatusChange: (status: StatusFilter) => void
  onDetail: (hazard: Hazard) => void
  onRectify: (hazard: Hazard) => void
  onReview: (hazard: Hazard) => void
  onDelete: (hazard: Hazard) => void
}

export function HazardList({
  hazards,
  loading,
  statusFilter,
  counts,
  onStatusChange,
  onDetail,
  onRectify,
  onReview,
  onDelete,
}: HazardListProps) {
  if (loading) {
    return <div className="py-12 text-center text-sm text-gray-400">加载中...</div>
  }

  return (
    <div className="space-y-2.5">
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-0.5 px-0.5 scrollbar-hide">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onStatusChange(tab.key)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              statusFilter === tab.key
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
            {counts[tab.key] > 0 && (
              <span className={`ml-1 ${statusFilter === tab.key ? 'text-white/80' : 'text-gray-400'}`}>
                {counts[tab.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {hazards.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
            <FileSearch className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-700">
            {statusFilter === 'all' ? '暂无隐患记录' : '该状态下暂无隐患'}
          </p>
          <p className="text-xs text-gray-500 mt-1">点击右上角「新增」创建第一条隐患</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {hazards.map((h) => (
            <HazardCard
              key={h.id}
              hazard={h}
              onClick={() => onDetail(h)}
              onRectify={() => onRectify(h)}
              onReview={() => onReview(h)}
              onDelete={() => onDelete(h)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
