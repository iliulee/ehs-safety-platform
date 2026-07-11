import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { safetyCostService } from '@/services/safetyCost.service'
import { getCurrentProjectId } from '@/store'
import type { SafetyCost } from '@/types'

export interface SafetyCostStats {
  annualBudget: number
  yearSpent: number
  rate: number
  remaining: number
}

export function useSafetyCostList() {
  const projectId = getCurrentProjectId()

  const items = useLiveQuery(
    () => safetyCostService.list(projectId),
    [projectId]
  ) ?? []

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)),
    [items]
  )

  return sortedItems
}

export function useSafetyCostStats(items: SafetyCost[]): SafetyCostStats {
  return useMemo(() => {
    const currentYear = new Date().getFullYear()
    const yearItems = items.filter((i) => i.date && new Date(i.date).getFullYear() === currentYear)
    const yearSpent = yearItems.reduce((sum, i) => sum + (i.amount || 0), 0)
    const annualBudget = Math.max(yearSpent * 2, 10000)
    const rate = annualBudget > 0 ? Math.round((yearSpent / annualBudget) * 100) : 0
    const remaining = annualBudget - yearSpent

    return { annualBudget, yearSpent, rate, remaining }
  }, [items])
}
