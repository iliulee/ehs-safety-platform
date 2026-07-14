import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import 'fake-indexeddb/auto'
import { db } from '@/db'
import { trainingService } from '@/services/training.service'
import type {
  Worker,
  TrainingSession,
  TrainingEnrollment,
  AttachmentRecord,
  TrainingScene,
  TrainingType,
  AttachmentCategory,
} from '@/types'

/**
 * v5.0.1 EHS "人-事-证" 服务测试
 *
 * 8 个用例覆盖：
 *   1. 工人 A 做过 3 次教育 → getWorkerHistory 返回 3 条
 *   2. 工人 B 没做过公司级 → getUntrainedWorkers 含 B
 *   3. 体检报告 1 年前上传 → getExpiringCerts 包含
 *   4. 创建 Training + 5 个 TrainingRecord → 联表查 5 条
 *   5. 附件过期时间计算正确
 *   6. 培训完成率统计正确
 *   7. 工人退场后档案仍可查
 *   8. 签字时间戳为空 → 视为未完成
 */

const PROJECT_ID = 'proj-test-001'
const TODAY = new Date()
const TODAY_STR = formatDate(TODAY)

function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function daysAgo(days: number): string {
  const d = new Date(TODAY)
  d.setDate(d.getDate() - days)
  return formatDate(d)
}

function daysLater(days: number): string {
  const d = new Date(TODAY)
  d.setDate(d.getDate() + days)
  return formatDate(d)
}

function daysAgoTs(days: number): number {
  const d = new Date(TODAY)
  d.setDate(d.getDate() - days)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** 测试用工人数据 */
async function seedWorker(name: string, status: Worker['status'] = 'active'): Promise<string> {
  const id = `worker-${name}-${Math.random().toString(36).slice(2, 6)}`
  await db.workers.put({
    id,
    name,
    status,
    projectId: PROJECT_ID,
    idCard: `5329011990010${Math.floor(Math.random() * 10)}000`,
    entryDate: daysAgo(100),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  } as Worker)
  return id
}

/** 测试用培训会话 */
async function seedTraining(
  options: { title: string; type: TrainingType; scene: TrainingScene; date?: string; projectId?: string },
): Promise<string> {
  const id = `training-${Math.random().toString(36).slice(2, 8)}`
  await db.trainingSessions.put({
    id,
    title: options.title,
    type: options.type,
    scene: options.scene,
    date: options.date ?? TODAY_STR,
    projectId: options.projectId ?? PROJECT_ID,
    status: 'completed',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  } as TrainingSession)
  return id
}

/** 测试用报名记录 */
async function seedEnrollment(
  options: {
    trainingId: string
    workerId: string
    workerName: string
    scene: TrainingScene
    signedAt?: number
    enrolledAt?: number
  },
): Promise<string> {
  const id = `enr-${Math.random().toString(36).slice(2, 8)}`
  await db.trainingEnrollments.put({
    id,
    trainingId: options.trainingId,
    workerId: options.workerId,
    workerName: options.workerName,
    scene: options.scene,
    enrolledAt: options.enrolledAt ?? daysAgoTs(30),
    signedAt: options.signedAt,
    examResult: 'pending',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  } as TrainingEnrollment)
  return id
}

describe('training.service (v5.0.1 EHS 人-事-证)', () => {
  beforeEach(async () => {
    // 清空相关表
    await Promise.all([
      db.workers.clear(),
      db.trainingSessions.clear(),
      db.trainingEnrollments.clear(),
      db.attachmentRecords.clear(),
    ])
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('1. 工人 A 做过 3 次教育 → getWorkerHistory 返回 3 条', async () => {
    const workerA = await seedWorker('张三')

    // 创建 3 场不同场景的教育
    const t1 = await seedTraining({ title: '公司级安全教育', type: 'safetyEducation', scene: 'threeLevelCompany', date: daysAgo(90) })
    const t2 = await seedTraining({ title: '项目部级安全教育', type: 'safetyEducation', scene: 'threeLevelProject', date: daysAgo(60) })
    const t3 = await seedTraining({ title: '班组级安全教育', type: 'safetyEducation', scene: 'threeLevelTeam', date: daysAgo(30) })

    // 工人 A 都参加了且签字
    await seedEnrollment({ trainingId: t1, workerId: workerA, workerName: '张三', scene: 'threeLevelCompany', signedAt: daysAgoTs(90) })
    await seedEnrollment({ trainingId: t2, workerId: workerA, workerName: '张三', scene: 'threeLevelProject', signedAt: daysAgoTs(60) })
    await seedEnrollment({ trainingId: t3, workerId: workerA, workerName: '张三', scene: 'threeLevelTeam', signedAt: daysAgoTs(30) })

    const history = await trainingService.getWorkerHistory(workerA)
    expect(history).toHaveLength(3)
    // 按时间倒序：最早的班组级（30 天前）排第一
    expect(history[0].session.title).toBe('班组级安全教育')
    expect(history[2].session.title).toBe('公司级安全教育')
  })

  it('2. 工人 B 没做过公司级 → getUntrainedWorkers 含 B', async () => {
    const workerA = await seedWorker('张三')
    const workerB = await seedWorker('李四')

    // 仅工人 A 做过公司级教育
    const t1 = await seedTraining({ title: '公司级安全教育', type: 'safetyEducation', scene: 'threeLevelCompany' })
    await seedEnrollment({ trainingId: t1, workerId: workerA, workerName: '张三', scene: 'threeLevelCompany', signedAt: daysAgoTs(30) })

    // 工人 B 做过项目部级（不是公司级）
    const t2 = await seedTraining({ title: '项目部级安全教育', type: 'safetyEducation', scene: 'threeLevelProject' })
    await seedEnrollment({ trainingId: t2, workerId: workerB, workerName: '李四', scene: 'threeLevelProject', signedAt: daysAgoTs(20) })

    const untrained = await trainingService.getUntrainedWorkers(PROJECT_ID, 'threeLevelCompany')
    const untrainedIds = untrained.map((w) => w.id)

    expect(untrainedIds).toContain(workerB)
    expect(untrainedIds).not.toContain(workerA)
  })

  it('3. 体检报告即将过期 → getExpiringCerts 包含', async () => {
    const workerA = await seedWorker('张三')

    // 体检报告 1 年前上传，过期日是 20 天后（在 30 天窗口内）
    const expiryDate = daysLater(20)
    await db.attachmentRecords.put({
      id: 'att-1',
      entityType: 'worker',
      entityId: workerA,
      category: 'physicalExamReport' as AttachmentCategory,
      filename: '张三体检报告.pdf',
      mimeType: 'application/pdf',
      size: 102400,
      expiryDate,
      uploadedAt: daysAgoTs(365),
      uploadedBy: '管理员',
      createdAt: daysAgoTs(365),
      updatedAt: daysAgoTs(365),
    } as AttachmentRecord)

    const expiring = await trainingService.getExpiringCerts(30)
    expect(expiring.length).toBeGreaterThanOrEqual(1)
    const target = expiring.find((e) => e.attachment.id === 'att-1')
    expect(target).toBeDefined()
    // 边界容差：因 today 取当天 0 点，可能多算 1 天
    expect(target?.daysUntilExpiry).toBeLessThanOrEqual(21)
    expect(target?.daysUntilExpiry).toBeGreaterThan(15)
    expect(target?.worker?.name).toBe('张三')
  })

  it('4. 创建 Training + 5 个 TrainingRecord → 联表查 5 条', async () => {
    // 先准备 5 个工人
    const workerIds: string[] = []
    for (let i = 0; i < 5; i++) {
      workerIds.push(await seedWorker(`工人${i + 1}`))
    }

    // 用 service 创建培训
    const trainingId = await trainingService.createTraining({
      title: '塔吊作业安全培训',
      type: 'safetyEducation',
      scene: 'adhoc',
      date: TODAY_STR,
      projectId: PROJECT_ID,
      status: 'completed',
      educator: '王老师',
      duration: 60,
    })

    // 批量报名 5 个工人
    const enrollmentIds = await trainingService.enrollWorkers(trainingId, workerIds)
    expect(enrollmentIds).toHaveLength(5)

    // 查这场培训的所有报名记录
    const enrollments = await trainingService.getEnrollments(trainingId)
    expect(enrollments).toHaveLength(5)
    expect(enrollments.map((e) => e.workerId).sort()).toEqual(workerIds.slice().sort())

    // 查每个工人的历史都应该是 1 条
    for (const wid of workerIds) {
      const hist = await trainingService.getWorkerHistory(wid)
      expect(hist).toHaveLength(1)
      expect(hist[0].session.title).toBe('塔吊作业安全培训')
    }
  })

  it('5. 附件过期时间计算正确（边界：刚好 30 天后过期）', async () => {
    const worker = await seedWorker('王五')
    const expiryDate = daysLater(30) // 刚好 30 天后

    await db.attachmentRecords.put({
      id: 'att-2',
      entityType: 'worker',
      entityId: worker,
      category: 'physicalExamReport' as AttachmentCategory,
      filename: '王五体检.pdf',
      mimeType: 'application/pdf',
      size: 1024,
      expiryDate,
      uploadedAt: daysAgoTs(335),
      createdAt: daysAgoTs(335),
      updatedAt: daysAgoTs(335),
    } as AttachmentRecord)

    const expiring = await trainingService.getExpiringCerts(30)
    const target = expiring.find((e) => e.attachment.id === 'att-2')
    expect(target).toBeDefined()
    expect(target?.daysUntilExpiry).toBeGreaterThanOrEqual(29)
    expect(target?.daysUntilExpiry).toBeLessThanOrEqual(31)
  })

  it('6. 培训完成率统计正确（5 人 / 3 完成 → 60%）', async () => {
    // 5 个 active 工人
    const wids: string[] = []
    for (let i = 0; i < 5; i++) wids.push(await seedWorker(`测试${i + 1}`))

    // 1 场公司级教育
    const trainingId = await seedTraining({ title: '公司级教育', type: 'safetyEducation', scene: 'threeLevelCompany' })

    // 前 3 人签字完成
    await seedEnrollment({ trainingId, workerId: wids[0], workerName: '测试1', scene: 'threeLevelCompany', signedAt: daysAgoTs(10) })
    await seedEnrollment({ trainingId, workerId: wids[1], workerName: '测试2', scene: 'threeLevelCompany', signedAt: daysAgoTs(10) })
    await seedEnrollment({ trainingId, workerId: wids[2], workerName: '测试3', scene: 'threeLevelCompany', signedAt: daysAgoTs(10) })

    const stats = await trainingService.getTrainingCompletion(PROJECT_ID, 'threeLevelCompany')
    expect(stats.total).toBe(5)
    expect(stats.completed).toBe(3)
    expect(stats.pending).toBe(2)
    expect(stats.completionRate).toBe(60)
  })

  it('7. 工人退场后档案仍可查', async () => {
    // 创建一个已退场工人
    const leftWorkerId = await seedWorker('赵六', 'left')

    const trainingId = await seedTraining({ title: '入厂教育', type: 'safetyEducation', scene: 'threeLevelCompany', date: daysAgo(200) })
    await seedEnrollment({
      trainingId,
      workerId: leftWorkerId,
      workerName: '赵六',
      scene: 'threeLevelCompany',
      signedAt: daysAgoTs(200),
    })

    // 退场后档案仍可查
    const history = await trainingService.getWorkerHistory(leftWorkerId)
    expect(history).toHaveLength(1)
    expect(history[0].enrollment.workerName).toBe('赵六')
    expect(history[0].session.title).toBe('入厂教育')

    // 退场工人不算"未培训"（因为 getUntrainedWorkers 只统计 active）
    const untrained = await trainingService.getUntrainedWorkers(PROJECT_ID, 'threeLevelCompany')
    expect(untrained.map((w) => w.id)).not.toContain(leftWorkerId)
  })

  it('8. 签字时间戳为空 → 视为未完成', async () => {
    const wids: string[] = []
    for (let i = 0; i < 3; i++) wids.push(await seedWorker(`签字${i + 1}`))

    const trainingId = await seedTraining({ title: '测试培训', type: 'safetyEducation', scene: 'monthly' })

    // 工人 1 已签字，工人 2 未签字，工人 3 没报名
    await seedEnrollment({ trainingId, workerId: wids[0], workerName: '签字1', scene: 'monthly', signedAt: daysAgoTs(5) })
    await seedEnrollment({ trainingId, workerId: wids[1], workerName: '签字2', scene: 'monthly', signedAt: undefined })

    const stats = await trainingService.getTrainingCompletion(PROJECT_ID, 'monthly')
    expect(stats.total).toBe(3)
    expect(stats.completed).toBe(1) // 只有签字1 完成
    expect(stats.pending).toBe(2) // 签字2 未签字 + 签字3 未报名
    expect(stats.completionRate).toBe(33)

    // 工人 2 在"未培训"列表里（未签字视为未完成）
    const untrained = await trainingService.getUntrainedWorkers(PROJECT_ID, 'monthly')
    const untrainedIds = untrained.map((w) => w.id)
    expect(untrainedIds).toContain(wids[1]) // 未签字的工人
    expect(untrainedIds).toContain(wids[2]) // 完全没报名的工人
    expect(untrainedIds).not.toContain(wids[0]) // 已签字的不在未培训列表
  })

  it('9. 签字 + 上传照片：enrollment.signedAt 不空 + signatureBlobId 有值 + attachmentRecord 存在', async () => {
    // 准备：1 个工人 + 1 场培训 + 1 条报名（未签字）
    const workerId = await seedWorker('签字测试')
    const trainingId = await seedTraining({ title: '签字测试培训', type: 'safetyEducation', scene: 'monthly' })
    const enrollmentId = await seedEnrollment({
      trainingId,
      workerId,
      workerName: '签字测试',
      scene: 'monthly',
      signedAt: undefined, // 未签字
    })

    // 调 signWithPhoto（模拟 Base64 图片）
    const fakeBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    const attachmentId = await trainingService.signWithPhoto(enrollmentId, {
      blob: fakeBase64,
      filename: 'signature.png',
      mimeType: 'image/png',
      size: 100,
    })

    // 验证 1：enrollment.signedAt 不空
    const enrollment = await db.trainingEnrollments.get(enrollmentId)
    expect(enrollment?.signedAt).toBeTruthy()
    expect(enrollment?.signedAt).toBeGreaterThan(0)

    // 验证 2：signatureBlobId 有值且等于返回的 attachmentId
    expect(enrollment?.signatureBlobId).toBe(attachmentId)

    // 验证 3：attachmentRecord 存在且字段正确
    const att = await db.attachmentRecords.get(attachmentId)
    expect(att).toBeDefined()
    expect(att?.entityType).toBe('enrollment')
    expect(att?.entityId).toBe(enrollmentId)
    expect(att?.category).toBe('signature')
    expect(att?.blob).toBe(fakeBase64)
    expect(att?.filename).toBe('signature.png')
    expect(att?.mimeType).toBe('image/png')
    expect(att?.size).toBe(100)

    // 验证 4：examResult 默认 exempt（之前是 pending，签字后变 exempt）
    expect(enrollment?.examResult).toBe('exempt')
  })
})
