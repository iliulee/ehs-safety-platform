import { acceptanceRepo } from '@/db/repositories'
import { getCurrentProjectId } from '@/store'
import type { Acceptance } from '@/types'

class AcceptanceService {
  async list(projectId?: string): Promise<Acceptance[]> {
    const pid = projectId ?? getCurrentProjectId()
    if (!pid) return acceptanceRepo.getAll()
    return acceptanceRepo.find({ projectId: pid } as Partial<Acceptance>)
  }

  async getById(id: string): Promise<Acceptance | undefined> {
    return acceptanceRepo.getById(id)
  }

  async create(data: Omit<Acceptance, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const pid = getCurrentProjectId()
    return acceptanceRepo.add({
      ...data,
      projectId: data.projectId ?? pid,
    } as Omit<Acceptance, 'id' | 'createdAt' | 'updatedAt'>)
  }

  async update(id: string, data: Partial<Acceptance>): Promise<void> {
    return acceptanceRepo.update(id, data)
  }

  async remove(id: string): Promise<void> {
    return acceptanceRepo.remove(id)
  }
}

export const acceptanceService = new AcceptanceService()
