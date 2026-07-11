import {
  Home,
  Building2,
  Users2,
  Users,
  Wrench,
  GraduationCap,
  ClipboardList,
  AlertTriangle,
  ShieldAlert,
  AlertOctagon,
  FileBadge,
  CheckCircle,
  HardHat,
  Siren,
  DollarSign,
  Skull,
  Presentation,
  Mail,
  BarChart3,
  FileText,
  FolderOpen,
  Zap,
  Bot,
  BookOpen,
  PenLine,
  Settings,
  type LucideIcon,
} from 'lucide-react'
import { featureFlags, type FeatureFlags } from './features'

export interface MenuItem {
  id: string
  label: string
  icon: LucideIcon
  path: string
  group: string
  featureFlag?: keyof FeatureFlags
  badge?: { text: string; variant: 'danger' | 'warning' | 'new' }
}

export interface MenuGroup {
  id: string
  label: string
  items: MenuItem[]
}

/**
 * 侧边栏菜单分组 — 基于 JGJ 59-2011 + 中建/中铁安全管理实践
 *
 * 分组逻辑（安全管理专家视角，按工地实际工作流排序）：
 *
 *   进场准备 → 过程管控 → 台账输出 → 物资保障 → 应急处置 → 辅助工具 → 系统
 *
 * 关键设计决策：
 * 1. 人员管理独立于分包管理 — 自有人员 ≠ 分包人员，两者管理维度不同：
 *    分包管理 = 资质审查、安全协议、履约评价（管"公司"）
 *    人员管理 = 进场/退场、三级教育、特种作业证、体检（管"人"）
 * 2. 台账报表紧跟安全过程 — 中建/中铁内部审计逻辑："没有台账就等于没有做"。
 *    台账是过程管控的证据链终点，不是"辅助报表"，必须放在核心位置（第 3 组）。
 * 3. 智能工具垫底 — 辅助功能不干扰主流程。
 */
export const menuGroups: MenuGroup[] = [
  // ===== 第 1 组：进场准备 =====
  {
    id: 'foundation',
    label: '基础管理',
    items: [
      { id: 'home', label: '工作台', icon: Home, path: '/home', group: 'foundation', featureFlag: 'home' },
      { id: 'project', label: '项目管理', icon: Building2, path: '/projects', group: 'foundation', featureFlag: 'projectManagement' },
      { id: 'subcontractor', label: '分包管理', icon: Users2, path: '/subcontractors', group: 'foundation', featureFlag: 'subcontractorManagement' },
      { id: 'workers', label: '人员管理', icon: Users, path: '/workers', group: 'foundation', featureFlag: 'workerManagement' },
      { id: 'equipment', label: '机械设备', icon: Wrench, path: '/equipment', group: 'foundation', featureFlag: 'equipmentManagement' },
    ],
  },
  // ===== 第 2 组：日常过程管控 =====
  {
    id: 'process',
    label: '安全过程',
    items: [
      { id: 'education', label: '安全教育', icon: GraduationCap, path: '/education', group: 'process', featureFlag: 'educationManagement' },
      { id: 'training', label: '安全培训', icon: BookOpen, path: '/training', group: 'process', featureFlag: 'trainingManagement' },
      { id: 'dailylog', label: '安全日志', icon: ClipboardList, path: '/dailylog', group: 'process', featureFlag: 'dailyLog' },
      { id: 'inspection', label: '隐患排查', icon: AlertTriangle, path: '/inspection', group: 'process', featureFlag: 'hazardManagement' },
      { id: 'hazard-identification', label: '危险源辨识', icon: ShieldAlert, path: '/hazard-identification', group: 'process', featureFlag: 'hazardSource' },
      { id: 'hazard-project', label: '危大工程', icon: AlertOctagon, path: '/hazard-project', group: 'process', featureFlag: 'dangerousProject' },
      { id: 'permits', label: '作业许可', icon: FileBadge, path: '/permits', group: 'process', featureFlag: 'workPermit' },
      { id: 'acceptance', label: '安全验收', icon: CheckCircle, path: '/acceptance', group: 'process', featureFlag: 'acceptance' },
    ],
  },
  // ===== 第 3 组：台账报表（过程管控的成果输出）=====
  {
    id: 'ledger',
    label: '台账报表',
    items: [
      { id: 'templates', label: '模板库', icon: FolderOpen, path: '/templates', group: 'ledger', featureFlag: 'templateLibrary' },
      { id: 'generate', label: '台账生成', icon: Zap, path: '/generate', group: 'ledger', featureFlag: 'documentGeneration' },
      { id: 'reports', label: '报表中心', icon: FileText, path: '/reports', group: 'ledger', featureFlag: 'reportCenter' },
      { id: 'statistics', label: '数据看板', icon: BarChart3, path: '/statistics', group: 'ledger', featureFlag: 'dashboard' },
    ],
  },
  // ===== 第 4 组：物资保障 =====
  {
    id: 'resources',
    label: '安全物资',
    items: [
      { id: 'ppe', label: '劳保用品', icon: HardHat, path: '/ppe', group: 'resources', featureFlag: 'ppeManagement' },
      { id: 'emergency', label: '应急管理', icon: Siren, path: '/emergency', group: 'resources', featureFlag: 'emergencyManagement' },
      { id: 'safety-cost', label: '安全费用', icon: DollarSign, path: '/safety-cost', group: 'resources', featureFlag: 'safetyCostManagement' },
    ],
  },
  // ===== 第 5 组：事故与沟通 =====
  {
    id: 'incident',
    label: '事故与沟通',
    items: [
      { id: 'accident', label: '事故管理', icon: Skull, path: '/accidents', group: 'incident', featureFlag: 'accidentManagement' },
      { id: 'meetings', label: '安全会议', icon: Presentation, path: '/meetings', group: 'incident', featureFlag: 'meeting' },
      { id: 'correspondence', label: '收发文', icon: Mail, path: '/correspondences', group: 'incident', featureFlag: 'correspondence' },
    ],
  },
  // ===== 第 6 组：智能工具 =====
  {
    id: 'smart',
    label: '智能工具',
    items: [
      { id: 'ai', label: 'AI 助手', icon: Bot, path: '/ai', group: 'smart', featureFlag: 'aiAssistant' },
      { id: 'knowledge', label: '知识库', icon: BookOpen, path: '/knowledge', group: 'smart', featureFlag: 'knowledgeBase' },
      { id: 'docx-editor', label: '文档编辑器', icon: PenLine, path: '/editor', group: 'smart', featureFlag: 'docxEditor' },
    ],
  },
  // ===== 第 7 组：系统 =====
  {
    id: 'system',
    label: '系统',
    items: [
      { id: 'settings', label: '设置', icon: Settings, path: '/settings', group: 'system', featureFlag: 'settings' },
    ],
  },
]

function isMenuItemEnabled(item: MenuItem): boolean {
  if (!item.featureFlag) return true
  return featureFlags[item.featureFlag]
}

/** 过滤后的菜单分组（按 feature flag 过滤） */
export const filteredMenuGroups: MenuGroup[] = menuGroups.map(group => ({
  ...group,
  items: group.items.filter(isMenuItemEnabled),
})).filter(group => group.items.length > 0)

/** @deprecated 保留旧接口兼容，新代码请使用 filteredMenuGroups */
export const menuItems: MenuItem[] = menuGroups.flatMap(g => g.items)

/** @deprecated 保留旧接口兼容 */
export const topMenuItems = menuItems.filter(item => isMenuItemEnabled(item))
/** @deprecated 保留旧接口兼容 */
export const bottomMenuItems: MenuItem[] = []
