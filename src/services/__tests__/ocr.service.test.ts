import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { OCRError } from '@/types/errors'

/**
 * tesseract.js 模块 mock：避免测试时下载语言包和真实 OCR
 * 通过 mockText / mockConfidence 控制每次 recognize 的返回
 */
let mockText = ''
let mockConfidence = 100
let recognizeCallCount = 0
let createWorkerCallCount = 0

vi.mock('tesseract.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('tesseract.js')>()
  return {
    ...actual,
    createWorker: vi.fn(async () => {
      createWorkerCallCount++
      return {
        recognize: vi.fn(async () => {
          recognizeCallCount++
          return { data: { text: mockText, confidence: mockConfidence } }
        }),
        terminate: vi.fn(async () => undefined),
        setParameters: vi.fn(async () => undefined),
      }
    }),
  }
})

const { ocrService, parseIdCardText, parseNameplateText, extractEquipmentCode } = await import('@/services/ocr.service')
const { suggestNameplateFields } = await import('@/services/ocr-suggestions')

// 校验码正确的有效身份证号（GB 11643 算法验证通过）
// 532901 1990 01 01 123 → 校验位 0
const VALID_ID_1 = '532901199001011230'
// 110105 1990 02 02 234 → 校验位 7
const VALID_ID_2 = '110105199002022347'
// 532901 1990 01 01 129 → 校验位 X
const VALID_ID_X = '53290119900101129X'

describe('parseIdCardText (新版结构 + 语义校验)', () => {
  it('正向：标准身份证文本，提取全部字段且校验通过', () => {
    const text = `姓名张三\n性别男\n民族汉族\n出生1990年1月1日\n住址云南省大理市XX路123号\n公民身份号码${VALID_ID_1}`
    const result = parseIdCardText(text)
    expect(result.fields.name?.value).toBe('张三')
    expect(result.fields.name?.validation?.status).toBe('valid')
    expect(result.fields.idNumber?.value).toBe(VALID_ID_1)
    expect(result.fields.idNumber?.validation?.status).toBe('valid')
    expect(result.fields.gender?.value).toBe('男')
    expect(result.fields.gender?.validation?.status).toBe('valid')
    expect(result.fields.nation?.value).toBe('汉族')
    expect(result.fields.nation?.validation?.status).toBe('valid')
    expect(result.fields.birthDate?.value).toBe('1990年1月1日')
  })

  it('正向：带冒号分隔的标签', () => {
    const text = `姓名:李四\n住址:北京市朝阳区XX路456号\n身份证号:${VALID_ID_2}`
    const result = parseIdCardText(text)
    expect(result.fields.name?.value).toBe('李四')
    expect(result.fields.name?.validation?.status).toBe('valid')
    expect(result.fields.idNumber?.value).toBe(VALID_ID_2)
    expect(result.fields.idNumber?.validation?.status).toBe('valid')
  })

  it('正向：身份证号末位为 X 且校验通过', () => {
    const text = `姓名赵六 ${VALID_ID_X}`
    const result = parseIdCardText(text)
    expect(result.fields.idNumber?.value).toBe(VALID_ID_X)
    expect(result.fields.idNumber?.validation?.status).toBe('valid')
  })

  it('正向：识别到女性', () => {
    const text = `姓名钱七 性别女 ${VALID_ID_1}`
    const result = parseIdCardText(text)
    expect(result.fields.gender?.value).toBe('女')
    expect(result.fields.gender?.validation?.status).toBe('valid')
  })

  it('置信度：标签命中时字段置信度更高', () => {
    const text = `姓名张三 ${VALID_ID_1}`
    const result = parseIdCardText(text)
    expect(result.fields.name?.confidence).toBeGreaterThanOrEqual(80)
    expect(result.fields.idNumber?.confidence).toBeGreaterThanOrEqual(85)
  })

  it('校验失败：姓名首字不在百家姓（"妆名"误识）', () => {
    const text = `姓名妆名 ${VALID_ID_1}`
    const result = parseIdCardText(text)
    expect(result.fields.name?.value).toBe('妆名')
    // 校验失败 → confidence 降为 0
    expect(result.fields.name?.confidence).toBe(0)
    expect(result.fields.name?.validation?.status).toBe('invalid')
    expect(result.fields.name?.validation?.reason).toContain('不是常见姓氏')
  })

  it('校验失败：身份证号校验码不匹配', () => {
    // 532901199001011234 末位应为 0，实际为 4
    const text = `姓名张三 532901199001011234`
    const result = parseIdCardText(text)
    expect(result.fields.idNumber?.value).toBe('532901199001011234')
    expect(result.fields.idNumber?.confidence).toBe(0)
    expect(result.fields.idNumber?.validation?.status).toBe('invalid')
    expect(result.fields.idNumber?.validation?.reason).toContain('校验码不匹配')
  })

  it('校验失败：性别字段非"男/女"', () => {
    const text = `姓名张三 性别南 ${VALID_ID_1}`
    const result = parseIdCardText(text)
    expect(result.fields.gender?.value).toBe('南')
    expect(result.fields.gender?.confidence).toBe(0)
    expect(result.fields.gender?.validation?.status).toBe('invalid')
  })

  it('边界：空字符串，无字段命中', () => {
    const result = parseIdCardText('')
    expect(result.confidence).toBe(0)
    expect(result.fields.name).toBeUndefined()
    expect(result.fields.idNumber).toBeUndefined()
  })

  it('边界：超长乱码文本，不抛错', () => {
    const text = 'x'.repeat(10000)
    const result = parseIdCardText(text)
    expect(result.confidence).toBe(0)
  })
})

describe('parseNameplateText (含校验 + 设备名称映射)', () => {
  it('正向：带标签的铭牌文本，校验通过', () => {
    const text = '型号 QTZ80B 出厂编号 TC202300123'
    const result = parseNameplateText(text)
    expect(result.fields.serialNumber?.value).toBe('TC202300123')
    expect(result.fields.serialNumber?.validation?.status).toBe('valid')
    expect(result.fields.model?.value).toBe('QTZ80B')
    expect(result.fields.model?.validation?.status).toBe('valid')
  })

  it('正向：含连字符编号', () => {
    const text = '编号 XA-2024-001 型号 QTZ80'
    const result = parseNameplateText(text)
    expect(result.fields.serialNumber?.value).toBe('XA-2024-001')
    expect(result.fields.serialNumber?.validation?.status).toBe('valid')
    expect(result.fields.model?.value).toBe('QTZ80')
    expect(result.fields.model?.validation?.status).toBe('valid')
  })

  it('正向：英文设备名映射为中文', () => {
    const text = 'TOWER CRANE\n型号 QTZ80\n出厂编号 TC202300123'
    const result = parseNameplateText(text)
    expect(result.fields.deviceName?.value).toBe('塔式起重机')
    expect(result.fields.deviceName?.validation?.status).toBe('valid')
    expect(result.fields.deviceName?.confidence).toBeGreaterThanOrEqual(80)
  })

  it('正向：中文设备名直接识别', () => {
    const text = '塔式起重机\n型号 QTZ80\n出厂编号 TC202300123'
    const result = parseNameplateText(text)
    expect(result.fields.deviceName?.value).toBe('塔式起重机')
    expect(result.fields.deviceName?.validation?.status).toBe('valid')
  })

  it('校验失败：型号不符合命名规则', () => {
    const text = '型号 XYZ 出厂编号 TC202300123'
    const result = parseNameplateText(text)
    expect(result.fields.model?.value).toBe('XYZ')
    expect(result.fields.model?.confidence).toBe(0)
    expect(result.fields.model?.validation?.status).toBe('invalid')
  })

  it('校验失败：出厂编号不含数字', () => {
    const text = '型号 QTZ80 出厂编号 ABCDEF'
    const result = parseNameplateText(text)
    expect(result.fields.serialNumber?.value).toBe('ABCDEF')
    expect(result.fields.serialNumber?.confidence).toBe(0)
    expect(result.fields.serialNumber?.validation?.status).toBe('invalid')
  })

  it('边界：纯中文无字母数字', () => {
    const result = parseNameplateText('设备铭牌编号出厂日期')
    expect(result.fields.serialNumber).toBeUndefined()
    expect(result.fields.model).toBeUndefined()
    expect(result.confidence).toBe(0)
  })
})

describe('extractEquipmentCode (旧版兼容)', () => {
  it('正向：优先取含字母+数字的混合串', () => {
    const text = '序列号 12345678901 型号 XA2024'
    expect(extractEquipmentCode(text)).toBe('XA2024')
  })

  it('正向：含连字符的编号整体提取', () => {
    expect(extractEquipmentCode('编号 XA-2024-001')).toBe('XA-2024-001')
  })

  it('边界：空字符串返回空', () => {
    expect(extractEquipmentCode('')).toBe('')
  })

  it('边界：纯中文返回空', () => {
    expect(extractEquipmentCode('设备铭牌编号出厂日期')).toBe('')
  })
})

describe('ocrService.recognizeIdCard (新版)', () => {
  beforeEach(() => {
    mockText = ''
    mockConfidence = 100
    recognizeCallCount = 0
    createWorkerCallCount = 0
  })

  afterEach(async () => {
    await ocrService.terminate()
  })

  it('正向：高置信度返回结构化结果，校验通过', async () => {
    mockText = `姓名张三 性别男 住址云南省大理市 ${VALID_ID_1}`
    mockConfidence = 90
    const result = await ocrService.recognizeIdCard(new Blob())
    expect(result.fields.name?.value).toBe('张三')
    expect(result.fields.name?.validation?.status).toBe('valid')
    expect(result.fields.idNumber?.value).toBe(VALID_ID_1)
    expect(result.fields.idNumber?.validation?.status).toBe('valid')
    expect(result.confidence).toBeGreaterThan(0)
  })

  it('异常：置信度低于 40% 抛 OCRError', async () => {
    mockText = '乱码内容'
    mockConfidence = 30
    await expect(ocrService.recognizeIdCard(new Blob())).rejects.toThrow(OCRError)
  })

  it('边界：置信度等于 40% 不抛错', async () => {
    mockText = `姓名张三 ${VALID_ID_1}`
    mockConfidence = 40
    const result = await ocrService.recognizeIdCard(new Blob())
    expect(result.fields.name?.value).toBe('张三')
  })

  it('Worker 池复用：同语言多次识别只创建一次 worker', async () => {
    mockText = `姓名张三 ${VALID_ID_1}`
    mockConfidence = 90
    await ocrService.recognizeIdCard(new Blob())
    await ocrService.recognizeIdCard(new Blob())
    await ocrService.recognizeIdCard(new Blob())
    expect(createWorkerCallCount).toBe(1)
    expect(recognizeCallCount).toBe(3)
  })
})

describe('ocrService.recognizeEquipmentNameplate (新版)', () => {
  beforeEach(() => {
    mockText = ''
    mockConfidence = 100
    createWorkerCallCount = 0
  })

  afterEach(async () => {
    await ocrService.terminate()
  })

  it('正向：高置信度返回铭牌结构化结果，校验通过', async () => {
    mockText = '型号 QTZ80B 出厂编号 TC202300123'
    mockConfidence = 85
    const result = await ocrService.recognizeEquipmentNameplate(new Blob())
    expect(result.fields.serialNumber?.value).toBe('TC202300123')
    expect(result.fields.serialNumber?.validation?.status).toBe('valid')
    expect(result.fields.model?.value).toBe('QTZ80B')
    expect(result.fields.model?.validation?.status).toBe('valid')
  })

  it('正向：英文设备名映射为中文', async () => {
    mockText = 'TOWER CRANE\n型号 QTZ80\n出厂编号 TC202300123'
    mockConfidence = 85
    const result = await ocrService.recognizeEquipmentNameplate(new Blob())
    expect(result.fields.deviceName?.value).toBe('塔式起重机')
    expect(result.fields.deviceName?.validation?.status).toBe('valid')
  })

  it('异常：置信度低于 40% 抛 OCRError', async () => {
    mockText = '模糊内容'
    mockConfidence = 30
    await expect(ocrService.recognizeEquipmentNameplate(new Blob())).rejects.toThrow(OCRError)
  })

  it('边界：空文本不抛错', async () => {
    mockText = ''
    mockConfidence = 95
    const result = await ocrService.recognizeEquipmentNameplate(new Blob())
    expect(result.confidence).toBe(0)
  })
})

describe('suggestNameplateFields — v5.0 Day 2 收尾新增 4 字段', () => {
  it('识别"设备编号 20914"→code="20914"', () => {
    const text = '塔式起重机\n型号 QTZ80\n设备编号 20914\n制造许可证号 TS 2410383-2022'
    const suggestions = suggestNameplateFields(text)
    const codeSuggestion = suggestions.find((s) => s.key === 'code')
    expect(codeSuggestion).toBeDefined()
    expect(codeSuggestion?.value).toBe('20914')
  })

  it('识别"制造许可证号 TS 2410383-2022"→manufactureLicense="TS 2410383-2022"', () => {
    const text = '塔式起重机\n型号 QTZ80\n设备编号 20914\n制造许可证号 TS 2410383-2022'
    const suggestions = suggestNameplateFields(text)
    const licenseSuggestion = suggestions.find((s) => s.key === 'manufactureLicense')
    expect(licenseSuggestion).toBeDefined()
    // TS 后面有空格，被 trim 为单空格
    expect(licenseSuggestion?.value).toBe('TS 2410383-2022')
  })

  it('识别"额定起重力矩 800 kN·m"→ratedTorque 含 800', () => {
    const text = '塔式起重机\n型号 QTZ80\n额定起重力矩 800 kN·m\n制造许可证号 TS 2410383-2022'
    const suggestions = suggestNameplateFields(text)
    const torqueSuggestion = suggestions.find((s) => s.key === 'ratedTorque')
    expect(torqueSuggestion).toBeDefined()
    expect(torqueSuggestion?.value).toMatch(/800/)
    expect(torqueSuggestion?.value).toMatch(/kN/i)
  })

  it('识别"制造商 中联重科"→manufacturer="中联重科"', () => {
    const text = '塔式起重机\n型号 QTZ80\n制造商 中联重科股份有限公司'
    const suggestions = suggestNameplateFields(text)
    const mfrSuggestion = suggestions.find((s) => s.key === 'manufacturer')
    expect(mfrSuggestion).toBeDefined()
    expect(mfrSuggestion?.value).toContain('中联重科')
  })

  it('无铭牌关键字段 → 4 个新字段都不返回', () => {
    const text = '塔式起重机\n型号 QTZ80'
    const suggestions = suggestNameplateFields(text)
    expect(suggestions.find((s) => s.key === 'code')).toBeUndefined()
    expect(suggestions.find((s) => s.key === 'manufacturer')).toBeUndefined()
    expect(suggestions.find((s) => s.key === 'manufactureLicense')).toBeUndefined()
    expect(suggestions.find((s) => s.key === 'ratedTorque')).toBeUndefined()
  })
})
