import { Users, UserCheck, UserX, Briefcase } from 'lucide-react'
import { WorkerCard } from './WorkerCard'
import { STATUS_TABS, type StatusFilter } from '../hooks/useWorkerList'
import type { Worker } from '@/types'

interface WorkerListProps {
  workers: Worker[]
  loading: boolean
  statusFilter: StatusFilter
  counts: Record<StatusFilter, number>
  subcontractorMap: Map<string, string>
  workTypeMap: Map<string, string>
  onStatusChange: (status: StatusFilter) => void
  onDetail: (worker: Worker) => void
  onEdit: (worker: Worker) => void
  onLeave: (worker: Worker) => void
  onReactivate: (worker: Worker) => void
  onDelete: (worker: Worker) => void
}

export function WorkerList({
  workers,
  loading,
  statusFilter,
  counts,
  subcontractorMap,
  workTypeMap,
  onStatusChange,
  onDetail,
  onEdit,
  onLeave,
  onReactivate,
  onDelete,
}: WorkerListProps) {
  if (loading) {
    return <div className="py-12 text-center text-sm text-gray-400">加载中...</div>
  }

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-4 gap-2">
        <StatCard icon={Users} label="总登记" value={counts.all} unit="人" color="bg-slate-50 text-slate-700 border-slate-100" />
        <StatCard icon={UserCheck} label="在岗" value={counts.active} unit="人" color="bg-emerald-50 text-emerald-700 border-emerald-100" />
        <StatCard icon={UserX} label="离场" value={counts.left} unit="人" color="bg-gray-100 text-gray-700 border-gray-200" />
        <StatCard icon={Briefcase} label="停工" value={counts.suspended} unit="人" color="bg-amber-50 text-amber-700 border-amber-100" />
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-0.5 px-0.5 scrollbar-hide">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onStatusChange(tab.key)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              statusFilter === tab.key ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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

      {workers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
            <Users className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-700">
            {statusFilter === 'all' ? '暂无人员记录' : '该状态下暂无人员'}
          </p>
          <p className="text-xs text-gray-500 mt-1">点击右上角「新增」添加第一条人员记录</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {workers.map((w) => (
            <WorkerCard
              key={w.id}
              worker={w}
              workTypeLabel={w.workType ? (workTypeMap.get(w.workType) ?? w.workType) : ''}
              subcontractorName={w.subcontractorId ? (subcontractorMap.get(w.subcontractorId) ?? '-') : ''}
              onClick={() => onDetail(w)}
              onEdit={() => onEdit(w)}
              onLeave={() => onLeave(w)}
              onReactivate={() => onReactivate(w)}
              onDelete={() => onDelete(w)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  unit,
  color,
}: {
  icon: React.ElementType
  label: string
  value: number
  unit: string
  color: string
}) {
  return (
    <div className={`rounded-xl border p-2.5 flex flex-col justify-between ${color}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-medium opacity-80 truncate">{label}</span>
        <Icon className="w-3.5 h-3.5 opacity-60" />
      </div>
      <div className="flex items-baseline gap-0.5">
        <span className="text-xl font-bold tracking-tight">{value}</span>
        <span className="text-[10px] font-medium opacity-70">{unit}</span>
      </div>
    </div>
  )
}