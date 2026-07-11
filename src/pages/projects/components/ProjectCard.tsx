import { Building2, MapPin, Calendar, User as UserIcon, Phone, CheckCircle2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Project } from '@/types'

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: '待开工', color: 'bg-gray-100 text-gray-600' },
  active: { label: '施工中', color: 'bg-emerald-50 text-emerald-700' },
  paused: { label: '已停工', color: 'bg-amber-50 text-amber-700' },
  completed: { label: '已竣工', color: 'bg-blue-50 text-blue-700' },
}

interface ProjectCardProps {
  project: Project
  isCurrent: boolean
  onClick: () => void
  onSwitch: () => void
}

export function ProjectCard({ project, isCurrent, onClick, onSwitch }: ProjectCardProps) {
  const status = STATUS_MAP[project.status]

  return (
    <Card
      className={`cursor-pointer transition-colors hover:border-gray-300 active:bg-gray-50 ${isCurrent ? 'ring-2 ring-primary ring-offset-1' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-start gap-2.5 flex-1 min-w-0">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isCurrent ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'}`}>
              <Building2 className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <p className="text-sm font-medium text-gray-900 truncate">{project.name}</p>
                {isCurrent && <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
              </div>
              {project.code && <p className="text-[11px] text-gray-400">{project.code}</p>}
            </div>
          </div>
          <Badge className={`${status.color} border-0 text-[10px] px-1.5 py-0 h-4 font-normal flex-shrink-0`}>{status.label}</Badge>
        </div>

        <div className="space-y-1 text-xs text-gray-500">
          {project.location && (
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{project.location}</span>
            </div>
          )}
          {project.startDate && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3 flex-shrink-0" />
              <span>{project.startDate}{project.endDate ? ` ~ ${project.endDate}` : ' 开工'}</span>
            </div>
          )}
          {project.contractor && (
            <div className="flex items-center gap-1">
              <UserIcon className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">施工：{project.contractor}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
          <span className="text-[11px] text-gray-400 flex items-center gap-1">
            {project.safetyOfficer && (
              <>
                <Phone className="w-3 h-3" />
                {project.safetyOfficer}
              </>
            )}
          </span>
          {!isCurrent ? (
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-[10px] px-2"
              onClick={(e) => { e.stopPropagation(); onSwitch() }}
            >
              切换到此项目
            </Button>
          ) : (
            <span className="text-[10px] text-primary font-medium">当前项目</span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}