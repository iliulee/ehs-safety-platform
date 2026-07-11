import {
  projectRepo, workerRepo, hazardRepo, educationRepo,
  trainingRepo, dailyLogRepo, workPermitRepo, acceptanceRepo,
  meetingRepo, correspondenceRepo, dangerousProjectRepo,
} from '@/db/repositories'
import { getCurrentProjectId } from '@/store'

export interface DashboardStats {
  projectCount: number
  workerCount: number
  pendingHazards: number
  overdueHazards: number
  closedHazards: number
  majorHazards: number
  educationCount: number
  trainingCount: number
  logCount: number
  permitCount: number
  acceptanceCount: number
  meetingCount: number
  correspondenceCount: number
  dangerProjectCount: number
  hazardClosureRate: number
}

class StatisticsService {
  async getDashboardStats(projectId?: string): Promise<DashboardStats> {
    const pid = projectId ?? getCurrentProjectId()

    const [projects, workers, hazards, educations, trainings, logs, permits, acceptances, meetings, cors, dangers] = await Promise.all([
      projectRepo.count(),
      pid ? workerRepo.find({ projectId: pid } as never) : workerRepo.getAll(),
      pid ? hazardRepo.find({ projectId: pid } as never) : hazardRepo.getAll(),
      pid ? educationRepo.find({ projectId: pid } as never) : educationRepo.getAll(),
      pid ? trainingRepo.find({ projectId: pid } as never) : trainingRepo.getAll(),
      pid ? dailyLogRepo.find({ projectId: pid } as never) : dailyLogRepo.getAll(),
      pid ? workPermitRepo.find({ projectId: pid } as never) : workPermitRepo.getAll(),
      pid ? acceptanceRepo.find({ projectId: pid } as never) : acceptanceRepo.getAll(),
      pid ? meetingRepo.find({ projectId: pid } as never) : meetingRepo.getAll(),
      pid ? correspondenceRepo.find({ projectId: pid } as never) : correspondenceRepo.getAll(),
      pid ? dangerousProjectRepo.find({ projectId: pid } as never) : dangerousProjectRepo.getAll(),
    ])

    const activeWorkers = workers.filter(w => w.status === 'active').length
    const pendingHazards = hazards.filter(h => h.status === 'pending' || h.status === 'rectifying' || h.status === 'reviewing').length
    const overdueHazards = hazards.filter(h => h.status === 'overdue').length
    const closedHazards = hazards.filter(h => h.status === 'closed').length
    const majorHazards = hazards.filter(h => h.level === 'major' && h.status !== 'closed').length

    return {
      projectCount: projects,
      workerCount: activeWorkers,
      pendingHazards,
      overdueHazards,
      closedHazards,
      majorHazards,
      educationCount: educations.length,
      trainingCount: trainings.length,
      logCount: logs.length,
      permitCount: permits.filter(p => p.status === 'approved' || p.status === 'pending_approval').length,
      acceptanceCount: acceptances.length,
      meetingCount: meetings.length,
      correspondenceCount: cors.length,
      dangerProjectCount: dangers.filter(d => d.status === 'ongoing').length,
      hazardClosureRate: hazards.length > 0 ? Math.round((closedHazards / hazards.length) * 100) : 100,
    }
  }
}

export const statisticsService = new StatisticsService()
