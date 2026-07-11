import { hazardSourceRepo } from '@/db/repositories'
import { getCurrentProjectId } from '@/store'
import type { HazardSource } from '@/types'

class HazardSourceService {
  async list(projectId?: string): Promise<HazardSource[]> {
    const pid = projectId ?? getCurrentProjectId()
    if (!pid) return hazardSourceRepo.getAll()
    return hazardSourceRepo.find({ projectId: pid } as Partial<HazardSource>)
  }

  async getById(id: string): Promise<HazardSource | undefined> {
    return hazardSourceRepo.getById(id)
  }

  async create(data: Omit<HazardSource, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    return hazardSourceRepo.add(data)
  }

  async update(id: string, data: Partial<HazardSource>): Promise<void> {
    return hazardSourceRepo.update(id, data)
  }

  async remove(id: string): Promise<void> {
    return hazardSourceRepo.remove(id)
  }
}

export const hazardSourceService = new HazardSourceService()
