import { safetyCostRepo } from '@/db/repositories'
import { getCurrentProjectId } from '@/store'
import type { SafetyCost } from '@/types'

class SafetyCostService {
  async list(projectId?: string): Promise<SafetyCost[]> {
    const pid = projectId ?? getCurrentProjectId()
    if (!pid) return safetyCostRepo.getAll()
    return safetyCostRepo.find({ projectId: pid } as Partial<SafetyCost>)
  }

  async getById(id: string): Promise<SafetyCost | undefined> {
    return safetyCostRepo.getById(id)
  }

  async create(data: Omit<SafetyCost, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const pid = getCurrentProjectId()
    return safetyCostRepo.add({
      ...data,
      projectId: data.projectId ?? pid,
    } as Omit<SafetyCost, 'id' | 'createdAt' | 'updatedAt'>)
  }

  async update(id: string, data: Partial<SafetyCost>): Promise<void> {
    return safetyCostRepo.update(id, data)
  }

  async remove(id: string): Promise<void> {
    return safetyCostRepo.remove(id)
  }
}

export const safetyCostService = new SafetyCostService()