import { accidentRepo } from '@/db/repositories'
import { getCurrentProjectId } from '@/store'
import type { AccidentRecord } from '@/types'

class AccidentService {
  async list(projectId?: string): Promise<AccidentRecord[]> {
    const pid = projectId ?? getCurrentProjectId()
    if (!pid) return accidentRepo.getAll()
    return accidentRepo.find({ projectId: pid } as Partial<AccidentRecord>)
  }

  async getById(id: string): Promise<AccidentRecord | undefined> {
    return accidentRepo.getById(id)
  }

  async create(data: Omit<AccidentRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const pid = getCurrentProjectId()
    return accidentRepo.add({
      ...data,
      projectId: data.projectId ?? pid,
    } as Omit<AccidentRecord, 'id' | 'createdAt' | 'updatedAt'>)
  }

  async update(id: string, data: Partial<AccidentRecord>): Promise<void> {
    return accidentRepo.update(id, data)
  }

  async remove(id: string): Promise<void> {
    return accidentRepo.remove(id)
  }
}

export const accidentService = new AccidentService()