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
  status: '在用' | '停用' | '已退场' | '待检验'
  projectId?: string
  remark?: string
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
