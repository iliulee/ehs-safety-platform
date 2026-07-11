import { meetingRepo } from '@/db/repositories'
import { getCurrentProjectId } from '@/store'
import type { Meeting } from '@/types'

class MeetingService {
  async list(projectId?: string): Promise<Meeting[]> {
    const pid = projectId ?? getCurrentProjectId()
    if (!pid) return meetingRepo.getAll()
    return meetingRepo.find({ projectId: pid } as Partial<Meeting>)
  }

  async getById(id: string): Promise<Meeting | undefined> {
    return meetingRepo.getById(id)
  }

  async create(data: Omit<Meeting, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const pid = getCurrentProjectId()
    return meetingRepo.add({
      ...data,
      projectId: data.projectId ?? pid,
    } as Omit<Meeting, 'id' | 'createdAt' | 'updatedAt'>)
  }

  async update(id: string, data: Partial<Meeting>): Promise<void> {
    return meetingRepo.update(id, data)
  }

  async remove(id: string): Promise<void> {
    return meetingRepo.remove(id)
  }
}

export const meetingService = new MeetingService()
