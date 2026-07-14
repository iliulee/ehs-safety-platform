export type ProjectStatus = 'pending' | 'active' | 'paused' | 'completed'

export type HazardLevel = 'general' | 'major' | 'serious'
export type HazardStatus = 'pending' | 'rectifying' | 'reviewing' | 'closed' | 'overdue'

export type RiskLevel = 1 | 2 | 3 | 4

export type DangerousProjectLevel = 'normal' | 'over_scale'

export type WorkPermitType = 'hot_work' | 'height_work' | 'confined_space' | 'temp_electric' | 'lifting' | 'excavation' | 'blasting' | 'other'
export type PermitStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'expired' | 'closed'

export type AcceptanceResult = 'pass' | 'fail' | 'conditional'

export type CorrespondenceDirection = 'incoming' | 'outgoing'
export type CorrespondenceStatus = 'draft' | 'sent' | 'received' | 'replied' | 'archived'

export type WorkerStatus = 'active' | 'left' | 'suspended'

export type SubcontractorStatus = 'cooperating' | 'suspended' | 'terminated'

export type AiRole = 'user' | 'assistant'

export type DictCategory =
  | 'hazard_category'
  | 'work_type'
  | 'cert_type'
  | 'education_type'
  | 'training_type'
  | 'permit_type'
  | 'acceptance_type'
  | 'meeting_type'
  | 'correspondence_type'
  | 'danger_category'
  | 'risk_level'
  | 'log_weather'

// ===== v5.0.1 EHS "人-事-证" 重构枚举 =====

/**
 * 培训/教育类型（统一"事"的分类）
 * - safetyEducation: 安全教育（含三级安全教育）
 * - techDisclosure: 技术交底
 * - meeting: 安全会议
 * - skillTraining: 技能培训
 * - physicalExam: 体检
 * - preShift: 班前教育
 */
export type TrainingType =
  | 'safetyEducation'
  | 'techDisclosure'
  | 'meeting'
  | 'skillTraining'
  | 'physicalExam'
  | 'preShift'

/**
 * 培训场景（"事"发生的具体场景，对应 EHS 三级教育 + 日常场景）
 * - threeLevelCompany: 三级安全教育-公司级
 * - threeLevelProject: 三级安全教育-项目部级
 * - threeLevelTeam: 三级安全教育-班组级
 * - techDisclosure: 技术交底
 * - monthly: 月度教育
 * - adhoc: 临时教育
 * - preShift: 班前教育
 */
export type TrainingScene =
  | 'threeLevelCompany'
  | 'threeLevelProject'
  | 'threeLevelTeam'
  | 'techDisclosure'
  | 'monthly'
  | 'adhoc'
  | 'preShift'

/**
 * 附件分类（统一"痕迹"的分类）
 * - idCardFront/idCardBack: 身份证正反面
 * - signature: 签字照片
 * - physicalExamReport: 体检报告
 * - certificatePhoto: 证书照片
 * - certificatePdf: 证书 PDF
 * - trainingMaterial: 培训材料
 * - trainingPhoto: 培训现场照片
 * - equipmentPhoto: 设备照片
 * - equipmentLicense: 设备许可证
 * - rectifyPhoto: 整改照片
 * - other: 其他
 */
export type AttachmentCategory =
  | 'idCardFront'
  | 'idCardBack'
  | 'signature'
  | 'physicalExamReport'
  | 'certificatePhoto'
  | 'certificatePdf'
  | 'trainingMaterial'
  | 'trainingPhoto'
  | 'equipmentPhoto'
  | 'equipmentLicense'
  | 'rectifyPhoto'
  | 'other'

/** 培训/教育类型中文标签 */
export const TRAINING_TYPE_LABELS: Record<TrainingType, string> = {
  safetyEducation: '安全教育',
  techDisclosure: '技术交底',
  meeting: '安全会议',
  skillTraining: '技能培训',
  physicalExam: '体检',
  preShift: '班前教育',
}

/** 培训场景中文标签 */
export const TRAINING_SCENE_LABELS: Record<TrainingScene, string> = {
  threeLevelCompany: '公司级教育',
  threeLevelProject: '项目部级教育',
  threeLevelTeam: '班组级教育',
  techDisclosure: '技术交底',
  monthly: '月度教育',
  adhoc: '临时教育',
  preShift: '班前教育',
}

/** 附件分类中文标签 */
export const ATTACHMENT_CATEGORY_LABELS: Record<AttachmentCategory, string> = {
  idCardFront: '身份证正面',
  idCardBack: '身份证反面',
  signature: '签字照片',
  physicalExamReport: '体检报告',
  certificatePhoto: '证书照片',
  certificatePdf: '证书 PDF',
  trainingMaterial: '培训材料',
  trainingPhoto: '培训现场照片',
  equipmentPhoto: '设备照片',
  equipmentLicense: '设备许可证',
  rectifyPhoto: '整改照片',
  other: '其他',
}

/**
 * 旧 EducationRecord.type → 新 TrainingScene 映射
 * 用于数据迁移
 */
export const EDUCATION_TYPE_TO_SCENE: Record<string, TrainingScene> = {
  'company': 'threeLevelCompany',
  'project': 'threeLevelProject',
  'team': 'threeLevelTeam',
  'monthly': 'monthly',
  'adhoc': 'adhoc',
  'preShift': 'preShift',
  // 兜底
  '三级教育': 'threeLevelCompany',
  '公司级': 'threeLevelCompany',
  '项目级': 'threeLevelProject',
  '班组级': 'threeLevelTeam',
}

export const STATUS_LABELS: Record<string, string> = {
  pending: '待处理',
  active: '进行中',
  paused: '已暂停',
  completed: '已完成',
  rectifying: '整改中',
  reviewing: '复查中',
  closed: '已闭环',
  overdue: '已逾期',
  cooperating: '合作中',
  suspended: '已暂停',
  terminated: '已终止',
  left: '已离场',
  draft: '草稿',
  pending_approval: '待审批',
  approved: '已批准',
  rejected: '已驳回',
  expired: '已过期',
  pass: '合格',
  fail: '不合格',
  conditional: '附条件合格',
  incoming: '收文',
  outgoing: '发文',
  sent: '已发送',
  received: '已接收',
  replied: '已回复',
  archived: '已归档',
  general: '一般隐患',
  major: '较大隐患',
  serious: '重大隐患',
}

export const LEVEL_LABELS: Record<number, string> = {
  1: '一级（重大风险）',
  2: '二级（较大风险）',
  3: '三级（一般风险）',
  4: '四级（低风险）',
}
