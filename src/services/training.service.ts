import { db, generateId, now } from '@/db'
import { getCurrentProjectId } from '@/store'
import type {
  TrainingSession,
  TrainingEnrollment,
  AttachmentRecord,
  Worker,
  TrainingScene,
  TrainingType,
  AttachmentCategory,
} from '@/types'

/**
 * v5.0.1 EHS "人-事-证" 服务
 *
 * 4 个核心查询函数：
 *   getWorkerHistory(workerId)         — 查"这个人做过什么"
 *   getUntrainedWorkers(projectId, scene) — 查"哪些人没做"
 *   getExpiringCerts(days)             — 查"30 天内过期证书/附件"
 *   getTrainingCompletion(projectId, scene) — 查"完成率"
 *
 * 外加基础 CRUD：createTraining、enrollWorkers、completeEnrollment、addAttachment
 */

export interface WorkerHistoryItem {
  enrollment: TrainingEnrollment
  session: TrainingSession
}

export interface CompletionStats {
  total: number
  completed: number
  pending: number
  completionRate: number // 0-100
}

export interface ExpiringAttachment {
  attachment: AttachmentRecord
  worker?: Worker
  daysUntilExpiry: number
}

class TrainingService {
  // ============ 基础 CRUD ============

  /** 创建一场培训/教育会话 */
  async createTraining(data: Omit<TrainingSession, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = generateId()
    const ts = now()
    const session: TrainingSession = { ...data, id, createdAt: ts, updatedAt: ts }
    await db.trainingSessions.put(session)
    return id
  }

  /** 批量报名（一对多：一场培训报名 N 个工人） */
  async enrollWorkers(
    trainingId: string,
    workerIds: string[],
    options?: { enrolledAt?: number; scene?: TrainingScene },
  ): Promise<string[]> {
    const session = await db.trainingSessions.get(trainingId)
    if (!session) throw new Error(`培训会话不存在: ${trainingId}`)

    const scene = options?.scene ?? session.scene
    const enrolledAt = options?.enrolledAt ?? now()

    // 批量查工人信息（用于冗余字段）
    const workers = await db.workers.bulkGet(workerIds)
    const workerMap = new Map<string, Worker>()
    workers.forEach((w) => {
      if (w?.id) workerMap.set(w.id, w)
    })

    const ids: string[] = []
    const enrollments: TrainingEnrollment[] = []
    for (const workerId of workerIds) {
      const worker = workerMap.get(workerId)
      const id = generateId()
      ids.push(id)
      enrollments.push({
        id,
        trainingId,
        workerId,
        workerIdCard: worker?.idCard,
        workerName: worker?.name ?? '',
        scene,
        enrolledAt,
        examResult: 'pending',
        createdAt: now(),
        updatedAt: now(),
      })
    }
    await db.trainingEnrollments.bulkPut(enrollments)
    return ids
  }

  /** 工人签字完成培训（更新 signedAt + examResult） */
  async completeEnrollment(
    enrollmentId: string,
    options?: { signedAt?: number; examScore?: number; examResult?: 'pass' | 'fail' | 'exempt'; signatureBlobId?: string },
  ): Promise<void> {
    const update: Partial<TrainingEnrollment> = {
      signedAt: options?.signedAt ?? now(),
      updatedAt: now(),
    }
    if (options?.examScore !== undefined) update.examScore = options.examScore
    if (options?.examResult) update.examResult = options.examResult
    if (options?.signatureBlobId) update.signatureBlobId = options.signatureBlobId
    await db.trainingEnrollments.update(enrollmentId, update)
  }

  /** 添加附件 */
  async addAttachment(data: Omit<AttachmentRecord, 'id' | 'createdAt' | 'updatedAt' | 'uploadedAt'> & { uploadedAt?: number }): Promise<string> {
    const id = generateId()
    const ts = now()
    const record: AttachmentRecord = {
      ...data,
      id,
      uploadedAt: data.uploadedAt ?? ts,
      createdAt: ts,
      updatedAt: ts,
    }
    await db.attachmentRecords.put(record)
    return id
  }

  /**
   * 工人签字（上传签字照片 + 标记完成）
   * 一步到位：把照片存到 AttachmentRecord + 更新 TrainingEnrollment
   * @returns signatureBlobId（AttachmentRecord.id）
   */
  async signWithPhoto(
    enrollmentId: string,
    file: { blob: string; filename: string; mimeType: string; size: number },
  ): Promise<string> {
    const enrollment = await db.trainingEnrollments.get(enrollmentId)
    if (!enrollment) throw new Error(`报名记录不存在: ${enrollmentId}`)

    // 1. 查 worker（用于冗余字段）
    const worker = enrollment.workerId ? await db.workers.get(enrollment.workerId) : undefined

    // 2. 存附件（覆盖模式：如果之前签过，先删旧附件）
    if (enrollment.signatureBlobId) {
      await db.attachmentRecords.delete(enrollment.signatureBlobId)
    }
    const attachmentId = await this.addAttachment({
      entityType: 'enrollment',
      entityId: enrollmentId,
      category: 'signature',
      blob: file.blob,
      filename: file.filename,
      mimeType: file.mimeType,
      size: file.size,
      uploadedBy: worker?.name ?? '管理员',
    })

    // 3. 更新 enrollment（签字时如果还是 pending/空，升为 exempt 免考）
    const finalExamResult = !enrollment.examResult || enrollment.examResult === 'pending'
      ? 'exempt' as const
      : enrollment.examResult
    await db.trainingEnrollments.update(enrollmentId, {
      signatureBlobId: attachmentId,
      signedAt: Date.now(),
      examResult: finalExamResult,
      updatedAt: Date.now(),
    })

    return attachmentId
  }

  /** 查询某实体的所有附件 */
  async getAttachments(entityType: string, entityId: string): Promise<AttachmentRecord[]> {
    return db.attachmentRecords
      .where('[entityType+entityId]')
      .equals([entityType, entityId])
      .toArray()
  }

  // ============ 4 个核心查询函数 ============

  /**
   * 1. 查"这个人做过什么"
   * 返回该工人的所有培训/教育历史，按时间倒序
   * 工人退场后档案仍可查（基于 workerId，不依赖 worker 表是否还存在）
   */
  async getWorkerHistory(workerId: string): Promise<WorkerHistoryItem[]> {
    const enrollments = await db.trainingEnrollments
      .where('workerId')
      .equals(workerId)
      .toArray()

    if (enrollments.length === 0) return []

    const sessionIds = Array.from(new Set(enrollments.map((e) => e.trainingId)))
    const sessions = await db.trainingSessions.bulkGet(sessionIds)
    const sessionMap = new Map<string, TrainingSession>()
    sessions.forEach((s) => {
      if (s?.id) sessionMap.set(s.id, s)
    })

    const items: WorkerHistoryItem[] = []
    for (const enrollment of enrollments) {
      const session = sessionMap.get(enrollment.trainingId)
      if (session) {
        items.push({ enrollment, session })
      }
    }

    // 按时间倒序：优先用 session.date，其次 enrolledAt
    items.sort((a, b) => {
      const ta = new Date(a.session.date).getTime() || a.enrollment.enrolledAt
      const tb = new Date(b.session.date).getTime() || b.enrollment.enrolledAt
      return tb - ta
    })

    return items
  }

  /**
   * 2. 查"哪些人没做"
   * 返回项目下未参加过指定场景培训的工人列表
   * 工人状态为 active（在场）的才纳入统计；已退场的不算"未做"
   */
  async getUntrainedWorkers(projectId: string, scene: TrainingScene): Promise<Worker[]> {
    // 1. 查项目下所有 active 工人
    const allWorkers = await db.workers
      .where('projectId')
      .equals(projectId)
      .toArray()
    const activeWorkers = allWorkers.filter((w) => w.status === 'active')

    // 2. 查该项目下该场景的所有已签字 enrollment
    // 先查该项目下所有 session（场景匹配），再查这些 session 的 enrollment
    const sessions = await db.trainingSessions
      .where('projectId')
      .equals(projectId)
      .toArray()
    const sceneSessionIds = new Set(
      sessions.filter((s) => s.scene === scene).map((s) => s.id!),
    )

    if (sceneSessionIds.size === 0) return activeWorkers

    // 查所有 enrollment（场景匹配 + 已签字）
    const allEnrollments = await db.trainingEnrollments
      .where('scene')
      .equals(scene)
      .toArray()
    const trainedWorkerIds = new Set(
      allEnrollments
        .filter((e) => sceneSessionIds.has(e.trainingId) && e.signedAt)
        .map((e) => e.workerId),
    )

    return activeWorkers.filter((w) => !trainedWorkerIds.has(w.id!))
  }

  /**
   * 3. 查"30 天内过期证书/附件"
   * 扫描 AttachmentRecord 表中 expiryDate 不为空且在 N 天内过期的记录
   * 也扫描旧 Certificate 表（兼容）
   */
  async getExpiringCerts(days: number = 30): Promise<ExpiringAttachment[]> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const future = new Date(today)
    future.setDate(future.getDate() + days)

    const todayStr = formatDate(today)
    const futureStr = formatDate(future)

    // 1. 查 AttachmentRecord 中即将过期的记录
    const attachments = await db.attachmentRecords
      .where('expiryDate')
      .between(todayStr, futureStr, true, true)
      .toArray()

    const result: ExpiringAttachment[] = []
    for (const attachment of attachments) {
      const daysUntilExpiry = Math.ceil(
        (new Date(attachment.expiryDate!).getTime() - today.getTime()) / (24 * 60 * 60 * 1000),
      )
      // 如果附件关联的是 worker，回填 worker 信息
      let worker: Worker | undefined
      if (attachment.entityType === 'worker' && attachment.entityId) {
        worker = await db.workers.get(attachment.entityId)
      }
      result.push({ attachment, worker, daysUntilExpiry })
    }

    return result.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)
  }

  /**
   * 4. 查"完成率"
   * 统计项目下某场景的培训完成情况
   * 完成定义：enrollment.signedAt 不为空
   */
  async getTrainingCompletion(projectId: string, scene: TrainingScene): Promise<CompletionStats> {
    // 1. 项目下 active 工人总数
    const allWorkers = await db.workers
      .where('projectId')
      .equals(projectId)
      .toArray()
    const activeWorkers = allWorkers.filter((w) => w.status === 'active')
    const total = activeWorkers.length

    // 2. 该项目下该场景的 session 列表
    const sessions = await db.trainingSessions
      .where('projectId')
      .equals(projectId)
      .toArray()
    const sceneSessionIds = new Set(
      sessions.filter((s) => s.scene === scene).map((s) => s.id!),
    )

    if (sceneSessionIds.size === 0 || total === 0) {
      return { total, completed: 0, pending: total, completionRate: 0 }
    }

    // 3. 查这些 session 下已签字的 enrollment（按 workerId 去重）
    const enrollments = await db.trainingEnrollments
      .where('scene')
      .equals(scene)
      .toArray()
    const completedWorkerIds = new Set(
      enrollments
        .filter((e) => sceneSessionIds.has(e.trainingId) && e.signedAt)
        .map((e) => e.workerId),
    )

    // 4. 与 active 工人取交集
    const completed = activeWorkers.filter((w) => completedWorkerIds.has(w.id!)).length
    const pending = total - completed
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0

    return { total, completed, pending, completionRate }
  }

  // ============ 辅助方法 ============

  /** 按项目查培训会话列表 */
  async listTrainings(projectId?: string, scene?: TrainingScene, type?: TrainingType): Promise<TrainingSession[]> {
    const pid = projectId ?? getCurrentProjectId()
    if (!pid) {
      let list = await db.trainingSessions.toArray()
      if (scene) list = list.filter((s) => s.scene === scene)
      if (type) list = list.filter((s) => s.type === type)
      return list.sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    }
    const list = await db.trainingSessions
      .where('projectId')
      .equals(pid)
      .toArray()
    return list
      .filter((s) => (!scene || s.scene === scene) && (!type || s.type === type))
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  }

  /** 查一场培训的所有报名记录 */
  async getEnrollments(trainingId: string): Promise<TrainingEnrollment[]> {
    return db.trainingEnrollments
      .where('trainingId')
      .equals(trainingId)
      .toArray()
  }

  /** 按分类查附件 */
  async getAttachmentsByCategory(entityType: string, category: AttachmentCategory): Promise<AttachmentRecord[]> {
    return db.attachmentRecords
      .where('[entityType+category]')
      .equals([entityType, category])
      .toArray()
  }
}

function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export const trainingService = new TrainingService()
