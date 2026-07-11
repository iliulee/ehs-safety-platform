import { projectRepo } from '@/db/repositories'
import { getCurrentProjectId } from '@/store'
import type { Project } from '@/types'

class ProjectService {
  async list(): Promise<Project[]> {
    return projectRepo.getAll()
  }

  async getById(id: string): Promise<Project | undefined> {
    return projectRepo.getById(id)
  }

  async getCurrent(): Promise<Project | undefined> {
    const pid = getCurrentProjectId()
    if (!pid) {
      const list = await projectRepo.getAll()
      return list[0]
    }
    return projectRepo.getById(pid)
  }

  async create(data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    return projectRepo.add(data)
  }

  async update(id: string, data: Partial<Project>): Promise<void> {
    return projectRepo.update(id, data)
  }

  async remove(id: string): Promise<void> {
    return projectRepo.remove(id)
  }

  async count(): Promise<number> {
    return projectRepo.count()
  }
}

export const projectService = new ProjectService()
