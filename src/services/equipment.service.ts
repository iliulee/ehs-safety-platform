import { equipmentRepo } from '@/db/repositories'
import { getCurrentProjectId } from '@/store'
import type { Equipment } from '@/types'

class EquipmentService {
  async list(projectId?: string): Promise<Equipment[]> {
    const pid = projectId ?? getCurrentProjectId()
    if (!pid) return equipmentRepo.getAll()
    return equipmentRepo.find({ projectId: pid } as Partial<Equipment>)
  }

  async getById(id: string): Promise<Equipment | undefined> {
    return equipmentRepo.getById(id)
  }

  async create(data: Omit<Equipment, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const pid = getCurrentProjectId()
    return equipmentRepo.add({
      ...data,
      projectId: data.projectId ?? pid,
    } as Omit<Equipment, 'id' | 'createdAt' | 'updatedAt'>)
  }

  async update(id: string, data: Partial<Equipment>): Promise<void> {
    return equipmentRepo.update(id, data)
  }

  async remove(id: string): Promise<void> {
    return equipmentRepo.remove(id)
  }
}

export const equipmentService = new EquipmentService()