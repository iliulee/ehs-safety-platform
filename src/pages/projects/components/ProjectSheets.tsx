import { ProjectFormSheet } from './ProjectFormSheet'
import { ProjectDetailSheet } from './ProjectDetailSheet'
import type { Project } from '@/types'

interface ProjectSheetsProps {
  addOpen: boolean
  setAddOpen: (open: boolean) => void
  detailItem: Project | null
  setDetailItem: (project: Project | null) => void
  isCurrent: (project: Project) => boolean
  onSwitch: (project: Project) => void
}

export function ProjectSheets({
  addOpen,
  setAddOpen,
  detailItem,
  setDetailItem,
  isCurrent,
  onSwitch,
}: ProjectSheetsProps) {
  return (
    <>
      <ProjectFormSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={() => setAddOpen(false)}
      />
      {detailItem && (
        <ProjectDetailSheet
          project={detailItem}
          isCurrent={isCurrent(detailItem)}
          onClose={() => setDetailItem(null)}
          onUpdated={() => setDetailItem(null)}
          onSwitch={() => onSwitch(detailItem)}
        />
      )}
    </>
  )
}