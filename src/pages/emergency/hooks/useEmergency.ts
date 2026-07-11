import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import {
  emergencyPlanService,
  emergencySupplyService,
  emergencyDrillService,
} from '@/services/emergency.service'
import { getCurrentProjectId } from '@/store'

function sortByCreatedAt<T extends { createdAt?: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
}

export function useEmergencyData() {
  const projectId = getCurrentProjectId()

  const plans = useLiveQuery(() => emergencyPlanService.list(projectId), [projectId]) ?? []
  const supplies = useLiveQuery(() => emergencySupplyService.list(projectId), [projectId]) ?? []
  const drills = useLiveQuery(() => emergencyDrillService.list(projectId), [projectId]) ?? []

  return useMemo(
    () => ({
      plans: sortByCreatedAt(plans),
      supplies: sortByCreatedAt(supplies),
      drills: sortByCreatedAt(drills),
    }),
    [plans, supplies, drills]
  )
}
