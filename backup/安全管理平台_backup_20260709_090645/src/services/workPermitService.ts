import { workPermitRepo } from '@/db/repositories'
import { getCurrentProjectId } from '@/store'
import type { WorkPermit } from '@/types'

class WorkPermitService {
  async list(projectId?: string): Promise<WorkPermit[]> {
    const pid = projectId ?? getCurrentProjectId()
    if (!pid) return workPermitRepo.getAll()
    return workPermitRepo.find({ projectId: pid } as Partial<WorkPermit>)
  }

  async getById(id: string): Promise<WorkPermit | undefined> {
    return workPermitRepo.getById(id)
  }

  async create(data: Omit<WorkPermit, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    return workPermitRepo.add(data)
  }

  async update(id: string, data: Partial<WorkPermit>): Promise<void> {
    return workPermitRepo.update(id, data)
  }

  async remove(id: string): Promise<void> {
    return workPermitRepo.remove(id)
  }
}

export const workPermitService = new WorkPermitService()
