import { useState } from 'react'
import { Building2, MapPin, Calendar, User as UserIcon, Phone, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet } from '@/components/ui/sheet'
import { projectService } from '@/services/projectService'
import { ProjectFormSheet } from './ProjectFormSheet'
import type { Project } from '@/types'

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: '待开工', color: 'bg-gray-100 text-gray-600' },
  active: { label: '施工中', color: 'bg-emerald-50 text-emerald-700' },
  paused: { label: '已停工', color: 'bg-amber-50 text-amber-700' },
  completed: { label: '已竣工', color: 'bg-blue-50 text-blue-700' },
}

interface ProjectDetailSheetProps {
  project: Project
  isCurrent: boolean
  onClose: () => void
  onUpdated: () => void
  onSwitch: () => void
}

export function ProjectDetailSheet({ project, isCurrent, onClose, onUpdated, onSwitch }: ProjectDetailSheetProps) {
  const [editOpen, setEditOpen] = useState(false)
  const status = STATUS_MAP[project.status]

  const handleDelete = async () => {
    if (!project.id || !confirm('确定删除该项目？删除后该项目下所有数据将无法恢复。')) return
    await projectService.remove(project.id)
    onUpdated()
  }

  return (
    <>
      <Sheet
        open={true}
        onClose={onClose}
        title="项目详情"
        footer={
          <>
            <Button variant="outline" className="flex-1" onClick={handleDelete}>
              删除
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => setEditOpen(true)}>
              编辑
            </Button>
            {!isCurrent ? (
              <Button className="flex-1" onClick={onSwitch}>切换项目</Button>
            ) : (
              <Button variant="outline" className="flex-1" onClick={onClose}>关闭</Button>
            )}
          </>
        }
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
            <div className="w-12 h-12 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <Building2 className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                {project.name}
                {isCurrent && <CheckCircle2 className="w-4 h-4 text-primary" />}
              </h4>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={`${status.color} border-0`}>{status.label}</Badge>
                {project.code && <span className="text-xs text-gray-400">{project.code}</span>}
              </div>
            </div>
          </div>

          {project.location && (
            <InfoRow icon={<MapPin className="w-3 h-3" />} label="项目地点" value={project.location} />
          )}
          {(project.startDate || project.endDate) && (
            <InfoRow icon={<Calendar className="w-3 h-3" />} label="工期" value={`${project.startDate ?? '-'} ~ ${project.endDate ?? '未确定'}`} />
          )}
          {project.contractor && (
            <InfoRow icon={<UserIcon className="w-3 h-3" />} label="施工单位" value={project.contractor} />
          )}
          {project.supervisor && (
            <InfoRow label="监理单位" value={project.supervisor} />
          )}
          {project.owner && (
            <InfoRow label="建设单位" value={project.owner} />
          )}
          {project.managerName && (
            <InfoRow label="项目经理" value={project.managerName} />
          )}
          {project.techDirector && (
            <InfoRow label="技术负责人" value={project.techDirector} />
          )}
          {(project.safetyOfficer || project.safetyOfficerPhone) && (
            <div className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50">
              <span className="text-gray-500 text-xs flex items-center gap-1">
                <Phone className="w-3 h-3" />安全员
              </span>
              <span className="text-gray-900 text-right">
                {project.safetyOfficer}{project.safetyOfficerPhone ? ` (${project.safetyOfficerPhone})` : ''}
              </span>
            </div>
          )}
          {project.description && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">项目简介</p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{project.description}</p>
            </div>
          )}
          {project.extraFields && Object.keys(project.extraFields).length > 0 && (
            <div className="bg-violet-50 rounded-lg p-3">
              <p className="text-xs text-violet-600 mb-2 font-medium">扩展字段</p>
              <div className="space-y-1.5">
                {Object.entries(project.extraFields).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between text-sm">
                    <span className="text-violet-700 text-xs">{key}</span>
                    <span className="text-gray-900 text-right">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Sheet>

      {editOpen && (
        <ProjectFormSheet
          open={true}
          onClose={() => setEditOpen(false)}
          onSuccess={() => { setEditOpen(false); onUpdated() }}
          project={project}
        />
      )}
    </>
  )
}

function InfoRow({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50">
      <span className="text-gray-500 text-xs flex items-center gap-1">{icon}{label}</span>
      <span className="text-gray-900 text-right">{value}</span>
    </div>
  )
}