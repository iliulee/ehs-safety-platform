import { trainingRepo } from '@/db/repositories'
import { getCurrentProjectId } from '@/store'
import type { TrainingRecord } from '@/types'

class TrainingService {
  async list(projectId?: string): Promise<TrainingRecord[]> {
    const pid = projectId ?? getCurrentProjectId()
    if (!pid) return trainingRepo.getAll()
    return trainingRepo.find({ projectId: pid } as Partial<TrainingRecord>)
  }

  async getById(id: string): Promise<TrainingRecord | undefined> {
    return trainingRepo.getById(id)
  }

  async create(data: Omit<TrainingRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    return trainingRepo.add(data)
  }

  async update(id: string, data: Partial<TrainingRecord>): Promise<void> {
    return trainingRepo.update(id, data)
  }

  async remove(id: string): Promise<void> {
    return trainingRepo.remove(id)
  }
}

export const trainingService = new TrainingService()
