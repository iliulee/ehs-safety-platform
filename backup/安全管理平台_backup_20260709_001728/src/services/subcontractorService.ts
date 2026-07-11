import { subcontractorRepo } from '@/db/repositories'
import { getCurrentProjectId } from '@/store'
import type { Subcontractor } from '@/types'

class SubcontractorService {
  async list(projectId?: string): Promise<Subcontractor[]> {
    const pid = projectId ?? getCurrentProjectId()
    if (!pid) return subcontractorRepo.getAll()
    return subcontractorRepo.find({ projectId: pid } as Partial<Subcontractor>)
  }

  async getById(id: string): Promise<Subcontractor | undefined> {
    return subcontractorRepo.getById(id)
  }

  async create(data: Omit<Subcontractor, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    return subcontractorRepo.add(data)
  }

  async update(id: string, data: Partial<Subcontractor>): Promise<void> {
    return subcontractorRepo.update(id, data)
  }

  async remove(id: string): Promise<void> {
    return subcontractorRepo.remove(id)
  }
}

export const subcontractorService = new SubcontractorService()
