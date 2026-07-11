import { penaltyRepo } from '@/db/repositories'
import { getCurrentProjectId } from '@/store'
import type { Penalty } from '@/types'

class PenaltyService {
  async list(projectId?: string): Promise<Penalty[]> {
    const pid = projectId ?? getCurrentProjectId()
    if (!pid) return penaltyRepo.getAll()
    return penaltyRepo.find({ projectId: pid } as Partial<Penalty>)
  }

  async getById(id: string): Promise<Penalty | undefined> {
    return penaltyRepo.getById(id)
  }

  async create(data: Omit<Penalty, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    return penaltyRepo.add(data)
  }

  async update(id: string, data: Partial<Penalty>): Promise<void> {
    return penaltyRepo.update(id, data)
  }

  async remove(id: string): Promise<void> {
    return penaltyRepo.remove(id)
  }

  async count(projectId?: string): Promise<number> {
    const list = await this.list(projectId)
    return list.length
  }

  async sumAmount(projectId?: string): Promise<number> {
    const list = await this.list(projectId)
    return list.reduce((sum, p) => sum + (p.amount || 0), 0)
  }
}

export const penaltyService = new PenaltyService()
