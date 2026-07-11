import { dangerousProjectRepo } from '@/db/repositories'
import { getCurrentProjectId } from '@/store'
import type { DangerousProject } from '@/types'

class DangerousProjectService {
  async list(projectId?: string): Promise<DangerousProject[]> {
    const pid = projectId ?? getCurrentProjectId()
    if (!pid) return dangerousProjectRepo.getAll()
    return dangerousProjectRepo.find({ projectId: pid } as Partial<DangerousProject>)
  }

  async getById(id: string): Promise<DangerousProject | undefined> {
    return dangerousProjectRepo.getById(id)
  }

  async create(data: Omit<DangerousProject, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    return dangerousProjectRepo.add(data)
  }

  async update(id: string, data: Partial<DangerousProject>): Promise<void> {
    return dangerousProjectRepo.update(id, data)
  }

  async remove(id: string): Promise<void> {
    return dangerousProjectRepo.remove(id)
  }
}

export const dangerousProjectService = new DangerousProjectService()
