import { dailyLogRepo } from '@/db/repositories'
import { getCurrentProjectId } from '@/store'
import type { DailyLog } from '@/types'

class DailyLogService {
  async list(projectId?: string): Promise<DailyLog[]> {
    const pid = projectId ?? getCurrentProjectId()
    if (!pid) return dailyLogRepo.getAll()
    return dailyLogRepo.find({ projectId: pid } as Partial<DailyLog>)
  }

  async getById(id: string): Promise<DailyLog | undefined> {
    return dailyLogRepo.getById(id)
  }

  async create(data: Omit<DailyLog, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    return dailyLogRepo.add(data)
  }

  async update(id: string, data: Partial<DailyLog>): Promise<void> {
    return dailyLogRepo.update(id, data)
  }

  async remove(id: string): Promise<void> {
    return dailyLogRepo.remove(id)
  }
}

export const dailyLogService = new DailyLogService()
