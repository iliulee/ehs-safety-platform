import { useState, useMemo } from 'react'
import { useAppStore } from '@/store'
import { useWorkerList, type StatusFilter } from './hooks/useWorkerList'
import { WorkerToolbar } from './components/WorkerToolbar'
import { WorkerList } from './components/WorkerList'
import { WorkerSheets } from './components/WorkerSheets'
import { workerService } from '@/services/workerService'
import type { Worker } from '@/types'

export default function WorkerListPage() {
  const { getDictItems } = useAppStore()
  const workTypeItems = getDictItems('work_type')

  const {
    workers,
    subcontractors,
    filteredWorkers,
    counts,
    loading,
    statusFilter,
    setStatusFilter,
    searchText,
    setSearchText,
  } = useWorkerList()

  const [addOpen, setAddOpen] = useState(false)
  const [editWorker, setEditWorker] = useState<Worker | null>(null)

  const subcontractorMap = useMemo(
    () => new Map(subcontractors.map((s) => [s.id!, s.name])),
    [subcontractors],
  )

  const workTypeMap = useMemo(
    () => new Map(workTypeItems.map((w) => [w.code, w.label])),
    [workTypeItems],
  )

  const handleLeave = async (worker: Worker) => {
    if (!worker.id || !confirm('确定标记该工人为离场？')) return
    await workerService.update(worker.id, { status: 'left' })
  }

  const handleDelete = async (worker: Worker) => {
    if (!worker.id || !confirm('确定删除该工人记录？此操作不可恢复。')) return
    await workerService.remove(worker.id)
  }

  return (
    <div className="pb-6">
      <WorkerToolbar
        count={workers.length}
        searchText={searchText}
        onSearchChange={setSearchText}
        onAdd={() => setAddOpen(true)}
      />

      <div className="px-3 pt-3">
        <WorkerList
          workers={filteredWorkers}
          loading={loading}
          statusFilter={statusFilter}
          counts={counts}
          subcontractorMap={subcontractorMap}
          workTypeMap={workTypeMap}
          onStatusChange={(s) => setStatusFilter(s as StatusFilter)}
          onDetail={setEditWorker}
          onLeave={handleLeave}
          onDelete={handleDelete}
        />
      </div>

      <WorkerSheets
        addOpen={addOpen}
        setAddOpen={setAddOpen}
        editWorker={editWorker}
        setEditWorker={setEditWorker}
        workTypeItems={workTypeItems}
        subcontractors={subcontractors}
      />
    </div>
  )
}
