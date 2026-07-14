/**
 * OCR 字段映射表与正则规则
 * 用于从 OCR 原始文本中提取结构化字段及其置信度
 */

/** 单个字段的提取规则 */
export interface FieldRule {
  /** 字段标识 */
  key: string
  /** 中文显示名 */
  label: string
  /** 匹配标签（用于 extractAfter 风格的标签提取） */
  labels: string[]
  /** 值的正则校验（命中后取 group 1 或整体匹配） */
  pattern: RegExp
  /** 置信度评估：命中 pattern 给基础分，标签命中额外加分 */
  baseConfidence: number
  /** 标签命中时额外加的分数 */
  labelBonus: number
}

/** 身份证字段提取规则表（按优先级排序） */
export const ID_CARD_FIELDS: FieldRule[] = [
  {
    key: 'name',
    label: '姓名',
    labels: ['姓名', '名字'],
    pattern: /(?:姓名|名字)\s*[:：]?\s*([\u4e00-\u9fff]{2,4})/,
    baseConfidence: 60,
    labelBonus: 25,
  },
  {
    key: 'idNumber',
    label: '身份证号',
    labels: ['公民身份号码', '身份号码', '身份证号', '身份证'],
    pattern: /(\d{17}[\dXx])/,
    baseConfidence: 85,
    labelBonus: 10,
  },
  {
    key: 'gender',
    label: '性别',
    labels: ['性别'],
    // 提取 1-2 个汉字，由 validator 校验是否为"男/女"
    // 这样可以拦截 OCR 把"男"误识为"南"等字形相近错误
    pattern: /性别\s*[:：]?\s*([\u4e00-\u9fff]{1,2})/,
    baseConfidence: 70,
    labelBonus: 25,
  },
  {
    key: 'nation',
    label: '民族',
    labels: ['民族'],
    pattern: /民族\s*[:：]?\s*([\u4e00-\u9fff]{1,4})/,
    baseConfidence: 60,
    labelBonus: 30,
  },
  {
    key: 'birthDate',
    label: '出生日期',
    labels: ['出生', '出生日期'],
    pattern: /出生\s*[:：]?\s*(\d{4}\s*年\s*\d{1,2}\s*月\s*\d{1,2}\s*日|\d{4}-\d{1,2}-\d{1,2})/,
    baseConfidence: 60,
    labelBonus: 30,
  },
  {
    key: 'address',
    label: '住址',
    labels: ['住址', '地址'],
    pattern: /(?:住址|地址)\s*[:：]?\s*([\u4e00-\u9fff\d]+省[\u4e00-\u9fff\d]+(?:市|县|区|镇|村|街|路|号|室|\d)+)/,
    baseConfidence: 55,
    labelBonus: 30,
  },
]

/** 设备铭牌字段提取规则表 */
export const NAMEPLATE_FIELDS: FieldRule[] = [
  {
    key: 'serialNumber',
    label: '出厂编号',
    labels: ['出厂编号', '编号', '序列号', '出厂序号'],
    pattern: /(?:出厂编号|编号|序列号|出厂序号)\s*[:：]?\s*([A-Za-z0-9][A-Za-z0-9-]*[A-Za-z0-9]|[A-Za-z0-9])/,
    baseConfidence: 55,
    labelBonus: 35,
  },
  {
    key: 'model',
    label: '型号',
    labels: ['型号', '设备型号', '规格型号'],
    pattern: /(?:型号|设备型号|规格型号)\s*[:：]?\s*([A-Za-z0-9][A-Za-z0-9-]*)/,
    baseConfidence: 50,
    labelBonus: 35,
  },
]

/**
 * 根据规则从文本中提取字段值与置信度
 * - 标签命中 + 正则命中 → baseConfidence + labelBonus（上限 95）
 * - 仅正则命中（无标签） → baseConfidence
 * - 未命中 → undefined
 */
export function extractField(
  text: string,
  rule: FieldRule,
): { value: string; confidence: number; regex: string } | undefined {
  const match = rule.pattern.exec(text)
  if (!match) return undefined
  const value = (match[1] ?? match[0]).trim()
  if (!value) return undefined

  // 检查标签是否命中
  const hasLabel = rule.labels.some((l) => text.includes(l))
  const confidence = Math.min(95, rule.baseConfidence + (hasLabel ? rule.labelBonus : 0))

  return {
    value,
    confidence,
    regex: rule.pattern.source,
  }
}
