import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store'
import { useWorkerList, type StatusFilter } from './hooks/useWorkerList'
import { WorkerToolbar } from './components/WorkerToolbar'
import { WorkerList } from './components/WorkerList'
import { workerService } from '@/services/workerService'
import type { Worker } from '@/types'

export default function WorkerListPage() {
  const navigate = useNavigate()
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

  const handleReactivate = async (worker: Worker) => {
    if (!worker.id || !confirm('确定将该工人恢复在岗？')) return
    await workerService.update(worker.id, { status: 'active' })
  }

  const handleEdit = (worker: Worker) => {
    if (!worker.id) return
    navigate(`/workers/${worker.id}/edit`)
  }

  return (
    <div className="pb-6">
      <WorkerToolbar
        count={workers.length}
        searchText={searchText}
        onSearchChange={setSearchText}
        onAdd={() => navigate('/workers/new')}
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
          onDetail={(w) => navigate(`/workers/${w.id}`)}
          onEdit={handleEdit}
          onLeave={handleLeave}
          onReactivate={handleReactivate}
          onDelete={handleDelete}
        />
      </div>
    </div>
  )
}