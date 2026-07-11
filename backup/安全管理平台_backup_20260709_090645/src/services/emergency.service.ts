import { emergencyPlanRepo, emergencySupplyRepo, emergencyDrillRepo } from '@/db/repositories'
import { getCurrentProjectId } from '@/store'
import type { EmergencyPlan, EmergencySupply, EmergencyDrill } from '@/types'

class EmergencyPlanService {
  async list(projectId?: string): Promise<EmergencyPlan[]> {
    const pid = projectId ?? getCurrentProjectId()
    if (!pid) return emergencyPlanRepo.getAll()
    return emergencyPlanRepo.find({ projectId: pid } as Partial<EmergencyPlan>)
  }

  async getById(id: string): Promise<EmergencyPlan | undefined> {
    return emergencyPlanRepo.getById(id)
  }

  async create(data: Omit<EmergencyPlan, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const pid = getCurrentProjectId()
    return emergencyPlanRepo.add({
      ...data,
      projectId: data.projectId ?? pid,
    } as Omit<EmergencyPlan, 'id' | 'createdAt' | 'updatedAt'>)
  }

  async update(id: string, data: Partial<EmergencyPlan>): Promise<void> {
    return emergencyPlanRepo.update(id, data)
  }

  async remove(id: string): Promise<void> {
    return emergencyPlanRepo.remove(id)
  }
}

class EmergencySupplyService {
  async list(projectId?: string): Promise<EmergencySupply[]> {
    const pid = projectId ?? getCurrentProjectId()
    if (!pid) return emergencySupplyRepo.getAll()
    return emergencySupplyRepo.find({ projectId: pid } as Partial<EmergencySupply>)
  }

  async getById(id: string): Promise<EmergencySupply | undefined> {
    return emergencySupplyRepo.getById(id)
  }

  async create(data: Omit<EmergencySupply, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const pid = getCurrentProjectId()
    return emergencySupplyRepo.add({
      ...data,
      projectId: data.projectId ?? pid,
    } as Omit<EmergencySupply, 'id' | 'createdAt' | 'updatedAt'>)
  }

  async update(id: string, data: Partial<EmergencySupply>): Promise<void> {
    return emergencySupplyRepo.update(id, data)
  }

  async remove(id: string): Promise<void> {
    return emergencySupplyRepo.remove(id)
  }
}

class EmergencyDrillService {
  async list(projectId?: string): Promise<EmergencyDrill[]> {
    const pid = projectId ?? getCurrentProjectId()
    if (!pid) return emergencyDrillRepo.getAll()
    return emergencyDrillRepo.find({ projectId: pid } as Partial<EmergencyDrill>)
  }

  async getById(id: string): Promise<EmergencyDrill | undefined> {
    return emergencyDrillRepo.getById(id)
  }

  async create(data: Omit<EmergencyDrill, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const pid = getCurrentProjectId()
    return emergencyDrillRepo.add({
      ...data,
      projectId: data.projectId ?? pid,
    } as Omit<EmergencyDrill, 'id' | 'createdAt' | 'updatedAt'>)
  }

  async update(id: string, data: Partial<EmergencyDrill>): Promise<void> {
    return emergencyDrillRepo.update(id, data)
  }

  async remove(id: string): Promise<void> {
    return emergencyDrillRepo.remove(id)
  }
}

export const emergencyPlanService = new EmergencyPlanService()
export const emergencySupplyService = new EmergencySupplyService()
export const emergencyDrillService = new EmergencyDrillService()