import { db } from './index'
import type { DictItem, KnowledgeItem } from '@/types'

type DictSeed = Omit<DictItem, 'id' | 'createdAt' | 'updatedAt'>

const dictData: DictSeed[] = [
  { category: 'hazard_category', code: 'high_place', label: '高处作业', sortOrder: 1, enabled: true },
  { category: 'hazard_category', code: 'electric', label: '施工用电', sortOrder: 2, enabled: true },
  { category: 'hazard_category', code: 'lifting', label: '起重吊装', sortOrder: 3, enabled: true },
  { category: 'hazard_category', code: 'excavation', label: '土方开挖', sortOrder: 4, enabled: true },
  { category: 'hazard_category', code: 'scaffold', label: '脚手架', sortOrder: 5, enabled: true },
  { category: 'hazard_category', code: 'formwork', label: '模板支撑', sortOrder: 6, enabled: true },
  { category: 'hazard_category', code: 'fire', label: '消防安全', sortOrder: 7, enabled: true },
  { category: 'hazard_category', code: 'ppe', label: '个人防护', sortOrder: 8, enabled: true },
  { category: 'hazard_category', code: 'machinery', label: '施工机械', sortOrder: 9, enabled: true },
  { category: 'hazard_category', code: 'confined_space', label: '受限空间', sortOrder: 10, enabled: true },
  { category: 'hazard_category', code: 'demolition', label: '拆除作业', sortOrder: 11, enabled: true },
  { category: 'hazard_category', code: 'civil_defense', label: '文明施工', sortOrder: 12, enabled: true },
  { category: 'hazard_category', code: 'other', label: '其他', sortOrder: 99, enabled: true },

  { category: 'work_type', code: 'common_worker', label: '普工', sortOrder: 1, enabled: true },
  { category: 'work_type', code: 'reinforcement', label: '钢筋工', sortOrder: 2, enabled: true },
  { category: 'work_type', code: 'formwork_worker', label: '木工', sortOrder: 3, enabled: true },
  { category: 'work_type', code: 'concrete', label: '混凝土工', sortOrder: 4, enabled: true },
  { category: 'work_type', code: 'scaffolder', label: '架子工', sortOrder: 5, enabled: true },
  { category: 'work_type', code: 'electrician', label: '电工', sortOrder: 6, enabled: true },
  { category: 'work_type', code: 'welder', label: '焊工', sortOrder: 7, enabled: true },
  { category: 'work_type', code: 'tower_crane', label: '塔吊司机', sortOrder: 8, enabled: true },
  { category: 'work_type', code: 'signal_man', label: '信号工', sortOrder: 9, enabled: true },
  { category: 'work_type', code: 'lifting_worker', label: '起重工', sortOrder: 10, enabled: true },
  { category: 'work_type', code: 'machinery_operator', label: '机械操作工', sortOrder: 11, enabled: true },
  { category: 'work_type', code: 'plumber', label: '管道工', sortOrder: 12, enabled: true },
  { category: 'work_type', code: 'painter', label: '油漆工', sortOrder: 13, enabled: true },
  { category: 'work_type', code: 'mason', label: '瓦工/砌筑工', sortOrder: 14, enabled: true },
  { category: 'work_type', code: 'safety_officer', label: '安全员', sortOrder: 15, enabled: true },
  { category: 'work_type', code: 'manager', label: '管理人员', sortOrder: 16, enabled: true },
  { category: 'work_type', code: 'other', label: '其他工种', sortOrder: 99, enabled: true },

  { category: 'cert_type', code: 'safety_officer_cert', label: '安全员C证', sortOrder: 1, enabled: true },
  { category: 'cert_type', code: 'special_op', label: '特种作业操作证', sortOrder: 2, enabled: true },
  { category: 'cert_type', code: 'scaffold_cert', label: '架子工操作证', sortOrder: 3, enabled: true },
  { category: 'cert_type', code: 'electrician_cert', label: '电工操作证', sortOrder: 4, enabled: true },
  { category: 'cert_type', code: 'welder_cert', label: '焊工操作证', sortOrder: 5, enabled: true },
  { category: 'cert_type', code: 'tower_crane_cert', label: '塔吊司机证', sortOrder: 6, enabled: true },
  { category: 'cert_type', code: 'signal_cert', label: '信号司索工证', sortOrder: 7, enabled: true },
  { category: 'cert_type', code: 'lifting_cert', label: '起重机械作业证', sortOrder: 8, enabled: true },
  { category: 'cert_type', code: 'id_card', label: '身份证', sortOrder: 9, enabled: true },
  { category: 'cert_type', code: 'health_cert', label: '健康证', sortOrder: 10, enabled: true },
  { category: 'cert_type', code: 'training_cert', label: '培训合格证', sortOrder: 11, enabled: true },

  { category: 'education_type', code: 'three_level', label: '三级安全教育', sortOrder: 1, enabled: true },
  { category: 'education_type', code: 'daily', label: '日常安全教育', sortOrder: 2, enabled: true },
  { category: 'education_type', code: 'transition', label: '转岗安全教育', sortOrder: 3, enabled: true },
  { category: 'education_type', code: 'holiday', label: '节后复工教育', sortOrder: 4, enabled: true },
  { category: 'education_type', code: 'seasonal', label: '季节性安全教育', sortOrder: 5, enabled: true },
  { category: 'education_type', code: 'special', label: '专项安全教育', sortOrder: 6, enabled: true },
  { category: 'education_type', code: 'other', label: '其他教育', sortOrder: 99, enabled: true },

  { category: 'training_type', code: 'skill', label: '技能培训', sortOrder: 1, enabled: true },
  { category: 'training_type', code: 'safety', label: '安全培训', sortOrder: 2, enabled: true },
  { category: 'training_type', code: 'regulation', label: '法规培训', sortOrder: 3, enabled: true },
  { category: 'training_type', code: 'emergency', label: '应急演练', sortOrder: 4, enabled: true },
  { category: 'training_type', code: 'new_tech', label: '新技术培训', sortOrder: 5, enabled: true },
  { category: 'training_type', code: 'other', label: '其他培训', sortOrder: 99, enabled: true },

  { category: 'permit_type', code: 'hot_work', label: '动火作业许可证', sortOrder: 1, enabled: true },
  { category: 'permit_type', code: 'height_work', label: '高处作业许可证', sortOrder: 2, enabled: true },
  { category: 'permit_type', code: 'confined_space', label: '受限空间作业许可证', sortOrder: 3, enabled: true },
  { category: 'permit_type', code: 'temp_electric', label: '临时用电许可证', sortOrder: 4, enabled: true },
  { category: 'permit_type', code: 'lifting', label: '起重吊装作业许可证', sortOrder: 5, enabled: true },
  { category: 'permit_type', code: 'excavation', label: '土方开挖作业许可证', sortOrder: 6, enabled: true },
  { category: 'permit_type', code: 'blasting', label: '爆破作业许可证', sortOrder: 7, enabled: true },
  { category: 'permit_type', code: 'other', label: '其他作业许可证', sortOrder: 99, enabled: true },

  { category: 'acceptance_type', code: 'scaffold', label: '脚手架验收', sortOrder: 1, enabled: true },
  { category: 'acceptance_type', code: 'formwork', label: '模板支撑验收', sortOrder: 2, enabled: true },
  { category: 'acceptance_type', code: 'temp_electric', label: '临时用电验收', sortOrder: 3, enabled: true },
  { category: 'acceptance_type', code: 'lifting_equip', label: '起重机械验收', sortOrder: 4, enabled: true },
  { category: 'acceptance_type', code: 'foundation_pit', label: '基坑支护验收', sortOrder: 5, enabled: true },
  { category: 'acceptance_type', code: 'safety_protection', label: '安全防护验收', sortOrder: 6, enabled: true },
  { category: 'acceptance_type', code: 'fire_fighting', label: '消防设施验收', sortOrder: 7, enabled: true },
  { category: 'acceptance_type', code: 'machinery', label: '施工机械验收', sortOrder: 8, enabled: true },
  { category: 'acceptance_type', code: 'civil_defense', label: '文明施工验收', sortOrder: 9, enabled: true },
  { category: 'acceptance_type', code: 'section', label: '分部分项验收', sortOrder: 10, enabled: true },
  { category: 'acceptance_type', code: 'other', label: '其他验收', sortOrder: 99, enabled: true },

  { category: 'meeting_type', code: 'weekly', label: '周安全例会', sortOrder: 1, enabled: true },
  { category: 'meeting_type', code: 'monthly', label: '月度安全会议', sortOrder: 2, enabled: true },
  { category: 'meeting_type', code: 'special', label: '专项安全会议', sortOrder: 3, enabled: true },
  { category: 'meeting_type', code: 'pre_shift', label: '班前安全会', sortOrder: 4, enabled: true },
  { category: 'meeting_type', code: 'emergency', label: '应急会议', sortOrder: 5, enabled: true },
  { category: 'meeting_type', code: 'training', label: '培训会议', sortOrder: 6, enabled: true },
  { category: 'meeting_type', code: 'other', label: '其他会议', sortOrder: 99, enabled: true },

  { category: 'correspondence_type', code: 'notice', label: '通知', sortOrder: 1, enabled: true },
  { category: 'correspondence_type', code: 'letter', label: '函件', sortOrder: 2, enabled: true },
  { category: 'correspondence_type', code: 'report', label: '报告', sortOrder: 3, enabled: true },
  { category: 'correspondence_type', code: 'request', label: '请示', sortOrder: 4, enabled: true },
  { category: 'correspondence_type', code: 'reply', label: '批复', sortOrder: 5, enabled: true },
  { category: 'correspondence_type', code: 'rectify_notice', label: '整改通知', sortOrder: 6, enabled: true },
  { category: 'correspondence_type', code: 'work_contact', label: '工作联系单', sortOrder: 7, enabled: true },
  { category: 'correspondence_type', code: 'supervision', label: '监理通知单', sortOrder: 8, enabled: true },
  { category: 'correspondence_type', code: 'other', label: '其他', sortOrder: 99, enabled: true },

  { category: 'danger_category', code: 'deep_foundation_pit', label: '深基坑工程', sortOrder: 1, enabled: true },
  { category: 'danger_category', code: 'slope', label: '边坡工程', sortOrder: 2, enabled: true },
  { category: 'danger_category', code: 'high_scaffold', label: '高大模板支撑体系', sortOrder: 3, enabled: true },
  { category: 'danger_category', code: 'lifting_install', label: '起重吊装及安装拆卸', sortOrder: 4, enabled: true },
  { category: 'danger_category', code: 'scaffold_erection', label: '脚手架工程', sortOrder: 5, enabled: true },
  { category: 'danger_category', code: 'demolition', label: '拆除爆破工程', sortOrder: 6, enabled: true },
  { category: 'danger_category', code: 'other_danger', label: '其他危大工程', sortOrder: 99, enabled: true },

  { category: 'log_weather', code: 'sunny', label: '晴', sortOrder: 1, enabled: true },
  { category: 'log_weather', code: 'cloudy', label: '多云', sortOrder: 2, enabled: true },
  { category: 'log_weather', code: 'overcast', label: '阴', sortOrder: 3, enabled: true },
  { category: 'log_weather', code: 'light_rain', label: '小雨', sortOrder: 4, enabled: true },
  { category: 'log_weather', code: 'moderate_rain', label: '中雨', sortOrder: 5, enabled: true },
  { category: 'log_weather', code: 'heavy_rain', label: '大雨', sortOrder: 6, enabled: true },
  { category: 'log_weather', code: 'snow', label: '雪', sortOrder: 7, enabled: true },
  { category: 'log_weather', code: 'fog', label: '雾', sortOrder: 8, enabled: true },
  { category: 'log_weather', code: 'wind', label: '大风', sortOrder: 9, enabled: true },
  { category: 'log_weather', code: 'high_temp', label: '高温', sortOrder: 10, enabled: true },
]

export async function seedDictData(force = false): Promise<void> {
  const count = await db.dictItems.count()
  if (count > 0 && !force) return

  const now = Date.now()
  const items: DictItem[] = dictData.map((d, i) => ({
    ...d,
    id: `dict_${d.category}_${d.code}`,
    createdAt: now + i,
    updatedAt: now + i,
  }))

  await db.dictItems.bulkPut(items)
}

export async function ensureDefaultProject(): Promise<void> {
  const count = await db.projects.count()
  if (count > 0) return

  await db.projects.add({
    id: 'proj_default',
    name: '大理机场土石方项目二标段',
    code: 'DLJC-TSF-02',
    location: '云南省大理白族自治州大理市',
    status: 'active',
    contractor: '某某建设集团有限公司',
    supervisor: '某某监理有限公司',
    owner: '某某机场建设指挥部',
    managerName: '李经理',
    techDirector: '王技术',
    safetyOfficer: '张安全',
    safetyOfficerPhone: '138****8888',
    startDate: '2026-01-01',
    endDate: '2027-06-30',
    description: '大理机场扩建项目土石方工程第二标段',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  })
}

export async function seedKnowledgeBase(): Promise<void> {
  const count = await db.knowledgeItems.count()
  if (count > 0) return

  const now = Date.now()
  const items: KnowledgeItem[] = [
    {
      id: 'kb_001',
      title: '安全帽的正确佩戴方法',
      category: '个人防护',
      content: '1. 检查安全帽外观有无裂纹、损伤；\n2. 调整帽衬，缓冲垫距帽顶2-5cm；\n3. 系紧下颏带，确保低头不脱落；\n4. 安全帽使用期限不超过30个月。',
      tags: ['安全帽', 'PPE', '个人防护'],
      source: '《建筑施工安全检查标准》JGJ59',
      isBuiltIn: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'kb_002',
      title: '高处作业安全要点',
      category: '高处作业',
      content: '1. 2米及以上作业必须系安全带，高挂低用；\n2. 作业面满铺脚手板，不得有探头板；\n3. 临边设置1.2m高防护栏杆和18cm挡脚板；\n4. 高处作业严禁抛掷物料；\n5. 六级以上大风停止高处作业。',
      tags: ['高处作业', '安全带', '临边防护'],
      source: '《建筑施工高处作业安全技术规范》JGJ80',
      isBuiltIn: true,
      createdAt: now + 1,
      updatedAt: now + 1,
    },
    {
      id: 'kb_003',
      title: '临时用电"三级配电两级保护"',
      category: '施工用电',
      content: '三级配电：总配电箱→分配电箱→开关箱\n两级保护：总配电箱漏电保护器+开关箱漏电保护器\n开关箱漏电动作电流≤30mA，动作时间≤0.1s\n潮湿场所≤15mA',
      tags: ['临时用电', '三级配电', '漏电保护'],
      source: '《施工现场临时用电安全技术规范》JGJ46',
      isBuiltIn: true,
      createdAt: now + 2,
      updatedAt: now + 2,
    },
    {
      id: 'kb_004',
      title: '动火作业"十不烧"原则',
      category: '消防安全',
      content: '1. 焊工无上岗证不烧\n2. 动火审批手续未办不烧\n3. 不了解焊接地点周围情况不烧\n4. 不了解焊接物内部情况不烧\n5. 装过易燃易爆物品的容器不烧\n6. 用可燃材料作保温隔音的部位不烧\n7. 密闭或有压力的容器管道不烧\n8. 焊接部位旁有易燃易爆物品不烧\n9. 附近有与明火作业相抵触的作业不烧\n10. 禁火区内未办理动火审批手续不烧',
      tags: ['动火作业', '消防', '十不烧'],
      source: '《建设工程施工现场消防安全技术规范》GB50720',
      isBuiltIn: true,
      createdAt: now + 3,
      updatedAt: now + 3,
    },
    {
      id: 'kb_005',
      title: '三级安全教育内容',
      category: '安全教育',
      content: '公司级（一级）：安全生产法规、企业安全制度、事故案例\n项目级（二级）：项目概况、施工现场安全制度、危险区域及注意事项\n班组级（三级）：本工种安全操作规程、岗位安全职责、个人防护用品使用',
      tags: ['三级教育', '安全教育', '入场教育'],
      source: '《建筑企业职工安全培训教育暂行规定》',
      isBuiltIn: true,
      createdAt: now + 4,
      updatedAt: now + 4,
    },
  ]

  await db.knowledgeItems.bulkPut(items)
}

export async function seedCategories(): Promise<void> {
}

export async function seedTemplates(): Promise<void> {
}

export async function initDatabase(): Promise<void> {
  await seedDictData()
  await ensureDefaultProject()
  await seedKnowledgeBase()
  await seedCategories()
  await seedTemplates()
}
