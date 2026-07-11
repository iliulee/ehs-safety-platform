import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { hazardRepo } from '@/db/repositories'
import { useAppStore } from '@/store'
import type { Hazard } from '@/types'

export type StatusFilter = 'all' | 'pending' | 'rectifying' | 'reviewing' | 'closed'

export const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待整改' },
  { key: 'rectifying', label: '整改中' },
  { key: 'reviewing', label: '复查中' },
  { key: 'closed', label: '已闭环' },
]

export function isOverdue(h: Hazard): boolean {
  if (h.status === 'closed') return false
  if (!h.rectifyDeadline) return false
  return new Date(h.rectifyDeadline) < new Date(new Date().toISOString().slice(0, 10))
}

export function effectiveStatus(h: Hazard): string {
  return isOverdue(h) ? 'overdue' : h.status
}

export function useHazardList() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [searchText, setSearchText] = useState('')
  const projectId = useAppStore((s) => s.currentProjectId)

  const hazards = useLiveQuery(
    async () => {
      if (!projectId) return hazardRepo.getAll()
      return hazardRepo.find({ projectId } as Partial<Hazard>)
    },
    [projectId],
    [],
  )

  const filteredHazards = useMemo(() => {
    let list = hazards
    if (statusFilter !== 'all') {
      list = list.filter((h) => {
        if (statusFilter === 'pending' && isOverdue(h)) return true
        return h.status === statusFilter
      })
    }
    const q = searchText.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (h) =>
          h.title.toLowerCase().includes(q) ||
          (h.location ?? '').toLowerCase().includes(q) ||
          (h.description ?? '').toLowerCase().includes(q),
      )
    }
    return list
  }, [hazards, statusFilter, searchText])

  const counts = useMemo(
    () => ({
      all: hazards.length,
      pending: hazards.filter((h) => h.status === 'pending' || isOverdue(h)).length,
      rectifying: hazards.filter((h) => h.status === 'rectifying').length,
      reviewing: hazards.filter((h) => h.status === 'reviewing').length,
      closed: hazards.filter((h) => h.status === 'closed').length,
    }),
    [hazards],
  )

  return {
    hazards,
    filteredHazards,
    counts,
    statusFilter,
    setStatusFilter,
    searchText,
    setSearchText,
  }
}
