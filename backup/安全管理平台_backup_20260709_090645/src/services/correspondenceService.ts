import { correspondenceRepo } from '@/db/repositories'
import { getCurrentProjectId } from '@/store'
import type { Correspondence } from '@/types'

class CorrespondenceService {
  async list(projectId?: string): Promise<Correspondence[]> {
    const pid = projectId ?? getCurrentProjectId()
    if (!pid) return correspondenceRepo.getAll()
    return correspondenceRepo.find({ projectId: pid } as Partial<Correspondence>)
  }

  async getById(id: string): Promise<Correspondence | undefined> {
    return correspondenceRepo.getById(id)
  }

  async create(data: Omit<Correspondence, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const pid = getCurrentProjectId()
    return correspondenceRepo.add({
      ...data,
      projectId: data.projectId ?? pid,
    } as Omit<Correspondence, 'id' | 'createdAt' | 'updatedAt'>)
  }

  async update(id: string, data: Partial<Correspondence>): Promise<void> {
    return correspondenceRepo.update(id, data)
  }

  async remove(id: string): Promise<void> {
    return correspondenceRepo.remove(id)
  }
}

export const correspondenceService = new CorrespondenceService()
