import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { equipmentService } from '@/services/equipment.service'
import { getCurrentProjectId } from '@/store'

function sortByCreatedAt<T extends { createdAt?: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
}

export function useEquipmentList() {
  const projectId = getCurrentProjectId()
  const items = useLiveQuery(() => equipmentService.list(projectId), [projectId]) ?? []
  return useMemo(() => sortByCreatedAt(items), [items])
}
