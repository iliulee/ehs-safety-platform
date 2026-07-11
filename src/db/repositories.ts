import type { Table } from 'dexie'
import { db, now } from '@/db'
import { BaseRepository } from '@/db/repositories/base.repo'
import { categoryRepo } from '@/db/repositories/category.repo'
import { templateRepo } from '@/db/repositories/template.repo'

export { BaseRepository, categoryRepo, templateRepo }

import type {
  Project, Subcontractor, Worker, Certificate,
  EducationRecord, TrainingRecord, DailyLog,
  Hazard, HazardSource, DangerousProject, WorkPermit,
  Acceptance, Meeting, Correspondence,
  AiChatMessage, AiSession, KnowledgeItem, AiGeneration,
  DictItem, SettingItem,
  PpeItem, Equipment, EmergencyPlan, EmergencySupply, EmergencyDrill, AccidentRecord, SafetyCost,
  Penalty,
} from '@/types'

export const projectRepo = new BaseRepository<Project>(db.projects)
export const subcontractorRepo = new BaseRepository<Subcontractor>(db.subcontractors)
export const workerRepo = new BaseRepository<Worker>(db.workers)
export const certificateRepo = new BaseRepository<Certificate>(db.certificates)
export const educationRepo = new BaseRepository<EducationRecord>(db.educationRecords)
export const trainingRepo = new BaseRepository<TrainingRecord>(db.trainingRecords)
export const dailyLogRepo = new BaseRepository<DailyLog>(db.dailyLogs)
export const hazardRepo = new BaseRepository<Hazard>(db.hazards)
export const hazardSourceRepo = new BaseRepository<HazardSource>(db.hazardSources)
export const dangerousProjectRepo = new BaseRepository<DangerousProject>(db.dangerousProjects)
export const workPermitRepo = new BaseRepository<WorkPermit>(db.workPermits)
export const acceptanceRepo = new BaseRepository<Acceptance>(db.acceptances)
export const meetingRepo = new BaseRepository<Meeting>(db.meetings)
export const correspondenceRepo = new BaseRepository<Correspondence>(db.correspondences)
export const aiChatMessageRepo = new BaseRepository<AiChatMessage>(db.aiChatMessages)
export const aiSessionRepo = new BaseRepository<AiSession>(db.aiSessions)
export const knowledgeRepo = new BaseRepository<KnowledgeItem>(db.knowledgeItems)
export const aiGenerationRepo = new BaseRepository<AiGeneration>(db.aiGenerations)
export const dictRepo = new BaseRepository<DictItem>(db.dictItems)

// v4.0 新增
export const ppeRepo = new BaseRepository<PpeItem>(db.ppeItems)
export const equipmentRepo = new BaseRepository<Equipment>(db.equipment)
export const emergencyPlanRepo = new BaseRepository<EmergencyPlan>(db.emergencyPlans)
export const emergencySupplyRepo = new BaseRepository<EmergencySupply>(db.emergencySupplies)
export const emergencyDrillRepo = new BaseRepository<EmergencyDrill>(db.emergencyDrills)
export const accidentRepo = new BaseRepository<AccidentRecord>(db.accidentRecords)
export const safetyCostRepo = new BaseRepository<SafetyCost>(db.safetyCosts)

// v4.1.0 处罚记录仓库
export const penaltyRepo = new BaseRepository<Penalty>(db.penalties)

export class SettingsRepo extends BaseRepository<SettingItem & { id?: string }> {
  async get(key: string): Promise<string | null> {
    const item = await db.settings.get(key)
    return item ? item.value : null
  }

  async set(key: string, value: string): Promise<void> {
    await db.settings.put({ key, value, updatedAt: now() })
  }

  async getObject<T>(key: string, defaultValue: T): Promise<T> {
    const raw = await this.get(key)
    if (!raw) return defaultValue
    try { return JSON.parse(raw) as T } catch { return defaultValue }
  }

  async setObject(key: string, value: unknown): Promise<void> {
    await this.set(key, JSON.stringify(value))
  }
}

export const settingsRepo = new SettingsRepo(db.settings as Table<SettingItem & { id?: string }, string>)
