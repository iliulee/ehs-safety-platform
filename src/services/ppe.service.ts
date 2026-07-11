import { ppeRepo } from '@/db/repositories'
import { getCurrentProjectId } from '@/store'
import type { PpeItem } from '@/types'

class PpeService {
  async list(projectId?: string): Promise<PpeItem[]> {
    const pid = projectId ?? getCurrentProjectId()
    if (!pid) return ppeRepo.getAll()
    return ppeRepo.find({ projectId: pid } as Partial<PpeItem>)
  }

  async getById(id: string): Promise<PpeItem | undefined> {
    return ppeRepo.getById(id)
  }

  async create(data: Omit<PpeItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const pid = getCurrentProjectId()
    return ppeRepo.add({
      ...data,
      projectId: data.projectId ?? pid,
    } as Omit<PpeItem, 'id' | 'createdAt' | 'updatedAt'>)
  }

  async update(id: string, data: Partial<PpeItem>): Promise<void> {
    return ppeRepo.update(id, data)
  }

  async remove(id: string): Promise<void> {
    return ppeRepo.remove(id)
  }
}

export const ppeService = new PpeService()