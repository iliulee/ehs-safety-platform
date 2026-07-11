import { hazardRepo } from '@/db/repositories'
import { getCurrentProjectId } from '@/store'
import type { Hazard } from '@/types'

class HazardService {
  async list(projectId?: string): Promise<Hazard[]> {
    return this.listByProject(projectId)
  }

  async listByProject(projectId?: string): Promise<Hazard[]> {
    const pid = projectId ?? getCurrentProjectId()
    if (!pid) return hazardRepo.getAll()
    return hazardRepo.find({ projectId: pid } as Partial<Hazard>)
  }

  async getById(id: string): Promise<Hazard | undefined> {
    return hazardRepo.getById(id)
  }

  async create(data: Omit<Hazard, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    return hazardRepo.add(data)
  }

  async update(id: string, data: Partial<Hazard>): Promise<void> {
    return hazardRepo.update(id, data)
  }

  async remove(id: string): Promise<void> {
    return hazardRepo.remove(id)
  }

  async countByStatus(projectId?: string): Promise<Record<string, number>> {
    const list = await this.listByProject(projectId)
    const result: Record<string, number> = {
      pending: 0, rectifying: 0, reviewing: 0, closed: 0, overdue: 0,
    }
    for (const h of list) {
      if (result[h.status] !== undefined) result[h.status]++
    }
    result.total = list.length
    return result
  }

  async countByLevel(projectId?: string): Promise<Record<string, number>> {
    const list = await this.listByProject(projectId)
    return {
      general: list.filter(h => h.level === 'general').length,
      major: list.filter(h => h.level === 'major').length,
      total: list.length,
    }
  }
}

export const hazardService = new HazardService()
