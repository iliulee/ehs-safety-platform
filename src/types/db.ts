import type {
  ProjectStatus,
  HazardLevel,
  HazardStatus,
  RiskLevel,
  DangerousProjectLevel,
  WorkPermitType,
  PermitStatus,
  AcceptanceResult,
  CorrespondenceDirection,
  CorrespondenceStatus,
  WorkerStatus,
  SubcontractorStatus,
  AiRole,
  DictCategory,
  TrainingType,
  TrainingScene,
  AttachmentCategory,
} from './enums'

export interface BaseEntity {
  id?: string
  createdAt?: number
  updatedAt?: number
}

export interface Project extends BaseEntity {
  name: string
  code?: string
  location?: string
  startDate?: string
  endDate?: string
  status: ProjectStatus
  contractor?: string
  supervisor?: string
  owner?: string
  managerName?: string
  techDirector?: string
  description?: string
  safetyOfficer?: string
  safetyOfficerPhone?: string
  extraFields?: Record<string, string>
}

export interface Subcontractor extends BaseEntity {
  name: string
  code?: string
  qualifier?: string
  contactPerson: string
  contactPhone: string
  status: SubcontractorStatus
  scopeOfWork?: string
  projectId?: string
  qualificationExpiry?: string
}

export interface Worker extends BaseEntity {
  name: string
  gender?: 'male' | 'female'
  nation?: string
  idCard?: string
  phone?: string
  workType?: string
  subcontractorId?: string
  projectId?: string
  status: WorkerStatus
  entryDate?: string
  exitDate?: string
  avatar?: string
  address?: string
  emergencyContact?: string
  emergencyPhone?: string
  remark?: string
}

export interface Certificate extends BaseEntity {
  workerId: string
  certType: string
  certNumber?: string
  issueDate?: string
  expiryDate?: string
  issueAuthority?: string
  attachmentUrl?: string
}

export interface EducationRecord extends BaseEntity {
  title: string
  type?: string
  date: string
  educator?: string
  attendeeIds: string[]
  content?: string
  projectId?: string
  attachments?: Attachment[]
  duration?: number
  location?: string
}

export interface TrainingRecord extends BaseEntity {
  title: string
  type?: string
  trainer?: string
  date: string
  duration?: number
  attendeeIds: string[]
  content?: string
  projectId?: string
  assessmentResult?: 'pass' | 'fail' | 'pending'
  attachments?: Attachment[]
  location?: string
}

export interface DailyReportItem {
  id: string
  type: 'hazard' | 'education' | 'training' | 'penalty' | 'workContent' | 'custom'
  title: string
  data: Record<string, unknown>
  inherited: boolean
  modified: boolean
  sourceDate?: string
}

/** 结构化日报表单数据（用于双通道输入/键盘兜底） */
export interface DailyReportFormData {
  date: string
  weather: string
  workContent: string
  hazards: Array<{
    id: string
    title: string
    level: string
    measure: string
    status: 'pending' | 'rectifying' | 'closed'
  }>
  hasEducation: boolean
  educationTopic: string
  educationAttendees: string
  hasPenalty: boolean
  penaltyUnit: string
  penaltyAmount: string
  penaltyReason: string
  hasTraining: boolean
  trainingTopic: string
  trainingOrganizer: string
  hasNewWorker: boolean
  newWorkerCount: string
  newWorkerNames: string
}

/** 结构化日报提交数据 */
export interface DailyReportSubmitData {
  dailyLog: Omit<DailyLog, 'id' | 'createdAt' | 'updatedAt'>
  manualValues: Record<string, string>
}

export interface DailyLog extends BaseEntity {
  date: string
  projectId?: string
  weather?: string
  temperature?: string
  recorder?: string
  content?: string
  workContent?: string
  safetyMeasures?: string
  issuesFound?: string
  attendeeIds?: string[]
  attachments?: Attachment[]
  // v4.1.0 结构化日报条目快照，用于日报继承
  items?: DailyReportItem[]
}

export interface Penalty extends BaseEntity {
  projectId?: string
  date: string
  unit: string
  amount: number
  reason: string
  status: 'pending' | 'closed'
}

export interface Hazard extends BaseEntity {
  title: string
  description?: string
  location?: string
  level: HazardLevel
  category?: string
  status: HazardStatus
  reporterId?: string
  rectifyDeadline?: string
  rectifyPersonId?: string
  rectifyMeasure?: string
  rectifyDate?: string
  reviewPersonId?: string
  reviewDate?: string
  reviewComment?: string
  projectId?: string
  photos?: Attachment[]
  rectifyPhotos?: Attachment[]
  source?: 'manual' | 'ai'
}

export interface HazardSource extends BaseEntity {
  name: string
  category?: string
  level: RiskLevel
  riskFactor?: string
  controlMeasures?: string
  location?: string
  projectId?: string
  status: 'controlled' | 'monitoring' | 'uncontrolled'
  responsiblePersonId?: string
  reviewCycle?: string
  lastReviewDate?: string
}

export interface DangerousProject extends BaseEntity {
  name: string
  category?: string
  level: DangerousProjectLevel
  startDate?: string
  endDate?: string
  status: 'planned' | 'ongoing' | 'completed'
  projectId?: string
  plan?: string
  expertReview?: boolean
  expertReviewDate?: string
  responsiblePersonId?: string
  attachments?: Attachment[]
}

export interface WorkPermit extends BaseEntity {
  type: WorkPermitType
  title: string
  location?: string
  applicantId?: string
  workContent?: string
  startTime?: string
  endTime?: string
  safetyMeasures?: string
  approverId?: string
  approverComment?: string
  status: PermitStatus
  projectId?: string
  guardianId?: string
  fireWatcherId?: string
  gasTestResult?: string
  attachments?: Attachment[]
}

export interface Acceptance extends BaseEntity {
  type?: string
  part?: string
  content?: string
  date: string
  acceptorIds?: string[]
  result: AcceptanceResult
  projectId?: string
  issues?: string
  attachments?: Attachment[]
  rectifyDeadline?: string
}

export interface Meeting extends BaseEntity {
  title: string
  type?: string
  date: string
  time?: string
  location?: string
  host?: string
  attendeeIds?: string[]
  content?: string
  decisions?: string
  projectId?: string
  attachments?: Attachment[]
}

export interface Correspondence extends BaseEntity {
  direction: CorrespondenceDirection
  title: string
  type?: string
  from?: string
  to?: string
  date: string
  content?: string
  docNumber?: string
  attachments?: Attachment[]
  projectId?: string
  replyTo?: string
  status: CorrespondenceStatus
}

export interface CategoryRecord extends BaseEntity {
  code: string
  name: string
  parentId?: string | null
  sortOrder: number
  icon?: string
  isBuiltIn: boolean
  description?: string
}

export interface VariableMapping {
  name: string
  label?: string
  source: 'field' | 'extraField' | 'statistic' | 'related' | 'ai' | 'currentUser' | 'currentDate' | 'formula' | 'manual'
  table?: string
  field?: string
  extraFieldKey?: string
  statisticKey?: string
  queryKey?: string
  prompt?: string
  format?: string
  expr?: string
  value?: unknown
  /** 手动填写变量的默认值，生成时优先使用，未设置时弹窗让用户输入 */
  defaultValue?: string
  required?: boolean
}

export interface GlobalVariable {
  id: string
  label: string              // 中文显示名，如"项目名称"——用户唯一看到的名字
  value: string              // 当前实际值（生成文档时替换进模板）
  source: 'project' | 'manual' | 'currentDate'
  /** project 来源时对应项目表的字段名，如 'name', 'code' */
  projectField?: string
  /** 项目扩展字段的 key（extraFields 里的键名） */
  extraFieldKey?: string
  isBuiltIn: boolean
  sortOrder: number
}

export interface CellStyle {
  fontSize?: number
  bold?: boolean
  color?: string
  bgColor?: string
  border?: 'thin' | 'medium' | 'thick'
  hAlign?: 'left' | 'center' | 'right'
  vAlign?: 'top' | 'middle' | 'bottom'
}

export interface HeaderCell {
  title: string
  colSpan?: number
  rowSpan?: number
  field?: string
  style?: CellStyle
}

export interface HeaderRow {
  cells: HeaderCell[]
  height?: number
  style?: CellStyle
}

export interface BodyCell {
  field: string
  type: 'text' | 'number' | 'date' | 'enum' | 'image' | 'formula' | 'index'
  enumMap?: Record<string, string>
  dateFormat?: string
  formula?: string
  width?: number
  align?: 'left' | 'center' | 'right'
  style?: CellStyle
}

export interface BodyRow {
  cells: BodyCell[]
  height?: number
  style?: CellStyle
  filterExpr?: string
  sortBy?: string[]
}

export interface FooterCell {
  type: 'label' | 'statistic' | 'formula' | 'signature'
  value?: string
  statisticKey?: string
  formula?: string
  colSpan?: number
  align?: 'left' | 'center' | 'right'
  style?: CellStyle
}

export interface FooterRow {
  cells: FooterCell[]
  height?: number
  style?: CellStyle
}

export interface LedgerConfig {
  ledgerType: 'excel' | 'word-table' | 'html-to-word'
  dataSource: {
    type: 'table' | 'query' | 'service'
    table?: string
    queryKey?: string
    serviceMethod?: string
    params?: Record<string, unknown>
  }
  headerRows: HeaderRow[]
  bodyRow: BodyRow
  footerRows?: FooterRow[]
  styleToken: string
  provenance?: {
    enabled: boolean
    mode: 'footer' | 'watermark' | 'both'
    textTemplate: string
  }
}

export interface Template extends BaseEntity {
  name: string
  categoryId?: string
  category?: string
  type: string
  content?: string
  fileType: 'docx' | 'xlsx' | 'pptx' | 'html'
  contentType?: 'complex' | 'ledger'
  fileUrl?: string
  fileSize?: number
  fileHash?: string
  isBuiltIn: boolean
  description?: string
  variables?: string[]
  variableMappings?: VariableMapping[]
  ledgerConfig?: LedgerConfig
  version?: number
}

export interface AiChatMessage extends BaseEntity {
  sessionId: string
  role: AiRole
  content: string
  referencedDocs?: string[]
  timestamp?: number
}

export interface AiSession extends BaseEntity {
  title: string
  lastMessage?: string
  lastMessageAt?: number
}

export interface KnowledgeItem extends BaseEntity {
  title: string
  category?: string
  content: string
  tags?: string[]
  source?: string
  fileUrl?: string
  fileType?: string
  isBuiltIn?: boolean
}

export interface KnowledgeDocument extends BaseEntity {
  title: string
  fileName: string
  fileType: 'docx' | 'pdf' | 'txt' | 'md'
  fileSize: number
  fullText: string
  chunkCount: number
  category: string
  source?: string
  isBuiltIn: boolean
  importStatus: 'processing' | 'done' | 'error'
  errorMsg?: string
}

export interface KnowledgeChunk extends BaseEntity {
  docId: string
  docTitle: string
  chunkIndex: number
  content: string
  tokens: string[]
  category: string
  isBuiltIn: boolean
}

export interface RetrievalHit {
  chunk: KnowledgeChunk
  score: number
  docTitle: string
}

export interface ChunkProgress {
  phase: 'reading' | 'parsing' | 'chunking' | 'tokenizing' | 'saving'
  processed: number
  total: number
  currentFile?: string
}

export interface AiGeneration extends BaseEntity {
  type: string
  title?: string
  prompt?: string
  result?: string
  projectId?: string
  templateId?: string
  status: 'pending' | 'done' | 'failed'
  error?: string
}

export interface DictItem extends BaseEntity {
  category: DictCategory
  code: string
  label: string
  sortOrder: number
  parentCode?: string
  enabled: boolean
  remark?: string
}

export interface SettingItem {
  key: string
  value: string
  updatedAt: number
}

export interface Attachment {
  id?: string
  name: string
  url: string
  size?: number
  type?: string
}

// ===== v4.0 新增模块类型 =====

/** 劳保用品 */
export interface PpeItem extends BaseEntity {
  name: string
  category: string          // 安全帽、安全带、防护服、防护手套、防护鞋、其他
  specification?: string     // 规格型号
  unit: string              // 单位：个、双、套
  quantity: number          // 库存数量
  issuedQuantity: number    // 已发放数量
  lastPurchaseDate?: string // 最近采购日期
  supplier?: string         // 供应商
  unitPrice?: number        // 单价
  status: '充足' | '不足' | '已过期'
  projectId?: string
  remark?: string
}

/** 机械设备 */
export interface Equipment extends BaseEntity {
  name: string
  category: string          // 起重机械、土方机械、混凝土机械、运输机械、其他
  model?: string            // 型号
  serialNumber?: string     // 出厂编号
  ownerUnit?: string        // 所属单位
  entryDate?: string        // 进场日期
  exitDate?: string         // 退场日期
  inspectionDate?: string   // 上次检验日期
  nextInspectionDate?: string // 下次检验日期
  operatorId?: string       // 操作人员ID
  insuranceCompany?: string // 保险公司
  insuranceType?: string    // 交强险、商业险等
  insuranceExpiryDate?: string // 保险到期日
  status: '在用' | '停用' | '已退场' | '待检验'
  projectId?: string
  remark?: string
  // v5.0 Day 2 收尾新增字段（铭牌识别常用，规格 §3.6 Equipment 字段补全）
  code?: string             // 设备编号/车牌（铭牌上的"设备编号"或"出厂编号"独立字段）
  manufacturer?: string     // 制造商
  manufactureLicense?: string // 制造许可证号（如 TS 2410383-2022）
  ratedTorque?: string      // 额定起重力矩（塔吊关键参数，如 800 kN·m）
}

/** 应急管理 — 应急预案 */
export interface EmergencyPlan extends BaseEntity {
  name: string
  category: string          // 综合预案、专项预案、现场处置方案
  applicableScope?: string  // 适用范围
  version?: string          // 版本号
  issueDate?: string        // 发布日期
  responsiblePersonId?: string
  projectId?: string
  content?: string          // 预案内容摘要
  attachments?: Attachment[]
}

/** 应急管理 — 应急物资 */
export interface EmergencySupply extends BaseEntity {
  name: string
  category: string          // 消防器材、急救药品、防护装备、照明设备、通讯设备、其他
  specification?: string
  quantity: number
  unit: string
  storageLocation?: string  // 存放地点
  responsiblePersonId?: string
  lastCheckDate?: string    // 最近检查日期
  expiryDate?: string       // 有效期
  status: '正常' | '即将过期' | '已过期' | '短缺'
  projectId?: string
  remark?: string
}

/** 应急管理 — 演练记录 */
export interface EmergencyDrill extends BaseEntity {
  title: string
  drillType: string         // 消防演练、防汛演练、坍塌救援、触电救援、其他
  date: string
  location?: string
  organizer?: string
  participantCount?: number
  content?: string          // 演练内容摘要
  evaluation?: string       // 演练评估
  issues?: string           // 存在问题
  projectId?: string
  attachments?: Attachment[]
}

/** 安全费用 */
export interface SafetyCost extends BaseEntity {
  date: string
  category: string          // 安全防护、安全培训、安全设施、应急管理、劳保用品、其他
  amount: number
  handler?: string          // 经办人
  projectId?: string
  remark?: string
}

/** 事故管理 */
export interface AccidentRecord extends BaseEntity {
  title: string
  accidentType: string      // 高处坠落、物体打击、机械伤害、触电、坍塌、火灾、中毒、其他
  severity: '轻伤' | '重伤' | '死亡' | '未遂'
  occurrenceDate: string    // 发生日期
  occurrenceLocation?: string
  victimName?: string       // 受害人姓名
  victimId?: string         // 受害人ID（关联人员表）
  description?: string      // 事故经过
  cause?: string            // 原因分析
  treatment?: string        // 处理措施
  correctiveActions?: string // 整改措施
  reportedTo?: string       // 上报单位
  reportDate?: string       // 上报日期
  status: '调查中' | '已结案' | '已上报'
  responsiblePersonId?: string
  projectId?: string
  attachments?: Attachment[]
}

// ===== v5.0.1 EHS "人-事-证" 表结构重构 =====
// 替换旧的 EducationRecord + TrainingRecord，统一为：
//   TrainingSession（"事"主表）+ TrainingEnrollment（"人-事关联"）+ AttachmentRecord（"痕迹"）
// 旧表保留兼容（不删），新数据写入新表；旧数据通过迁移函数迁到新表

/**
 * 培训/教育会话（统一的"事"主表）
 * 一场安全教育、一次技术交底、一次班前教育、一次体检，都是一条 TrainingSession
 */
export interface TrainingSession extends BaseEntity {
  title: string                   // 标题
  type: TrainingType              // 类型：安全教育/技术交底/会议/技能培训/体检/班前
  scene: TrainingScene            // 场景：三级教育(公司/项目/班组)/技术交底/月度/临时/班前
  date: string                    // 日期 YYYY-MM-DD
  duration?: number               // 时长（分钟）
  educator?: string               // 教育/主讲人
  location?: string               // 地点
  content?: string                // 内容摘要
  materials?: string[]            // 培训材料 URL 列表
  projectId?: string              // 所属项目
  status: 'planned' | 'ongoing' | 'completed' | 'cancelled'
}

/**
 * 培训/教育报名记录（"人-事关联"表）
 * 一个工人参加一场培训 = 一条 TrainingEnrollment
 * 一人一次教育一条记录，签字时间戳必填（未签字视为未完成）
 */
export interface TrainingEnrollment extends BaseEntity {
  trainingId: string              // 关联 TrainingSession.id
  workerId: string                // 工人 ID
  /** 冗余字段：工人身份证号（用于跨项目查询/退场后档案可查） */
  workerIdCard?: string
  /** 冗余字段：工人姓名（用于不依赖 worker 表的展示） */
  workerName: string
  /** 冗余字段：场景（便于不联表直接按场景统计） */
  scene: TrainingScene
  /** 报名时间戳 */
  enrolledAt: number
  /** 签字时间戳（必填，未签字视为未完成） */
  signedAt?: number
  /** 签字照片附件 ID（关联 AttachmentRecord.id） */
  signatureBlobId?: string
  /** 考试分数（如有） */
  examScore?: number
  /** 考试结果 */
  examResult?: 'pass' | 'fail' | 'pending' | 'exempt'
  /** 免考原因（如持证免考） */
  exemptReason?: string
}

/**
 * 附件记录（统一的"痕迹"表）
 * 取代散落在各表 attachments[] 字段中的零散附件，提供统一的过期管理和分类查询
 */
export interface AttachmentRecord extends BaseEntity {
  /** 关联实体类型：worker/training/certificate/equipment/hazard/acceptance 等 */
  entityType: string
  /** 关联实体 ID */
  entityId: string
  /** 附件分类 */
  category: AttachmentCategory
  /** 附件二进制内容（Base64 编码，用于身份证照片/签字等小文件） */
  blob?: string
  /** 文件名 */
  filename: string
  /** MIME 类型 */
  mimeType: string
  /** 文件大小（字节） */
  size: number
  /** 过期日期（如证书、体检报告等有时效性的附件） */
  expiryDate?: string
  /** 上传人 */
  uploadedBy?: string
  /** 上传时间戳 */
  uploadedAt: number
}
