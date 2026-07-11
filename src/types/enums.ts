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
