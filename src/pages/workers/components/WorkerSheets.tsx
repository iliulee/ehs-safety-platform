import { WorkerFormSheet } from './WorkerFormSheet'
import { WorkerDetailSheet } from './WorkerDetailSheet'
import type { Worker, Subcontractor } from '@/types'

interface WorkerSheetsProps {
  addOpen: boolean
  setAddOpen: (open: boolean) => void
  editWorker: Worker | null
  setEditWorker: (worker: Worker | null) => void
  workTypeItems: { code: string; label: string }[]
  subcontractors: Subcontractor[]
}

export function WorkerSheets({
  addOpen,
  setAddOpen,
  editWorker,
  setEditWorker,
  workTypeItems,
  subcontractors,
}: WorkerSheetsProps) {
  return (
    <>
      <WorkerFormSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={() => setAddOpen(false)}
        workTypeItems={workTypeItems}
        subcontractors={subcontractors}
      />
      {editWorker && (
        <WorkerDetailSheet
          worker={editWorker}
          onClose={() => setEditWorker(null)}
          onUpdated={() => setEditWorker(null)}
          workTypeItems={workTypeItems}
          subcontractors={subcontractors}
        />
      )}
    </>
  )
}
