/**
 * 设备名称中英文映射
 * OCR 识别铭牌上的英文设备名时，自动映射为中文填入"设备名称"字段
 */

/** 英文 → 中文 映射表（key 全大写） */
const DEVICE_NAME_MAP: Record<string, string> = {
  'TOWER CRANE': '塔式起重机',
  'TOWERCRANE': '塔式起重机',
  'CRAWLER CRANE': '履带起重机',
  'CRAWLERCRANE': '履带起重机',
  'TRUCK CRANE': '汽车起重机',
  'TRUCKCRANE': '汽车起重机',
  'EXCAVATOR': '挖掘机',
  'LOADER': '装载机',
  'BULLDOZER': '推土机',
  'GRADER': '平地机',
  'ROLLER': '压路机',
  'CONCRETE PUMP': '混凝土泵车',
  'CONCRETE PUMP TRUCK': '混凝土泵车',
  'CONCRETE MIXER': '混凝土搅拌车',
  'MIXER TRUCK': '混凝土搅拌车',
  'DUMP TRUCK': '自卸汽车',
  'BATCHING PLANT': '混凝土搅拌站',
  'GENERATOR': '发电机',
  'AIR COMPRESSOR': '空压机',
  'WELDING MACHINE': '电焊机',
  'WELDER': '电焊机',
}

/** 英文 → 中文：支持直接匹配、去空格匹配、部分匹配 */
export function getCnByEn(en: string): string | undefined {
  if (!en) return undefined
  const normalized = en.toUpperCase().trim()
  // 1. 直接匹配
  if (DEVICE_NAME_MAP[normalized]) return DEVICE_NAME_MAP[normalized]
  // 2. 去空格匹配
  const noSpace = normalized.replace(/\s+/g, '')
  if (DEVICE_NAME_MAP[noSpace]) return DEVICE_NAME_MAP[noSpace]
  // 3. 部分匹配：原文包含某个 key
  for (const [key, value] of Object.entries(DEVICE_NAME_MAP)) {
    if (normalized.includes(key)) return value
  }
  return undefined
}

/** 中文 → 英文（供 UI 提示用） */
const DEVICE_NAME_REVERSE_MAP: Record<string, string> = Object.entries(DEVICE_NAME_MAP).reduce(
  (acc, [en, cn]) => {
    if (!acc[cn]) acc[cn] = en
    return acc
  },
  {} as Record<string, string>,
)

export function getEnByCn(cn: string): string | undefined {
  return DEVICE_NAME_REVERSE_MAP[cn]
}

/** 获取所有映射（供 UI / 调试用） */
export function getAllDeviceNameMappings(): Array<{ en: string; cn: string }> {
  return Object.entries(DEVICE_NAME_MAP).map(([en, cn]) => ({ en, cn }))
}
