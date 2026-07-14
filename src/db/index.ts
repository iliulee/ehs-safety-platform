import Dexie, { type Table } from 'dexie'
import type {
  Project,
  Subcontractor,
  Worker,
  Certificate,
  EducationRecord,
  TrainingRecord,
  DailyLog,
  Hazard,
  HazardSource,
  DangerousProject,
  WorkPermit,
  Acceptance,
  Meeting,
  Correspondence,
  Template,
  CategoryRecord,
  AiChatMessage,
  AiSession,
  KnowledgeItem,
  KnowledgeDocument,
  KnowledgeChunk,
  AiGeneration,
  DictItem,
  SettingItem,
  PpeItem,
  Equipment,
  EmergencyPlan,
  EmergencySupply,
  EmergencyDrill,
  AccidentRecord,
  SafetyCost,
  Penalty,
  TrainingSession,
  TrainingEnrollment,
  AttachmentRecord,
} from '@/types'

export class ZhianDB extends Dexie {
  projects!: Table<Project, string>
  subcontractors!: Table<Subcontractor, string>
  workers!: Table<Worker, string>
  certificates!: Table<Certificate, string>
  educationRecords!: Table<EducationRecord, string>
  trainingRecords!: Table<TrainingRecord, string>
  dailyLogs!: Table<DailyLog, string>
  hazards!: Table<Hazard, string>
  hazardSources!: Table<HazardSource, string>
  dangerousProjects!: Table<DangerousProject, string>
  workPermits!: Table<WorkPermit, string>
  acceptances!: Table<Acceptance, string>
  meetings!: Table<Meeting, string>
  correspondences!: Table<Correspondence, string>
  categories!: Table<CategoryRecord, string>
  templates!: Table<Template, string>
  aiChatMessages!: Table<AiChatMessage, string>
  aiSessions!: Table<AiSession, string>
  knowledgeItems!: Table<KnowledgeItem, string>
  knowledgeDocuments!: Table<KnowledgeDocument, string>
  knowledgeChunks!: Table<KnowledgeChunk, string>
  aiGenerations!: Table<AiGeneration, string>
  dictItems!: Table<DictItem, string>
  settings!: Table<SettingItem, string>
  // v4.0 新增
  ppeItems!: Table<PpeItem, string>
  equipment!: Table<Equipment, string>
  emergencyPlans!: Table<EmergencyPlan, string>
  emergencySupplies!: Table<EmergencySupply, string>
  emergencyDrills!: Table<EmergencyDrill, string>
  accidentRecords!: Table<AccidentRecord, string>
  safetyCosts!: Table<SafetyCost, string>
  // v4.1.0 处罚记录表
  penalties!: Table<Penalty, string>
  // v5.0.1 EHS "人-事-证" 重构表
  trainingSessions!: Table<TrainingSession, string>
  trainingEnrollments!: Table<TrainingEnrollment, string>
  attachmentRecords!: Table<AttachmentRecord, string>

  constructor() {
    super('liuge_safety')

    this.version(1).stores({
      projects: '&id, name, code, status, createdAt',
      subcontractors: '&id, name, code, status, projectId, createdAt',
      workers: '&id, name, idCard, workType, subcontractorId, projectId, status, entryDate, createdAt',
      certificates: '&id, workerId, certType, expiryDate, createdAt',
      educationRecords: '&id, date, type, projectId, createdAt',
      trainingRecords: '&id, date, type, projectId, createdAt',
      dailyLogs: '&id, date, projectId, recorder, createdAt',
      hazards: '&id, level, category, status, projectId, rectifyDeadline, reporterId, createdAt',
      hazardSources: '&id, category, level, status, projectId, responsiblePersonId, createdAt',
      dangerousProjects: '&id, category, level, status, projectId, startDate, endDate, createdAt',
      workPermits: '&id, type, status, projectId, applicantId, startTime, endTime, createdAt',
      acceptances: '&id, type, date, result, projectId, createdAt',
      meetings: '&id, type, date, projectId, host, createdAt',
      correspondences: '&id, direction, type, date, docNumber, projectId, status, createdAt',
      templates: '&id, name, category, type, isBuiltIn, createdAt',
      aiChatMessages: '&id, sessionId, role, timestamp, createdAt',
      aiSessions: '&id, lastMessageAt, createdAt',
      knowledgeItems: '&id, title, category, source, isBuiltIn, createdAt',
      aiGenerations: '&id, type, status, projectId, templateId, createdAt',
      dictItems: '&id, category, code, enabled, sortOrder, createdAt',
      settings: '&key, createdAt',
    })

    this.version(2).stores({
      categories: '&id, code, parentId, sortOrder, [parentId+sortOrder], isBuiltIn',
      templates:
        '&id, name, category, categoryId, type, isBuiltIn, fileType, contentType, createdAt, [name+fileSize+categoryId]',
    })

    this.version(3).stores({
      projects: '&id, name, code, status, createdAt',
    })

    this.version(4).upgrade((tx) => {
      tx.table('categories').clear()
      tx.table('templates').clear()
    })

    this.version(5).stores({
      knowledgeDocuments: '&id, title, category, fileType, isBuiltIn, importStatus, createdAt',
      knowledgeChunks: '&id, docId, chunkIndex, category, isBuiltIn, createdAt, [docId+chunkIndex]',
    }).upgrade(() => {
      // 旧的 knowledgeItems 数据保留，新RAG系统走新表
    })

    // v4.0 新增 6 个模块表
    this.version(6).stores({
      ppeItems: '&id, name, category, status, projectId, createdAt',
      equipment: '&id, name, category, status, projectId, entryDate, createdAt',
      emergencyPlans: '&id, name, category, projectId, createdAt',
      emergencySupplies: '&id, name, category, status, projectId, expiryDate, createdAt',
      emergencyDrills: '&id, title, drillType, date, projectId, createdAt',
      accidentRecords: '&id, title, accidentType, severity, occurrenceDate, status, projectId, createdAt',
      safetyCosts: '&id, date, category, projectId, createdAt',
    })

    // v4.1.0 新增处罚记录表，扩展日报 items 字段（可选，无需重建索引）
    this.version(7).stores({
      penalties: '&id, date, projectId, status, createdAt',
    })

    // v5.0 Day 2 收尾：Equipment 新增 code/manufacturer/manufactureLicense/ratedTorque 4 个字段
    // 新增 code 索引用于按设备编号查询；其他 3 个字段无独立查询需求，不加索引
    this.version(8).stores({
      equipment: '&id, name, category, status, projectId, entryDate, code, createdAt',
    })

    // v5.0.1 EHS "人-事-证" 重构：新建 3 张表
    // trainingSessions: 培训/教育会话主表
    // trainingEnrollments: 人-事关联（含签字时间戳、考试结果）
    // attachmentRecords: 统一附件表（含过期管理）
    // 迁移：旧 EducationRecord + TrainingRecord 数据 → 新表（迁移函数在 services/db-migrate.ts）
    this.version(9).stores({
      trainingSessions: '&id, type, scene, date, projectId, status, createdAt',
      trainingEnrollments: '&id, trainingId, workerId, scene, enrolledAt, signedAt, [trainingId+workerId], createdAt',
      attachmentRecords: '&id, entityType, entityId, category, expiryDate, uploadedAt, [entityType+entityId], [entityType+category]',
    })
  }
}

export const db = new ZhianDB()

export function generateId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

export function now(): number {
  return Date.now()
}
