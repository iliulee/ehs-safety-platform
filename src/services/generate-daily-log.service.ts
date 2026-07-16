import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
import type { ParsedDailyData } from '@/services/ai-parser.service'
import { variableSettingsService, resolveVariableValue } from '@/services/variable-settings.service'
import { projectService } from '@/services/projectService'
import dailyLogTemplateUrl from '@/templates/daily-log-template.docx?url'

/**
 * 安全施工日志 Word 生成服务
 *
 * 不走数据库模板系统：daily-log-template.docx 是内置固定模板，
 * 直接 fetch + docxtemplater 渲染 + 自动下载。
 *
 * 模板变量：
 *   - 日报数据：{{date}} {{weather}} {{temperature}} {{workContent}} {{safetyMeasures}} {{issues}}
 *   - 内置变量：{{项目名称}} {{项目经理}} 等 23 个（从项目信息解析）
 */
export interface GenerateDailyLogOptions {
  data: ParsedDailyData
  fileName?: string
  projectId?: string
}

export interface GenerateDailyLogResult {
  blob: Blob
  fileName: string
  residualVariables: string[]
}

// 模板文件 URL 缓存（避免重复 fetch）
let cachedTemplateBuffer: ArrayBuffer | null = null

async function loadTemplate(): Promise<ArrayBuffer> {
  if (cachedTemplateBuffer) return cachedTemplateBuffer
  const resp = await fetch(dailyLogTemplateUrl)
  if (!resp.ok) {
    throw new Error(`加载内置模板失败：${resp.status} ${resp.statusText}`)
  }
  cachedTemplateBuffer = await resp.arrayBuffer()
  return cachedTemplateBuffer
}

/**
 * 从 ParsedDailyData 组装 docxtemplater 渲染数据
 * 字段对齐：AI 拆解结果 → 模板变量
 */
function buildRenderData(parsed: ParsedDailyData): Record<string, unknown> {
  const log = parsed.dailyLog
  return {
    date: log?.date ?? '',
    weather: log?.weather ?? '',
    temperature: log?.temperature ?? '',
    workContent: log?.workContent ?? '',
    safetyMeasures: log?.safetyMeasures ?? '',
    issues: log?.issues ?? '',
  }
}

/**
 * 解析内置变量（项目名称、项目经理等 23 个）
 * 从 variableSettingsService 拿变量清单 + projectService 拿项目信息
 * 失败时返回空对象，不阻塞生成
 */
async function resolveBuiltinVariables(projectId?: string): Promise<Record<string, string>> {
  try {
    const [variables, project] = await Promise.all([
      variableSettingsService.list(),
      projectId ? projectService.getById(projectId) : projectService.getCurrent(),
    ])
    const result: Record<string, string> = {}
    for (const v of variables) {
      const val = resolveVariableValue(v, project ?? null)
      if (val) result[v.id] = val
    }
    return result
  } catch (err) {
    console.error('[generate-daily-log] 解析内置变量失败', err)
    return {}
  }
}

/**
 * 生成安全施工日志 Word
 *
 * @throws Error 模板加载失败或 docxtemplater 渲染失败
 */
export async function generateDailyLogWord(
  options: GenerateDailyLogOptions,
): Promise<GenerateDailyLogResult> {
  const { data, fileName, projectId } = options
  const buffer = await loadTemplate()

  // PizZip 接收 binary string 或 Uint8Array
  const zip = new PizZip(buffer, { base64: false } as PizZip.LoadOptions)
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: '{{', end: '}}' },
  } as Record<string, unknown>)

  // 合并日报数据 + 内置变量（项目名称、项目经理等 23 个）
  const renderData = buildRenderData(data)
  const builtinVars = await resolveBuiltinVariables(projectId)
  Object.assign(renderData, builtinVars)
  doc.setData(renderData)
  doc.render()

  // 检测残留变量
  const outputZip = doc.getZip()
  const outputText = outputZip.generate({ type: 'string' })
  const residualRegex = /\{\{(.+?)\}\}/g
  const residualVars = new Set<string>()
  let match: RegExpExecArray | null
  while ((match = residualRegex.exec(outputText)) !== null) {
    residualVars.add(match[1].trim())
  }
  if (residualVars.size > 0) {
    console.warn('[generateDailyLogWord] 残留变量:', Array.from(residualVars))
  }

  const blob = outputZip.generate({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  }) as Blob

  const today = new Date()
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const finalFileName = fileName ?? `安全施工日志_${data.dailyLog?.date ?? dateStr}.docx`

  return {
    blob,
    fileName: finalFileName,
    residualVariables: residualVars.size > 0 ? Array.from(residualVars) : [],
  }
}

/**
 * 生成并触发浏览器下载
 */
export async function generateAndDownloadDailyLog(
  options: GenerateDailyLogOptions,
): Promise<GenerateDailyLogResult> {
  const result = await generateDailyLogWord(options)
  const url = URL.createObjectURL(result.blob)
  const a = document.createElement('a')
  a.href = url
  a.download = result.fileName
  a.click()
  URL.revokeObjectURL(url)
  return result
}
