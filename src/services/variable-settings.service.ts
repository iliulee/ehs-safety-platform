import { settingsRepo } from '@/db/repositories'
import type { GlobalVariable, Project } from '@/types'

const STORAGE_KEY = 'globalVariables'

/**
 * 内置变量清单（21 项，按用户指定）
 * 每个变量在生成文档时，自动从项目信息中取值填入模板。
 * 用户不需要知道 {{}} 或英文变量名——只需要在项目信息里填好数据即可。
 */
export const BUILTIN_VARIABLES: GlobalVariable[] = [
  { id: '项目名称', label: '项目名称', value: '', source: 'project', projectField: 'name', isBuiltIn: true, sortOrder: 1 },
  { id: '项目编号', label: '项目编号', value: '', source: 'project', projectField: 'code', isBuiltIn: true, sortOrder: 2 },
  { id: '项目地点', label: '项目地点', value: '', source: 'project', projectField: 'location', isBuiltIn: true, sortOrder: 3 },
  { id: '建设单位', label: '建设单位', value: '', source: 'project', projectField: 'owner', isBuiltIn: true, sortOrder: 4 },
  { id: '施工单位', label: '施工单位', value: '', source: 'project', projectField: 'contractor', isBuiltIn: true, sortOrder: 5 },
  { id: '监理单位', label: '监理单位', value: '', source: 'project', projectField: 'supervisor', isBuiltIn: true, sortOrder: 6 },
  { id: '设计单位', label: '设计单位', value: '', source: 'project', extraFieldKey: 'designUnit', isBuiltIn: true, sortOrder: 7 },
  { id: '勘察单位', label: '勘察单位', value: '', source: 'project', extraFieldKey: 'surveyUnit', isBuiltIn: true, sortOrder: 8 },
  { id: '项目经理', label: '项目经理', value: '', source: 'project', projectField: 'managerName', isBuiltIn: true, sortOrder: 9 },
  { id: '技术负责人', label: '技术负责人', value: '', source: 'project', projectField: 'techDirector', isBuiltIn: true, sortOrder: 10 },
  { id: '安全负责人', label: '安全负责人', value: '', source: 'project', extraFieldKey: 'safetyDirector', isBuiltIn: true, sortOrder: 11 },
  { id: '安全员', label: '安全员', value: '', source: 'project', projectField: 'safetyOfficer', isBuiltIn: true, sortOrder: 12 },
  { id: '质量负责人', label: '质量负责人', value: '', source: 'project', extraFieldKey: 'qualityDirector', isBuiltIn: true, sortOrder: 13 },
  { id: '质量员', label: '质量员', value: '', source: 'project', extraFieldKey: 'qualityInspector', isBuiltIn: true, sortOrder: 14 },
  { id: '生产经理', label: '生产经理', value: '', source: 'project', extraFieldKey: 'productionManager', isBuiltIn: true, sortOrder: 15 },
  { id: '施工员', label: '施工员', value: '', source: 'project', extraFieldKey: 'constructionWorker', isBuiltIn: true, sortOrder: 16 },
  { id: '测量员', label: '测量员', value: '', source: 'project', extraFieldKey: 'surveyor', isBuiltIn: true, sortOrder: 17 },
  { id: '试验员', label: '试验员', value: '', source: 'project', extraFieldKey: 'tester', isBuiltIn: true, sortOrder: 18 },
  { id: '开工日期', label: '开工日期', value: '', source: 'project', projectField: 'startDate', isBuiltIn: true, sortOrder: 19 },
  { id: '竣工日期', label: '竣工日期', value: '', source: 'project', projectField: 'endDate', isBuiltIn: true, sortOrder: 20 },
  { id: '工期', label: '工期', value: '', source: 'project', projectField: 'startDate', isBuiltIn: true, sortOrder: 21 },
  // 辅助变量（文档生成必备）
  { id: '当前日期', label: '当前日期', value: '', source: 'currentDate', isBuiltIn: true, sortOrder: 22 },
  { id: '编制人', label: '编制人', value: '', source: 'manual', isBuiltIn: true, sortOrder: 23 },
]

/**
 * 从项目对象中解析变量值
 */
export function resolveVariableValue(variable: GlobalVariable, project: Project | null): string {
  if (!project) return ''

  switch (variable.source) {
    case 'project': {
      if (variable.projectField) {
        const val = (project as unknown as Record<string, unknown>)[variable.projectField]
        if (val !== undefined && val !== null && val !== '') return String(val)
      }
      if (variable.extraFieldKey && project.extraFields) {
        const val = project.extraFields[variable.extraFieldKey]
        if (val !== undefined && val !== null && val !== '') return String(val)
      }
      return ''
    }
    case 'manual':
      return variable.value || ''
    case 'currentDate':
      return new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
    default:
      return ''
  }
}

export const variableSettingsService = {
  /** 获取所有变量（内置 + 自定义），合并已保存的值 */
  async list(): Promise<GlobalVariable[]> {
    const raw = await settingsRepo.get(STORAGE_KEY)
    const savedMap = new Map<string, Partial<GlobalVariable>>()
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as GlobalVariable[]
        parsed.forEach((v) => savedMap.set(v.id, v))
      } catch { /* ignore parse error */ }
    }

    // 合并内置变量与已保存的值
    const builtins = BUILTIN_VARIABLES.map((v) => {
      const saved = savedMap.get(v.id)
      if (saved) {
        return { ...v, value: saved.value ?? v.value } as GlobalVariable
      }
      return v
    })

    // 自定义变量
    const customs = Array.from(savedMap.values())
      .filter((v) => !v.isBuiltIn && !BUILTIN_VARIABLES.some((b) => b.id === v.id))
      .map((v, i) => ({ ...v, sortOrder: 100 + i } as GlobalVariable))

    return [...builtins, ...customs]
  },

  /** 保存所有变量 */
  async save(variables: GlobalVariable[]): Promise<void> {
    await settingsRepo.set(STORAGE_KEY, JSON.stringify(variables))
  },

  /** 更新单个变量的值 */
  async updateValue(id: string, value: string): Promise<void> {
    const list = await this.list()
    const target = list.find((v) => v.id === id)
    if (target) {
      target.value = value
      await this.save(list)
    }
  },

  /** 添加自定义变量 */
  async add(label: string): Promise<void> {
    const list = await this.list()
    const id = `custom_${Date.now()}`
    list.push({
      id,
      label,
      value: '',
      source: 'manual',
      isBuiltIn: false,
      sortOrder: list.length + 1,
    })
    await this.save(list)
  },

  /** 删除自定义变量 */
  async remove(id: string): Promise<void> {
    const list = await this.list()
    const target = list.find((v) => v.id === id)
    if (target?.isBuiltIn) throw new Error('内置变量不能删除')
    await this.save(list.filter((v) => v.id !== id))
  },

  /** 恢复内置变量默认值 */
  async reset(): Promise<void> {
    await settingsRepo.remove(STORAGE_KEY)
  },
}