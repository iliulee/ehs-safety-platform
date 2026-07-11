import { Building2, Activity, PauseCircle, CheckCircle } from 'lucide-react'
import { ProjectCard } from './ProjectCard'
import type { Project } from '@/types'

interface ProjectListProps {
  projects: Project[]
  loading: boolean
  currentProjectId: string | null
  counts: { all: number; active: number; pending: number; paused: number; completed: number }
  onDetail: (project: Project) => void
  onSwitch: (project: Project) => void
}

export function ProjectList({
  projects,
  loading,
  currentProjectId,
  counts,
  onDetail,
  onSwitch,
}: ProjectListProps) {
  if (loading) {
    return <div className="py-12 text-center text-sm text-gray-400">加载中...</div>
  }

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
          <Building2 className="w-5 h-5 text-gray-400" />
        </div>
        <p className="text-sm font-medium text-gray-700">暂无项目</p>
        <p className="text-xs text-gray-500 mt-1">点击右上角「新建」创建第一个项目</p>
      </div>
    )
  }

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-4 gap-2">
        <StatCard icon={Building2} label="项目总数" value={counts.all} unit="个" color="bg-slate-50 text-slate-700 border-slate-100" />
        <StatCard icon={Activity} label="施工中" value={counts.active} unit="个" color="bg-emerald-50 text-emerald-700 border-emerald-100" />
        <StatCard icon={PauseCircle} label="已停工" value={counts.paused} unit="个" color="bg-amber-50 text-amber-700 border-amber-100" />
        <StatCard icon={CheckCircle} label="已竣工" value={counts.completed} unit="个" color="bg-blue-50 text-blue-700 border-blue-100" />
      </div>

      <div className="space-y-2.5">
        {projects.map((p) => (
          <ProjectCard
            key={p.id}
            project={p}
            isCurrent={p.id === currentProjectId}
            onClick={() => onDetail(p)}
            onSwitch={() => onSwitch(p)}
          />
        ))}
      </div>
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