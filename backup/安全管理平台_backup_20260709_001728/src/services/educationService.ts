import { educationRepo } from '@/db/repositories'
import { getCurrentProjectId } from '@/store'
import type { EducationRecord } from '@/types'

class EducationService {
  async list(projectId?: string): Promise<EducationRecord[]> {
    const pid = projectId ?? getCurrentProjectId()
    if (!pid) return educationRepo.getAll()
    return educationRepo.find({ projectId: pid } as Partial<EducationRecord>)
  }

  async getById(id: string): Promise<EducationRecord | undefined> {
    return educationRepo.getById(id)
  }

  async create(data: Omit<EducationRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    return educationRepo.add(data)
  }

  async update(id: string, data: Partial<EducationRecord>): Promise<void> {
    return educationRepo.update(id, data)
  }

  async remove(id: string): Promise<void> {
    return educationRepo.remove(id)
  }
}

export const educationService = new EducationService()
