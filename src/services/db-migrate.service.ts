import { db, generateId, now } from '@/db'
import { EDUCATION_TYPE_TO_SCENE, type TrainingScene, type TrainingType } from '@/types'
import type {
  EducationRecord,
  TrainingRecord,
  TrainingSession,
  TrainingEnrollment,
  AttachmentRecord,
  Attachment,
} from '@/types'

/**
 * v5.0.1 数据迁移服务
 *
 * 把旧表数据迁到新表：
 *   EducationRecord  → TrainingSession + TrainingEnrollment（1 场教育 → 1 session + N enrollment）
 *   TrainingRecord   → TrainingSession + TrainingEnrollment（同上）
 *   散落 attachments[] → AttachmentRecord（按实体类型分类）
 *
 * 迁移策略：
 *   - 旧表数据不删（兼容现有页面）
 *   - 新表数据通过 source 字段标记来源（migration:education / migration:training）
 *   - 同一条旧记录可能被多次迁移，用 sourceId 去重（旧表 id 作为 sourceId 写入新表 id）
 *
 * 幂等性：重复执行迁移不会产生重复数据（基于 sourceId 检查）
 */

const MIGRATED_FLAG = '__v501_migrated__'

/** 旧 EducationRecord.type → 新 TrainingType 映射 */
function mapEducationTypeToTrainingType(oldType?: string): TrainingType {
  if (!oldType) return 'safetyEducation'
  if (/三级|公司|项目|班组/.test(oldType)) return 'safetyEducation'
  if (/交底/.test(oldType)) return 'techDisclosure'
  if (/会议/.test(oldType)) return 'meeting'
  if (/体检/.test(oldType)) return 'physicalExam'
  if (/班前/.test(oldType)) return 'preShift'
  return 'safetyEducation'
}

/** 旧 EducationRecord.type → 新 TrainingScene 映射 */
function mapEducationTypeToScene(oldType?: string): TrainingScene {
  if (!oldType) return 'adhoc'
  // 优先查映射表
  const lower = oldType.toLowerCase()
  if (EDUCATION_TYPE_TO_SCENE[lower]) return EDUCATION_TYPE_TO_SCENE[lower]
  if (EDUCATION_TYPE_TO_SCENE[oldType]) return EDUCATION_TYPE_TO_SCENE[oldType]
  // 兜底：关键词匹配
  if (/公司/.test(oldType)) return 'threeLevelCompany'
  if (/项目/.test(oldType)) return 'threeLevelProject'
  if (/班组/.test(oldType)) return 'threeLevelTeam'
  if (/交底/.test(oldType)) return 'techDisclosure'
  if (/月/.test(oldType)) return 'monthly'
  if (/班前/.test(oldType)) return 'preShift'
  return 'adhoc'
}

/** 旧 TrainingRecord.type → 新 TrainingType 映射 */
function mapTrainingTypeToTrainingType(oldType?: string): TrainingType {
  if (!oldType) return 'skillTraining'
  if (/安全|教育/.test(oldType)) return 'safetyEducation'
  if (/交底/.test(oldType)) return 'techDisclosure'
  if (/会议/.test(oldType)) return 'meeting'
  if (/体检/.test(oldType)) return 'physicalExam'
  if (/班前/.test(oldType)) return 'preShift'
  return 'skillTraining'
}

/** 把日期字符串（YYYY-MM-DD）转为时间戳 */
function dateToTimestamp(dateStr?: string): number {
  if (!dateStr) return now()
  const ts = new Date(dateStr).getTime()
  return Number.isNaN(ts) ? now() : ts
}

/**
 * 检查某条旧记录是否已迁移
 * 通过 settings 表的 MIGRATED_FLAG 记录已迁移的 sourceId 列表
 */
async function isMigrated(sourceTable: string, sourceId: string): Promise<boolean> {
  const key = `${MIGRATED_FLAG}:${sourceTable}:${sourceId}`
  const existing = await db.settings.get(key)
  return !!existing
}

/** 标记某条旧记录已迁移 */
async function markMigrated(sourceTable: string, sourceId: string): Promise<void> {
  const key = `${MIGRATED_FLAG}:${sourceTable}:${sourceId}`
  await db.settings.put({ key, value: '1', updatedAt: now() })
}

/**
 * 迁移单条 EducationRecord
 * 1 条教育记录 → 1 条 TrainingSession + N 条 TrainingEnrollment（N = attendeeIds 长度）
 */
async function migrateEducationRecord(record: EducationRecord): Promise<void> {
  if (record.id && await isMigrated('educationRecords', record.id)) return

  const scene = mapEducationTypeToScene(record.type)
  const type = mapEducationTypeToTrainingType(record.type)

  // 1. 创建 TrainingSession
  const sessionId = generateId()
  const session: TrainingSession = {
    id: sessionId,
    title: record.title,
    type,
    scene,
    date: record.date,
    duration: record.duration,
    educator: record.educator,
    location: record.location,
    content: record.content,
    projectId: record.projectId,
    status: 'completed',
    createdAt: record.createdAt ?? now(),
    updatedAt: now(),
  }
  await db.trainingSessions.put(session)

  // 2. 为每个参会工人创建 TrainingEnrollment
  const attendeeIds = record.attendeeIds ?? []
  for (const workerId of attendeeIds) {
    const enrollmentId = generateId()
    const enrollment: TrainingEnrollment = {
      id: enrollmentId,
      trainingId: sessionId,
      workerId,
      workerName: '', // 待 workerService 回填，或不依赖此字段
      scene,
      enrolledAt: dateToTimestamp(record.date),
      signedAt: dateToTimestamp(record.date), // 旧数据视为已签字
      examResult: 'exempt', // 旧数据无考试结果，标记为免考
      exemptReason: '历史数据迁移',
      createdAt: record.createdAt ?? now(),
      updatedAt: now(),
    }
    await db.trainingEnrollments.put(enrollment)
  }

  // 3. 迁移 attachments（如有）
  if (record.attachments && record.attachments.length > 0) {
    for (const att of record.attachments) {
      await migrateAttachment(att, 'training', sessionId, 'trainingMaterial')
    }
  }

  if (record.id) await markMigrated('educationRecords', record.id)
}

/**
 * 迁移单条 TrainingRecord（旧表）
 * 1 条培训记录 → 1 条 TrainingSession + N 条 TrainingEnrollment
 */
async function migrateTrainingRecord(record: TrainingRecord): Promise<void> {
  if (record.id && await isMigrated('trainingRecords', record.id)) return

  const scene: TrainingScene = 'adhoc' // 旧培训表无场景字段，统一标为临时
  const type = mapTrainingTypeToTrainingType(record.type)

  const sessionId = generateId()
  const session: TrainingSession = {
    id: sessionId,
    title: record.title,
    type,
    scene,
    date: record.date,
    duration: record.duration,
    educator: record.trainer,
    location: record.location,
    content: record.content,
    projectId: record.projectId,
    status: 'completed',
    createdAt: record.createdAt ?? now(),
    updatedAt: now(),
  }
  await db.trainingSessions.put(session)

  const attendeeIds = record.attendeeIds ?? []
  for (const workerId of attendeeIds) {
    const enrollmentId = generateId()
    const enrollment: TrainingEnrollment = {
      id: enrollmentId,
      trainingId: sessionId,
      workerId,
      workerName: '',
      scene,
      enrolledAt: dateToTimestamp(record.date),
      signedAt: dateToTimestamp(record.date),
      examResult: record.assessmentResult === 'pass' ? 'pass'
        : record.assessmentResult === 'fail' ? 'fail'
        : 'exempt',
      exemptReason: record.assessmentResult ? undefined : '历史数据迁移',
      createdAt: record.createdAt ?? now(),
      updatedAt: now(),
    }
    await db.trainingEnrollments.put(enrollment)
  }

  if (record.attachments && record.attachments.length > 0) {
    for (const att of record.attachments) {
      await migrateAttachment(att, 'training', sessionId, 'trainingMaterial')
    }
  }

  if (record.id) await markMigrated('trainingRecords', record.id)
}

/**
 * 把单个旧 Attachment 转为 AttachmentRecord 并写入
 */
async function migrateAttachment(
  att: Attachment,
  entityType: string,
  entityId: string,
  category: AttachmentRecord['category'],
): Promise<void> {
  if (!att.url) return
  const record: AttachmentRecord = {
    id: generateId(),
    entityType,
    entityId,
    category,
    filename: att.name,
    mimeType: att.type ?? 'application/octet-stream',
    size: att.size ?? 0,
    uploadedAt: now(),
  }
  await db.attachmentRecords.put(record)
}

export interface MigrationResult {
  educationCount: number
  trainingCount: number
  attachmentCount: number
  skipped: number
  errors: string[]
}

/**
 * 执行全量迁移
 * 幂等：重复执行不会产生重复数据
 */
export async function migrateAll(): Promise<MigrationResult> {
  const result: MigrationResult = {
    educationCount: 0,
    trainingCount: 0,
    attachmentCount: 0,
    skipped: 0,
    errors: [],
  }

  // 1. 迁移 EducationRecord
  try {
    const educationRecords = await db.educationRecords.toArray()
    for (const record of educationRecords) {
      try {
        if (record.id && await isMigrated('educationRecords', record.id)) {
          result.skipped++
          continue
        }
        await migrateEducationRecord(record)
        result.educationCount++
      } catch (err) {
        result.errors.push(`educationRecord ${record.id}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  } catch (err) {
    result.errors.push(`educationRecords 表读取失败: ${err instanceof Error ? err.message : String(err)}`)
  }

  // 2. 迁移 TrainingRecord
  try {
    const trainingRecords = await db.trainingRecords.toArray()
    for (const record of trainingRecords) {
      try {
        if (record.id && await isMigrated('trainingRecords', record.id)) {
          result.skipped++
          continue
        }
        await migrateTrainingRecord(record)
        result.trainingCount++
      } catch (err) {
        result.errors.push(`trainingRecord ${record.id}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  } catch (err) {
    result.errors.push(`trainingRecords 表读取失败: ${err instanceof Error ? err.message : String(err)}`)
  }

  return result
}

/**
 * 回填 TrainingEnrollment.workerName
 * 迁移时 workerName 留空，这里从 workers 表批量查回填
 */
export async function backfillWorkerNames(): Promise<number> {
  let count = 0
  const enrollments = await db.trainingEnrollments.toArray()
  const workerIds = Array.from(new Set(enrollments.map((e) => e.workerId).filter(Boolean)))
  if (workerIds.length === 0) return 0

  const workers = await db.workers.bulkGet(workerIds)
  const workerMap = new Map<string, string>()
  workers.forEach((w) => {
    if (w?.id && w.name) workerMap.set(w.id, w.name)
  })

  for (const enrollment of enrollments) {
    if (enrollment.workerName) continue // 已有名字，跳过
    const name = workerMap.get(enrollment.workerId)
    if (name) {
      await db.trainingEnrollments.update(enrollment.id!, { workerName: name, updatedAt: now() })
      count++
    }
  }
  return count
}
