/**
 * OCR 文本字段候选建议
 * 核心思路：OCR 文本里可能有错字，但身份证号/型号等有强格式特征，
 * 用正则把"看起来像"的串都提出来，让用户挑。
 *
 * 比起旧的 ocr-mappings.ts，这里更宽松：
 * - 不依赖"姓名/性别/民族"等标签是否被 OCR 识对
 * - 直接从全文里找符合格式的串
 * - 校验交给 ocr-validators
 */

import {
  validateName,
  validateIdCard,
  validateGender,
  validateNation,
  validateEquipmentModel,
  validateFactoryNumber,
  validateDeviceName,
  type ValidationResult,
} from './ocr-validators'
import { getCnByEn } from './device-name-mapping'

export type SuggestionKey =
  | 'name'
  | 'idNumber'
  | 'gender'
  | 'nation'
  | 'birthDate'
  | 'address'
  | 'model'
  | 'serialNumber'
  | 'deviceName'
  | 'code'
  | 'manufacturer'
  | 'manufactureLicense'
  | 'ratedTorque'

export interface Suggestion {
  /** 字段标识 */
  key: SuggestionKey
  /** 中文显示名 */
  label: string
  /** 提取的值 */
  value: string
  /** 置信度 0-100（命中强格式 + 校验通过 → 高） */
  confidence: number
  /** 校验结果 */
  validation: ValidationResult
  /** 值的来源（用于调试） */
  source: 'regex-strong' | 'regex-weak' | 'dictionary' | 'mapping'
}

/** 身份证类型识别场景 */
export function suggestIdCardFields(text: string): Suggestion[] {
  const suggestions: Suggestion[] = []

  // 1. 身份证号：18 位数字 + X（强格式，置信度高）
  const idMatches = text.match(/\d{17}[\dXx]/g) ?? []
  for (const id of idMatches) {
    const validation = validateIdCard(id)
    suggestions.push({
      key: 'idNumber',
      label: '身份证号',
      value: id.toUpperCase(),
      confidence: validation.status === 'valid' ? 95 : 60,
      validation,
      source: 'regex-strong',
    })
  }

  // 2. 出生日期：XXXX年X月X日 或 XXXX-XX-XX
  const birthMatches = text.match(/\d{4}\s*年\s*\d{1,2}\s*月\s*\d{1,2}\s*日|\d{4}-\d{1,2}-\d{1,2}/g) ?? []
  for (const birth of birthMatches) {
    suggestions.push({
      key: 'birthDate',
      label: '出生日期',
      value: birth.replace(/\s+/g, ''),
      confidence: 70,
      validation: { status: 'pending' },
      source: 'regex-strong',
    })
  }

  // 3. 性别：标签后的 1 个汉字
  const genderMatch = /性别\s*[:：]?\s*([\u4e00-\u9fff])/i.exec(text)
  if (genderMatch) {
    const value = genderMatch[1]
    const validation = validateGender(value)
    suggestions.push({
      key: 'gender',
      label: '性别',
      value,
      confidence: validation.status === 'valid' ? 85 : 50,
      validation,
      source: 'regex-weak',
    })
  }

  // 4. 民族：标签后的 1-4 个汉字
  const nationMatch = /民族\s*[:：]?\s*([\u4e00-\u9fff]{1,4})/i.exec(text)
  if (nationMatch) {
    const value = nationMatch[1].replace(/族$/, '') + '族'
    const validation = validateNation(value)
    suggestions.push({
      key: 'nation',
      label: '民族',
      value,
      confidence: validation.status === 'valid' ? 85 : 50,
      validation,
      source: 'regex-weak',
    })
  }

  // 5. 姓名：标签后的 2-4 个汉字
  const nameMatch = /(?:姓名|名字)\s*[:：]?\s*([\u4e00-\u9fff]{2,4})/i.exec(text)
  if (nameMatch) {
    const value = nameMatch[1]
    const validation = validateName(value)
    suggestions.push({
      key: 'name',
      label: '姓名',
      value,
      confidence: validation.status === 'valid' ? 80 : 40,
      validation,
      source: 'regex-weak',
    })
  }

  // 6. 住址：标签后到换行或文末
  const addressMatch = /(?:住址|地址)\s*[:：]?\s*([^\n\r]{4,60})/i.exec(text)
  if (addressMatch) {
    const value = addressMatch[1].trim()
    suggestions.push({
      key: 'address',
      label: '住址',
      value,
      confidence: 65,
      validation: { status: 'pending' },
      source: 'regex-weak',
    })
  }

  return suggestions
}

/** 铭牌识别场景 */
export function suggestNameplateFields(text: string): Suggestion[] {
  const suggestions: Suggestion[] = []

  // 1. 型号：标签后的字母数字串
  const modelMatch = /(?:型号|设备型号|规格型号)\s*[:：]?\s*([A-Za-z0-9][A-Za-z0-9-]{1,15})/i.exec(text)
  if (modelMatch) {
    const value = modelMatch[1]
    const validation = validateEquipmentModel(value)
    suggestions.push({
      key: 'model',
      label: '型号',
      value,
      confidence: validation.status === 'valid' ? 85 : 55,
      validation,
      source: 'regex-weak',
    })
  }

  // 2. 出厂编号：标签后的字母数字+连字符串
  const serialMatch = /(?:出厂编号|编号|序列号|出厂序号)\s*[:：]?\s*([A-Za-z0-9][A-Za-z0-9-]{2,18}[A-Za-z0-9])/i.exec(text)
  if (serialMatch) {
    const value = serialMatch[1]
    const validation = validateFactoryNumber(value)
    suggestions.push({
      key: 'serialNumber',
      label: '出厂编号',
      value,
      confidence: validation.status === 'valid' ? 85 : 55,
      validation,
      source: 'regex-weak',
    })
  }

  // 3. 设备名称：英文 → 中文映射，或中文直接匹配
  const upperText = text.toUpperCase()
  const mapped = getCnByEn(upperText)
  if (mapped) {
    const validation = validateDeviceName(mapped)
    suggestions.push({
      key: 'deviceName',
      label: '设备名称',
      value: mapped,
      confidence: validation.status === 'valid' ? 85 : 50,
      validation,
      source: 'mapping',
    })
  } else {
    // 尝试中文直接匹配
    const cnNames = ['塔式起重机', '塔吊', '履带起重机', '履带吊', '汽车起重机', '汽车吊',
      '挖掘机', '装载机', '推土机', '压路机', '平地机', '混凝土泵车', '混凝土搅拌车',
      '混凝土搅拌站', '渣土车', '自卸汽车', '发电机', '空压机', '电焊机']
    for (const cn of cnNames) {
      if (text.includes(cn)) {
        const validation = validateDeviceName(cn)
        suggestions.push({
          key: 'deviceName',
          label: '设备名称',
          value: cn,
          confidence: validation.status === 'valid' ? 85 : 50,
          validation,
          source: 'dictionary',
        })
        break
      }
    }
  }

  // 4. 设备编号/车牌（v5.0 Day 2 收尾新增）
  // 铭牌常见标签：设备编号 / 编号 / 车牌 / 备案编号
  // 排除"出厂编号"（已被 serialNumber 占用）
  const codeMatch = /(?:设备编号|备案编号|车牌号?)\s*[:：]?\s*([A-Za-z0-9][A-Za-z0-9-]{1,19})/i.exec(text)
  if (codeMatch) {
    const value = codeMatch[1]
    suggestions.push({
      key: 'code',
      label: '设备编号',
      value,
      confidence: 75,
      validation: { status: 'pending' },
      source: 'regex-weak',
    })
  }

  // 5. 制造商（v5.0 Day 2 收尾新增）
  // 铭牌常见标签：制造商 / 生产厂家 / 制造厂 / 生产厂
  const manufacturerMatch = /(?:制造商|生产厂家|制造厂|生产厂)\s*[:：]?\s*([\u4e00-\u9fffA-Za-z][\u4e00-\u9fffA-Za-z（）()\s&]{1,30})/i.exec(text)
  if (manufacturerMatch) {
    const value = manufacturerMatch[1].trim()
    suggestions.push({
      key: 'manufacturer',
      label: '制造商',
      value,
      confidence: 70,
      validation: { status: 'pending' },
      source: 'regex-weak',
    })
  }

  // 6. 制造许可证号（v5.0 Day 2 收尾新增）
  // 常见格式：TS 2410383-2022 / TS2410383-2022
  // 正则特点：TS 前缀 + 数字 + 可选空格 + 可选 - 日期
  const licenseMatch = /(?:制造许可证号|许可证号|制造许可证|许可证)\s*[:：]?\s*(TS\s*\d{6,10}(?:-\d{4})?)/i.exec(text)
  if (licenseMatch) {
    const value = licenseMatch[1].replace(/\s+/g, ' ').trim()
    suggestions.push({
      key: 'manufactureLicense',
      label: '制造许可证号',
      value,
      confidence: 80,
      validation: { status: 'valid' },
      source: 'regex-strong',
    })
  }

  // 7. 额定起重力矩（v5.0 Day 2 收尾新增，塔吊关键参数）
  // 常见格式：800 kN·m / 800kN·m / 80 t·m / 额定起重力矩 800
  const torqueMatch = /(?:额定起重力矩|额定力矩)\s*[:：]?\s*(\d+(?:\.\d+)?\s*(?:kN[·\-.]?m|t[·\-.]?m)?)/i.exec(text)
  if (torqueMatch) {
    const value = torqueMatch[1].replace(/\s+/g, ' ').trim()
    suggestions.push({
      key: 'ratedTorque',
      label: '额定起重力矩',
      value,
      confidence: 75,
      validation: { status: 'pending' },
      source: 'regex-weak',
    })
  }

  return suggestions
}

/** 统一入口 */
export function suggestFields(text: string, type: 'idCard' | 'nameplate'): Suggestion[] {
  return type === 'idCard' ? suggestIdCardFields(text) : suggestNameplateFields(text)
}

/** 高置信度阈值（与 ocr.service 保持一致） */
export const HIGH_CONFIDENCE_THRESHOLD = 80
