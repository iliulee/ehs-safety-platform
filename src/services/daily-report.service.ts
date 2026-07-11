import { dailyLogRepo } from '@/db/repositories'
import { getCurrentProjectId } from '@/store'
import type { DailyLog, DailyReportItem, DailyReportFormData } from '@/types'

export interface InheritOption {
  id: string
  type: DailyReportItem['type']
  title: string
  sourceDate: string
  selected: boolean
}

export interface InheritGroup {
  type: DailyReportItem['type']
  label: string
  options: InheritOption[]
}

export interface YesterdayData {
  log: DailyLog
  date: string
  items: DailyReportItem[]
}

/**
 * 获取指定日期的前一天日期字符串（YYYY-MM-DD），按本地日期计算，避免时区漂移
 */
export function getYesterday(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const d = new Date(year, month - 1, day)
  d.setDate(d.getDate() - 1)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

/**
 * 查找昨日日报：优先匹配 projectId + date，否则按日期模糊匹配
 */
export async function getYesterdayLog(
  dateStr: string,
  projectId?: string,
): Promise<YesterdayData | null> {
  const pid = projectId ?? getCurrentProjectId()
  const yd = getYesterday(dateStr)

  const all = await dailyLogRepo.getAll()
  const candidates = all.filter((log) => {
    if (!log.date) return false
    if (pid && log.projectId && log.projectId !== pid) return false
    return log.date === yd
  })

  // 按创建时间取最新一条
  const log = candidates.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))[0]
  if (!log) return null

  return {
    log,
    date: yd,
    items: (log.items ?? []).map((item) => ({
      ...item,
      sourceDate: item.sourceDate ?? yd,
    })),
  }
}

/**
 * 将昨日日报条目分组，用于选择性复用界面
 */
export function buildInheritGroups(items: DailyReportItem[]): InheritGroup[] {
  const typeLabels: Record<DailyReportItem['type'], string> = {
    workContent: '施工内容',
    hazard: '隐患记录',
    education: '安全教育',
    penalty: '违规处罚',
    training: '培训学习',
    custom: '其他事项',
  }

  const groups: InheritGroup[] = []
  const byType: Record<string, DailyReportItem[]> = {}

  for (const item of items) {
    if (!byType[item.type]) byType[item.type] = []
    byType[item.type].push(item)
  }

  for (const type of Object.keys(byType) as DailyReportItem['type'][]) {
    groups.push({
      type,
      label: typeLabels[type] ?? type,
      options: byType[type].map((item) => ({
        id: item.id,
        type: item.type,
        title: item.title || '未命名条目',
        sourceDate: item.sourceDate || '',
        selected: true,
      })),
    })
  }

  return groups
}

/**
 * 把选中的昨日条目还原为表单初始数据
 * 注意：education/penalty/training/newWorker 每种只取第一个选中项，
 *       hazard 和 workContent 可全部带入
 */
export function itemsToFormData(
  items: DailyReportItem[],
  baseDate: string,
): Partial<DailyReportFormData> {
  const result: Partial<DailyReportFormData> = {
    date: baseDate,
    hazards: [],
  }

  const workItem = items.find((i) => i.type === 'workContent')
  if (workItem && typeof workItem.data?.content === 'string') {
    result.workContent = workItem.data.content
  }

  result.hazards = items
    .filter((i) => i.type === 'hazard')
    .map((i) => {
      const d = i.data as Record<string, unknown>
      return {
        id: i.id,
        title: typeof d.title === 'string' ? d.title : i.title,
        level: typeof d.level === 'string' ? d.level : '一般',
        measure: typeof d.measure === 'string' ? d.measure : '',
        status: (['pending', 'rectifying', 'closed'].includes(String(d.status))
          ? d.status
          : 'pending') as DailyReportFormData['hazards'][0]['status'],
      }
    })

  const edu = items.find((i) => i.type === 'education')
  if (edu) {
    const d = edu.data as Record<string, unknown>
    result.hasEducation = true
    result.educationTopic = typeof d.topic === 'string' ? d.topic : edu.title
    result.educationAttendees = typeof d.attendees === 'string' ? d.attendees : ''
  }

  const penalty = items.find((i) => i.type === 'penalty')
  if (penalty) {
    const d = penalty.data as Record<string, unknown>
    result.hasPenalty = true
    result.penaltyUnit = typeof d.unit === 'string' ? d.unit : ''
    result.penaltyAmount = typeof d.amount === 'number' ? String(d.amount) : ''
    result.penaltyReason = typeof d.reason === 'string' ? d.reason : ''
  }

  const training = items.find((i) => i.type === 'training')
  if (training) {
    const d = training.data as Record<string, unknown>
    result.hasTraining = true
    result.trainingTopic = typeof d.topic === 'string' ? d.topic : training.title
    result.trainingOrganizer = typeof d.organizer === 'string' ? d.organizer : ''
  }

  const newWorker = items.find((i) => i.type === 'custom')
  if (newWorker) {
    const d = newWorker.data as Record<string, unknown>
    result.hasNewWorker = true
    result.newWorkerCount = typeof d.count === 'number' ? String(d.count) : ''
    result.newWorkerNames = typeof d.names === 'string' ? d.names : ''
  }

  return result
}
