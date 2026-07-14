import { createWorker, PSM, type Worker } from 'tesseract.js'
import { OCRError } from '@/types/errors'
import { ID_CARD_FIELDS, NAMEPLATE_FIELDS, extractField, type FieldRule } from './ocr-mappings'
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

/** 单个字段的识别结果 */
export interface FieldResult {
  value: string
  confidence: number
  regex: string
  /** 语义校验结果（第三层校验） */
  validation?: ValidationResult
}

/** 身份证 OCR 识别结果 */
export interface IdCardResult {
  rawText: string
  confidence: number
  fields: {
    name?: FieldResult
    idNumber?: FieldResult
    gender?: FieldResult
    nation?: FieldResult
    address?: FieldResult
    birthDate?: FieldResult
  }
}

/** 铭牌 OCR 识别结果 */
export interface NameplateResult {
  rawText: string
  confidence: number
  fields: {
    serialNumber?: FieldResult
    model?: FieldResult
    /** 设备名称（铭牌英文 → 中文映射后） */
    deviceName?: FieldResult
  }
}

/** 保留旧接口兼容（已废弃，仅供测试过渡用） */
export interface IDCardInfo {
  name: string
  idNumber: string
  address: string
  gender: '男' | '女' | ''
}

/** 置信度阈值：低于此值直接抛错，不返回任何候选 */
const MIN_CONFIDENCE = 40

/** 高置信度阈值：> 80% 且校验通过 → 可直接自动填入 */
const HIGH_CONFIDENCE = 80

/** 铭牌置信度阈值 */
const NAMEPLATE_MIN_CONFIDENCE = 40

/** 图片压缩：长边最大像素 */
const MAX_IMAGE_DIMENSION = 1500

const LANG_ID_CARD = 'chi_sim'
const LANG_NAMEPLATE = 'chi_sim+eng'

/**
 * 图片压缩：长边缩到 MAX_IMAGE_DIMENSION 以内
 */
function resizeImage(file: File | Blob): Promise<Blob> {
  if (typeof HTMLCanvasElement === 'undefined') {
    return Promise.resolve(file)
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const { width, height } = img
      if (width <= MAX_IMAGE_DIMENSION && height <= MAX_IMAGE_DIMENSION) {
        resolve(file)
        return
      }
      const scale = MAX_IMAGE_DIMENSION / Math.max(width, height)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(width * scale)
      canvas.height = Math.round(height * scale)
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas 不可用')); return }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((blob) => {
        if (blob) resolve(blob)
        else reject(new Error('图片压缩失败'))
      }, file.type || 'image/jpeg', 0.85)
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('图片加载失败')) }
    img.src = url
  })
}

/**
 * 铭牌图片预处理：灰度化 + 对比度增强
 */
function preprocessForNameplate(file: Blob): Promise<Blob> {
  if (typeof HTMLCanvasElement === 'undefined') {
    return Promise.resolve(file)
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas 不可用')); return }
      ctx.drawImage(img, 0, 0)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data
      for (let i = 0; i < data.length; i += 4) {
        const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
        const enhanced = Math.min(255, Math.max(0, 128 + (gray - 128) * 1.5))
        data[i] = enhanced
        data[i + 1] = enhanced
        data[i + 2] = enhanced
      }
      ctx.putImageData(imageData, 0, 0)
      canvas.toBlob((blob) => {
        if (blob) resolve(blob)
        else reject(new Error('铭牌预处理失败'))
      }, 'image/jpeg', 0.9)
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('图片加载失败')) }
    img.src = url
  })
}

/**
 * 给字段附加校验结果
 * 校验失败 → confidence 降为 0
 */
function applyValidation(
  field: { value: string; confidence: number; regex: string },
  validation: ValidationResult,
): FieldResult {
  return {
    ...field,
    confidence: validation.status === 'invalid' ? 0 : field.confidence,
    validation,
  }
}

/**
 * 解析身份证 OCR 文本为结构化字段（新版，含置信度 + 语义校验）
 * 纯函数，便于单元测试
 */
export function parseIdCardText(text: string): IdCardResult {
  const fields: IdCardResult['fields'] = {}
  for (const rule of ID_CARD_FIELDS) {
    const extracted = extractField(text, rule)
    if (!extracted) continue

    let field: FieldResult = { ...extracted }
    // 调用对应 validator
    switch (rule.key) {
      case 'name':
        field = applyValidation(extracted, validateName(extracted.value))
        break
      case 'idNumber':
        field = applyValidation(extracted, validateIdCard(extracted.value))
        break
      case 'gender':
        field = applyValidation(extracted, validateGender(extracted.value))
        break
      case 'nation':
        field = applyValidation(extracted, validateNation(extracted.value))
        break
      case 'birthDate':
      case 'address':
        // 暂不强制校验，标记为 pending
        field = { ...extracted, validation: { status: 'pending' } }
        break
    }
    ;(fields as Record<string, FieldResult>)[rule.key] = field
  }
  // 整体置信度：取所有命中字段置信度的平均值，未命中任何字段则 0
  const hitFields = Object.values(fields).filter(Boolean) as FieldResult[]
  const confidence = hitFields.length > 0
    ? Math.round(hitFields.reduce((sum, f) => sum + f.confidence, 0) / hitFields.length)
    : 0
  return { rawText: text, confidence, fields }
}

/**
 * 解析铭牌 OCR 文本为结构化字段（新版，含置信度 + 语义校验 + 中英文映射）
 */
export function parseNameplateText(text: string): NameplateResult {
  const fields: NameplateResult['fields'] = {}
  for (const rule of NAMEPLATE_FIELDS) {
    const extracted = extractField(text, rule)
    if (!extracted) continue

    let field: FieldResult = { ...extracted }
    switch (rule.key) {
      case 'serialNumber':
        field = applyValidation(extracted, validateFactoryNumber(extracted.value))
        break
      case 'model':
        field = applyValidation(extracted, validateEquipmentModel(extracted.value))
        break
    }
    ;(fields as Record<string, FieldResult>)[rule.key] = field
  }

  // 设备名称提取：尝试从原文中匹配英文设备名并映射为中文
  const deviceNameField = extractDeviceName(text)
  if (deviceNameField) {
    fields.deviceName = deviceNameField
  }

  const hitFields = Object.values(fields).filter(Boolean) as FieldResult[]
  const confidence = hitFields.length > 0
    ? Math.round(hitFields.reduce((sum, f) => sum + f.confidence, 0) / hitFields.length)
    : 0
  return { rawText: text, confidence, fields }
}

/**
 * 从铭牌原文中提取设备名称
 * 优先级：英文设备名映射 → 中文设备名直接匹配
 */
function extractDeviceName(text: string): FieldResult | undefined {
  // 1. 先尝试英文 → 中文映射（如 "TOWER CRANE" → "塔式起重机"）
  const upperText = text.toUpperCase()
  const mapped = getCnByEn(upperText)
  if (mapped) {
    const validation = validateDeviceName(mapped)
    return {
      value: mapped,
      confidence: validation.status === 'valid' ? 85 : 0,
      regex: 'device-name-mapping',
      validation,
    }
  }

  // 2. 尝试从中文文本中匹配已知设备名
  // （从 device-name-mapping 的反向表中取中文）
  const cnNames = ['塔式起重机', '塔吊', '履带起重机', '履带吊', '汽车起重机', '汽车吊',
    '挖掘机', '装载机', '推土机', '压路机', '平地机', '混凝土泵车', '混凝土搅拌车',
    '混凝土搅拌站', '渣土车', '自卸汽车', '发电机', '空压机', '电焊机']
  for (const cn of cnNames) {
    if (text.includes(cn)) {
      const validation = validateDeviceName(cn)
      return {
        value: cn,
        confidence: validation.status === 'valid' ? 85 : 0,
        regex: 'device-name-cn-direct',
        validation,
      }
    }
  }

  return undefined
}

/**
 * 从设备铭牌文本中提取编号（旧版兼容，用于测试过渡）
 * 规则：优先取含字母+数字的混合串，其次取最长串
 */
export function extractEquipmentCode(text: string): string {
  const matches = text.match(/[A-Za-z0-9][A-Za-z0-9-]*[A-Za-z0-9]|[A-Za-z0-9]/g) ?? []
  const mixed = matches.filter((s) => /[0-9]/.test(s) && /[A-Za-z]/.test(s))
  const pool = mixed.length > 0 ? mixed : matches
  return pool.sort((a, b) => b.length - a.length)[0] ?? ''
}

class OCRService {
  private workerPool: Map<string, Worker> = new Map()

  /**
   * 识别身份证（新版）：返回完整结构化结果 + 置信度 + 校验状态
   * 置信度 < 40% 抛 OCRError
   */
  async recognizeIdCard(image: File | Blob | string): Promise<IdCardResult>
  /** 旧版兼容签名（已废弃） */
  async recognizeIdCard(image: File | Blob | string, legacy: true): Promise<IDCardInfo>
  async recognizeIdCard(image: File | Blob | string, legacy?: true): Promise<IdCardResult | IDCardInfo> {
    const compressed = image instanceof Blob ? await resizeImage(image) : image
    const { text } = await this.recognizeRaw(compressed, LANG_ID_CARD, MIN_CONFIDENCE, PSM.SINGLE_BLOCK)
    if (legacy) {
      const result = parseIdCardText(text)
      const gender = result.fields.gender?.value === '男' ? '男' : result.fields.gender?.value === '女' ? '女' : ''
      return {
        name: result.fields.name?.value ?? '',
        idNumber: result.fields.idNumber?.value ?? '',
        address: result.fields.address?.value ?? '',
        gender,
      }
    }
    return parseIdCardText(text)
  }

  /**
   * 识别设备铭牌（新版）：返回完整结构化结果 + 置信度 + 校验状态
   */
  async recognizeEquipmentNameplate(image: File | Blob | string): Promise<NameplateResult>
  /** 旧版兼容签名（已废弃） */
  async recognizeEquipmentNameplate(image: File | Blob | string, legacy: true): Promise<string>
  async recognizeEquipmentNameplate(image: File | Blob | string, legacy?: true): Promise<NameplateResult | string> {
    const compressed = image instanceof Blob ? await resizeImage(image) : image
    const preprocessed = compressed instanceof Blob ? await preprocessForNameplate(compressed) : compressed
    const { text } = await this.recognizeRaw(preprocessed, LANG_NAMEPLATE, NAMEPLATE_MIN_CONFIDENCE)
    if (legacy) {
      return extractEquipmentCode(text)
    }
    return parseNameplateText(text)
  }

  /**
   * 调用 tesseract.js 识别图片，返回文本与置信度
   */
  private async recognizeRaw(
    image: File | Blob | string,
    lang: string,
    minConfidence: number,
    psm?: PSM,
  ): Promise<{ text: string; confidence: number }> {
    const worker = await this.getWorker(lang, psm)
    const { data } = await worker.recognize(image)
    if (data.confidence < minConfidence) {
      throw new OCRError(`识别置信度过低: ${data.confidence}%`)
    }
    return { text: data.text, confidence: data.confidence }
  }

  /**
   * 单例 Worker 池：按 lang+psm 组合键复用
   */
  private async getWorker(lang: string, psm?: PSM): Promise<Worker> {
    const key = psm ? `${lang}@psm${psm}` : lang
    if (!this.workerPool.has(key)) {
      const worker = await createWorker(lang)
      if (psm !== undefined) {
        await worker.setParameters({ tessedit_pageseg_mode: psm })
      }
      this.workerPool.set(key, worker)
    }
    return this.workerPool.get(key)!
  }

  async terminate(): Promise<void> {
    for (const worker of this.workerPool.values()) {
      await worker.terminate()
    }
    this.workerPool.clear()
  }
}

export const ocrService = new OCRService()

/** 高置信度阈值导出（供 UI 组件判断是否自动填入） */
export const HIGH_CONFIDENCE_THRESHOLD = HIGH_CONFIDENCE
export const LOW_CONFIDENCE_THRESHOLD = MIN_CONFIDENCE

/** 仅供抑制未使用警告 */
export type { FieldRule }
