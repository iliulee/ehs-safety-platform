import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import { templateRepo } from '@/db/repositories/template.repo'
import { settingsRepo } from '@/db/repositories'
import { projectService } from '@/services/projectService'
import { workerService } from '@/services/workerService'
import { hazardService } from '@/services/hazardService'
import { educationService } from '@/services/educationService'
import { trainingService } from '@/services/trainingService'
import type { VariableMapping } from '@/types'
import JSZip from 'jszip'

export interface RenderContext {
  projectId?: string
  manualValues?: Record<string, string>
}

export interface RenderResult {
  blob: Blob | null
  fileName: string
  manualVariables: VariableMapping[]
  missingRequired: string[]
}

function formatDate(
  value: Date | string | number | undefined | null,
  fmt = 'YYYY-MM-DD',
): string {
  if (value === undefined || value === null || value === '') return ''
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  const map: Record<string, string> = {
    YYYY: String(d.getFullYear()),
    MM: String(d.getMonth() + 1).padStart(2, '0'),
    DD: String(d.getDate()).padStart(2, '0'),
    HH: String(d.getHours()).padStart(2, '0'),
    mm: String(d.getMinutes()).padStart(2, '0'),
  }
  return fmt.replace(/YYYY|MM|DD|HH|mm/g, (k) => map[k] ?? k)
}

async function resolveRelatedList(queryKey: string, projectId?: string): Promise<unknown[]> {
  const lower = queryKey.toLowerCase()
  if (lower.includes('hazard')) return hazardService.list(projectId)
  if (lower.includes('worker')) return workerService.list(projectId)
  if (lower.includes('education')) return educationService.list(projectId)
  if (lower.includes('training')) return trainingService.list(projectId)
  return []
}

async function getProject(ctx: RenderContext) {
  if (ctx.projectId) {
    return projectService.getById(ctx.projectId)
  }
  return projectService.getCurrent()
}

async function resolveFieldValue(project: unknown, mapping: VariableMapping): Promise<unknown> {
  if (!mapping.field) return ''
  const value = (project as Record<string, unknown>)[mapping.field]
  if (mapping.field.toLowerCase().includes('date')) {
    return formatDate(value as Date, mapping.format)
  }
  return value ?? ''
}

function evaluateFormula(expr: string, data: Record<string, unknown>): string {
  const tokens = expr.split(/\s*\+\s*/)
  return tokens
    .map((token) => {
      const quoted = token.match(/^"(.*)"$/)
      if (quoted) return quoted[1]
      const key = token.trim()
      const value = data[key]
      if (value === undefined || value === null) return ''
      if (typeof value === 'string' && value.toLowerCase().includes('date')) {
        // value was already formatted by resolveValue
        return value
      }
      return String(value)
    })
    .join('')
}

async function resolveValue(
  mapping: VariableMapping,
  ctx: RenderContext,
  siblingData: Record<string, unknown>,
): Promise<unknown> {
  switch (mapping.source) {
    case 'field': {
      if (!mapping.table || !mapping.field) return ''
      if (mapping.table !== 'projects') return ''
      const project = await getProject(ctx)
      if (!project) return ''
      return resolveFieldValue(project, mapping)
    }
    case 'extraField': {
      if (!mapping.extraFieldKey) return ''
      const project = await getProject(ctx)
      if (!project) return ''
      const extra = (project as { extraFields?: Record<string, string> }).extraFields ?? {}
      return extra[mapping.extraFieldKey] ?? ''
    }
    case 'formula': {
      if (!mapping.expr) return ''
      return evaluateFormula(mapping.expr, siblingData)
    }
    case 'currentDate':
      return formatDate(new Date(), mapping.format)
    case 'currentUser': {
      const user = await settingsRepo.get('currentUser')
      return user ?? '当前用户'
    }
    case 'related': {
      if (!mapping.queryKey) return []
      const list = await resolveRelatedList(mapping.queryKey, ctx.projectId)
      return list.map((item) => flattenRecord(item as Record<string, unknown>))
    }
    case 'manual': {
      // 优先使用本次传入的手动值，其次使用变量映射中保存的默认值
      const manual = ctx.manualValues?.[mapping.name]
      if (manual !== undefined && manual !== '') return manual
      return mapping.defaultValue ?? ''
    }
    case 'statistic':
    case 'ai':
    default:
      return ''
  }
}

function flattenRecord(record: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  Object.entries(record).forEach(([key, value]) => {
    if (value instanceof Date) {
      out[key] = formatDate(value)
    } else {
      out[key] = value
    }
  })
  return out
}

export async function renderSingle(
  templateId: string,
  ctx: RenderContext = {},
): Promise<RenderResult> {
  const template = await templateRepo.getById(templateId)
  if (!template) throw new Error('模板不存在')
  if (!template.content) {
    throw new Error('模板没有文件内容，请先上传或导入 Word 模板文件')
  }

  const mappings = template.variableMappings ?? []
  const manualVariables: VariableMapping[] = []
  const missingRequired: string[] = []
  const data: Record<string, unknown> = {}

  for (const m of mappings) {
    if (m.source === 'manual') {
      const provided = ctx.manualValues?.[m.name]
      const fallback = m.defaultValue ?? ''
      if (provided !== undefined && provided !== '') {
        data[m.name] = provided
      } else if (fallback !== '') {
        data[m.name] = fallback
      } else {
        manualVariables.push(m)
      }
      continue
    }

    if (m.source === 'formula') continue

    const value = await resolveValue(m, ctx, data)
    if ((value === undefined || value === null || value === '') && m.required) {
      missingRequired.push(m.label ?? m.name)
    }
    data[m.name] = value
  }

  for (const m of mappings.filter((m) => m.source === 'formula')) {
    const value = await resolveValue(m, ctx, data)
    if ((value === undefined || value === null || value === '') && m.required) {
      missingRequired.push(m.label ?? m.name)
    }
    data[m.name] = value
  }

  if (manualVariables.length > 0 || missingRequired.length > 0) {
    return {
      blob: null,
      fileName: template.name,
      manualVariables,
      missingRequired,
    }
  }

  const zip = new PizZip(template.content, { base64: true })
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: '{{', end: '}}' },
  } as Record<string, unknown>)
  doc.setData(data)
  doc.render()

  const blob = doc.getZip().generate({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  }) as Blob

  const fileName = `${template.name}_${formatDate(new Date())}.docx`
  return { blob, fileName, manualVariables: [], missingRequired: [] }
}

export async function generateAndDownload(
  templateId: string,
  ctx: RenderContext = {},
): Promise<RenderResult> {
  const result = await renderSingle(templateId, ctx)
  if (!result.blob) return result

  const url = URL.createObjectURL(result.blob)
  const a = document.createElement('a')
  a.href = url
  a.download = result.fileName
  a.click()
  URL.revokeObjectURL(url)
  return result
}

export interface BatchRenderResult {
  success: number
  skipped: number
  failed: number
  zipBlob: Blob | null
  errors: string[]
  details: Array<{
    templateId: string
    fileName: string
    status: 'success' | 'skipped' | 'failed'
    error?: string
  }>
}

export async function renderBatch(
  templateIds: string[],
  ctx: RenderContext = {},
): Promise<BatchRenderResult> {
  const result: BatchRenderResult = {
    success: 0,
    skipped: 0,
    failed: 0,
    zipBlob: null,
    errors: [],
    details: [],
  }

  if (templateIds.length === 0) return result

  const zip = new JSZip()

  for (const templateId of templateIds) {
    const template = await templateRepo.getById(templateId)
    if (!template) {
      result.failed++
      result.errors.push(`模板不存在：${templateId}`)
      result.details.push({ templateId, fileName: '', status: 'failed', error: '模板不存在' })
      continue
    }

    try {
      const singleResult = await renderSingle(templateId, ctx)
      if (!singleResult.blob) {
        result.skipped++
        const reason = singleResult.manualVariables.length > 0
          ? '需要手动填写变量'
          : `缺少必填变量：${singleResult.missingRequired.join('、')}`
        result.errors.push(`${template.name}：${reason}`)
        result.details.push({ templateId, fileName: template.name, status: 'skipped', error: reason })
        continue
      }
      const safeName = singleResult.fileName.replace(/[\\/:*?"<>|]/g, '_')
      zip.file(safeName, singleResult.blob)
      result.success++
      result.details.push({ templateId, fileName: singleResult.fileName, status: 'success' })
    } catch (err) {
      result.failed++
      const msg = err instanceof Error ? err.message : '生成失败'
      result.errors.push(`${template.name}：${msg}`)
      result.details.push({ templateId, fileName: template.name, status: 'failed', error: msg })
    }
  }

  if (result.success > 0) {
    result.zipBlob = await zip.generateAsync({ type: 'blob' })
  }

  return result
}

export async function batchGenerateAndDownload(
  templateIds: string[],
  ctx: RenderContext = {},
): Promise<BatchRenderResult> {
  const result = await renderBatch(templateIds, ctx)
  if (!result.zipBlob) return result

  const zipName = `批量生成_${formatDate(new Date())}.zip`
  const url = URL.createObjectURL(result.zipBlob)
  const a = document.createElement('a')
  a.href = url
  a.download = zipName
  a.click()
  URL.revokeObjectURL(url)
  return result
}
