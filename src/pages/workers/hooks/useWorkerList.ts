import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { workerRepo, subcontractorRepo } from '@/db/repositories'
import { useAppStore } from '@/store'
import type { Worker, Subcontractor } from '@/types'

export type StatusFilter = 'all' | 'active' | 'left' | 'suspended'

export const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'active', label: '在岗' },
  { key: 'left', label: '离场' },
  { key: 'suspended', label: '停工' },
]

export function useWorkerList() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [searchText, setSearchText] = useState('')
  const projectId = useAppStore((s) => s.currentProjectId)

  const [loaded, setLoaded] = useState(false)

  const workers = useLiveQuery(
    async () => {
      const result = await (projectId ? workerRepo.find({ projectId } as Partial<Worker>) : workerRepo.getAll())
      setLoaded(true)
      return result
    },
    [projectId],
    [],
  )

  const subcontractors = useLiveQuery(
    async () => {
      return projectId ? subcontractorRepo.find({ projectId } as Partial<Subcontractor>) : subcontractorRepo.getAll()
    },
    [projectId],
    [],
  )

  const filteredWorkers = useMemo(() => {
    let list = workers
    if (statusFilter !== 'all') {
      list = list.filter((w) => w.status === statusFilter)
    }
    const q = searchText.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (w) =>
          w.name.toLowerCase().includes(q) ||
          (w.idCard ?? '').toLowerCase().includes(q) ||
          (w.phone ?? '').includes(q),
      )
    }
    return list
  }, [workers, statusFilter, searchText])

  const counts = useMemo(
    () => ({
      all: workers.length,
      active: workers.filter((w) => w.status === 'active').length,
      left: workers.filter((w) => w.status === 'left').length,
      suspended: workers.filter((w) => w.status === 'suspended').length,
    }),
    [workers],
  )

  return {
    workers,
    subcontractors,
    filteredWorkers,
    counts,
    loading: !loaded,
    statusFilter,
    setStatusFilter,
    searchText,
    setSearchText,
  }
}
