import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { ppeService } from '@/services/ppe.service'
import { getCurrentProjectId } from '@/store'

function sortByCreatedAt<T extends { createdAt?: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
}

export function usePpeList() {
  const projectId = getCurrentProjectId()
  const items = useLiveQuery(() => ppeService.list(projectId), [projectId]) ?? []
  return useMemo(() => sortByCreatedAt(items), [items])
}
