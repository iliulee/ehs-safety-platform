import { workerRepo, certificateRepo } from '@/db/repositories'
import { getCurrentProjectId } from '@/store'
import type { Worker, Certificate } from '@/types'

class WorkerService {
  async list(projectId?: string): Promise<Worker[]> {
    return this.listByProject(projectId)
  }

  async listByProject(projectId?: string): Promise<Worker[]> {
    const pid = projectId ?? getCurrentProjectId()
    if (!pid) return workerRepo.getAll()
    return workerRepo.find({ projectId: pid } as Partial<Worker>)
  }

  async getById(id: string): Promise<Worker | undefined> {
    return workerRepo.getById(id)
  }

  async create(data: Omit<Worker, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    return workerRepo.add(data)
  }

  async update(id: string, data: Partial<Worker>): Promise<void> {
    return workerRepo.update(id, data)
  }

  async remove(id: string): Promise<void> {
    const certs = await certificateRepo.find({ workerId: id } as Partial<Certificate>)
    for (const c of certs) {
      if (c.id) await certificateRepo.remove(c.id)
    }
    return workerRepo.remove(id)
  }

  async countByProject(projectId?: string): Promise<number> {
    const list = await this.listByProject(projectId)
    return list.filter(w => w.status === 'active').length
  }

  async getCertificates(workerId: string): Promise<Certificate[]> {
    return certificateRepo.find({ workerId } as Partial<Certificate>)
  }

  async addCertificate(data: Omit<Certificate, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    return certificateRepo.add(data)
  }

  async saveCertificates(workerId: string, certificates: Certificate[]): Promise<void> {
    const existing = await certificateRepo.find({ workerId } as Partial<Certificate>)
    for (const c of existing) {
      if (c.id) await certificateRepo.remove(c.id)
    }
    for (const c of certificates) {
      const { id, createdAt, updatedAt, ...rest } = c
      void id; void createdAt; void updatedAt
      await certificateRepo.add({ ...rest, workerId })
    }
  }
}

export const workerService = new WorkerService()
