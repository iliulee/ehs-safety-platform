import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import { generateId } from '@/db'
import { categoryRepo } from '@/db/repositories/category.repo'
import { templateRepo } from '@/db/repositories/template.repo'
import { variableSettingsService } from '@/services/variable-settings.service'
import { ragKnowledgeService } from '@/services/rag-knowledge.service'
import type { CategoryRecord, Template, VariableMapping } from '@/types'

export interface ScanFile {
  file: File
  path: string[]
}

export interface FailedScanItem {
  fileName: string
  relativePath: string
  reason: string
}

export interface ImportPreviewItem {
  id: string
  kind: 'template' | 'knowledge'
  file: File
  fileName: string
  relativePath: string
  fileSize: number
  categoryId: string
  categoryName: string
  variables: string[]
  mappings: VariableMapping[]
  knowledgeCategory: string
  status: 'new' | 'duplicate'
}

export interface ImportResult {
  success: number
  skipped: number
  failed: number
  errors: string[]
  failedItems: FailedScanItem[]
}

export interface ScanProgress {
  total: number
  processed: number
  currentFile: string
}

export type ScanProgressCallback = (progress: ScanProgress) => void

// 模板库直接支持的格式
const TEMPLATE_EXTS = ['.docx', '.xls', '.xlsx']
// 知识库支持的格式
const KNOWLEDGE_EXTS = ['.pdf', '.txt', '.md', '.docx']
// 扫描时会识别但明确不支持、需要记录到失败列表的格式（如旧版 .doc 需要 WPS/Office 转换）
const UNSUPPORTED_EXTS = ['.doc']

let scanCancelled = false

function isTemplateFile(name: string): boolean {
  return TEMPLATE_EXTS.some((ext) => name.toLowerCase().endsWith(ext))
}

function isKnowledgeFile(name: string): boolean {
  return KNOWLEDGE_EXTS.some((ext) => name.toLowerCase().endsWith(ext))
}

function isUnsupportedFile(name: string): boolean {
  return UNSUPPORTED_EXTS.some((ext) => name.toLowerCase().endsWith(ext))
}

function isScannableFile(name: string): boolean {
  return isTemplateFile(name) || isKnowledgeFile(name) || isUnsupportedFile(name)
}

function determineFileType(name: string): 'template' | 'knowledge' | 'unsupported' {
  if (isTemplateFile(name)) return 'template'
  if (isKnowledgeFile(name)) return 'knowledge'
  return 'unsupported'
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const buf = reader.result as ArrayBuffer
      const bytes = new Uint8Array(buf)
      let binary = ''
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i])
      }
      resolve(btoa(binary))
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

async function extractVariables(file: File): Promise<string[]> {
  const name = file.name.toLowerCase()
  const buf = await file.arrayBuffer()
  const zip = new PizZip(buf)
  const vars = new Set<string>()

  if (name.endsWith('.docx')) {
    try {
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
      } as Record<string, unknown>)
      const compiled = (doc as unknown as { compiled: Record<string, { tag?: string }> }).compiled
      const walk = (obj: unknown) => {
        if (!obj || typeof obj !== 'object') return
        if (Array.isArray(obj)) {
          obj.forEach(walk)
          return
        }
        const record = obj as Record<string, unknown>
        if (record.tag && typeof record.tag === 'string') {
          addCleanVar(record.tag, vars)
        }
        Object.values(record).forEach(walk)
      }
      walk(compiled)
    } catch {
      // 部分非标准 docx 可能解析失败，继续用正则兜底
    }

    const xml = zip.files['word/document.xml']?.asText() ?? ''

    // 修复 Word XML 分片问题：把相邻 <w:t> 文本合并后再匹配变量
    const mergedText = mergeXmlTextNodes(xml)
    const regex = /\{\{([#/%]?)([^}|]+)(?:\|[^}]*)?\}\}/g
    let match: RegExpExecArray | null
    while ((match = regex.exec(mergedText)) !== null) {
      addCleanVar(match[2], vars)
    }
  } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    // Excel 模板变量识别：遍历所有 worksheet 和 sharedStrings
    extractVariablesFromXlsx(zip, vars)
  }

  return Array.from(vars)
}

/**
 * 合并 Word document.xml 中相邻的 <w:t> 文本节点。
 *
 * Word 经常把同一段文字拆成多个 <w:t> 片段（例如用户输入时触发了拼写检查、
 * 格式变化或自动更正），导致 `{{projectName}}` 被拆成 `{{proj` + `ectName}}`。
 * 先把所有 <w:t> 内容按顺序拼接成一个长字符串，再跑正则，就能识别跨片段变量。
 */
function mergeXmlTextNodes(xml: string): string {
  // 匹配 <w:t ...>...</w:t>，包括可能带 xml:space="preserve"
  const textRegex = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g
  const parts: string[] = []
  let m: RegExpExecArray | null
  while ((m = textRegex.exec(xml)) !== null) {
    parts.push(m[1])
  }
  return parts.join('')
}

function extractVariablesFromXlsx(zip: PizZip, vars: Set<string>): void {
  // sharedStrings.xml 保存了 Excel 所有共享字符串
  const sharedStrings = zip.files['xl/sharedStrings.xml']?.asText() ?? ''
  const merged = sharedStrings.replace(/<[^>]+>/g, '')
  const regex = /\{\{([#/%]?)([^}|]+)(?:\|[^}]*)?\}\}/g
  let match: RegExpExecArray | null
  while ((match = regex.exec(merged)) !== null) {
    addCleanVar(match[2], vars)
  }

  // 兜底：遍历每个 worksheet
  const sheetRegex = /xl\/worksheets\/sheet\d+\.xml/
  for (const key of Object.keys(zip.files)) {
    if (sheetRegex.test(key)) {
      const xml = zip.files[key]?.asText() ?? ''
      const text = xml.replace(/<[^>]+>/g, '')
      let m: RegExpExecArray | null
      while ((m = regex.exec(text)) !== null) {
        addCleanVar(m[2], vars)
      }
    }
  }
}

function addCleanVar(raw: string, vars: Set<string>): void {
  const name = raw.trim().replace(/^[#/%]/, '').split('|')[0].trim()
  if (name && !name.includes(' ') && !name.includes('/')) {
    vars.add(name)
  }
}

async function inferMapping(name: string): Promise<VariableMapping> {
  const lower = name.toLowerCase()

  const globals = await variableSettingsService.list()
  // 匹配规则：英文变量名（小写）或中文标签
  const matched = globals.find(
    (g) => g.id.toLowerCase() === lower || g.label === name
  )
  if (matched) {
    let source: VariableMapping['source'] = 'manual'
    if (matched.source === 'project') {
      source = matched.extraFieldKey ? 'extraField' : 'field'
    } else if (matched.source === 'currentDate') {
      source = 'currentDate'
    }
    const base: VariableMapping = {
      name,
      label: matched.label,
      source,
      required: matched.source !== 'currentDate',
    }
    if (source === 'field' && matched.projectField) {
      base.field = matched.projectField
    }
    if (source === 'extraField' && matched.extraFieldKey) {
      base.extraFieldKey = matched.extraFieldKey
    }
    return base
  }

  if (name === '当前日期' || lower === 'currentdate') {
    return { name, label: '当前日期', source: 'currentDate', required: false }
  }
  if (name === '当前用户' || lower === 'currentuser') {
    return { name, label: '当前用户', source: 'currentUser', required: false }
  }
  if (lower.endsWith('list') || name.endsWith('列表')) {
    return { name, label: name, source: 'related', queryKey: lower, required: false }
  }
  return { name, label: name, source: 'manual', required: false }
}

// 知识库分类与模板分类名称映射：扫描文件夹时，PDF/txt/md 进入知识库同名分类
const KNOWLEDGE_CATEGORY_FALLBACK = 'custom'

async function defaultCategory(): Promise<{ id: string; name: string }> {
  return ensureRootUncategorized()
}

async function ensureRootCategory(name: string): Promise<string> {
  const all = await categoryRepo.getAll()
  const existing = all.find((c) => c.parentId === null && c.name === name)
  if (existing) return existing.id!
  return categoryRepo.createCustom(name, null)
}

async function ensureRootUncategorized(): Promise<{ id: string; name: string }> {
  const id = await ensureRootCategory('未分类')
  return { id, name: '未分类' }
}

async function ensureSubCategory(parentId: string, name: string): Promise<string> {
  const siblings = await categoryRepo.getChildren(parentId)
  const existing = siblings.find((s) => s.name === name)
  if (existing) return existing.id!
  return categoryRepo.createCustom(name, parentId)
}

/**
 * 根据本地文件夹路径解析模板分类。
 * 扫描模式下，用文件夹第一级作为根分类，后续层级作为子分类，保留原文件夹层级。
 */
async function resolveCategory(
  path: string[],
  scanMode: boolean,
): Promise<{ id: string; name: string }> {
  if (path.length === 0) {
    return scanMode ? ensureRootUncategorized() : defaultCategory()
  }

  if (scanMode) {
    let currentId = await ensureRootCategory(path[0])
    for (let i = 1; i < path.length; i++) {
      currentId = await ensureSubCategory(currentId, path[i])
    }
    const final = await categoryRepo.getById(currentId)
    return { id: currentId, name: final?.name ?? path[path.length - 1] }
  }

  const first = path[0]
  const codeMatch = first.match(/^(A[1-9]|A1[0-5])_/)
  let parent: CategoryRecord | undefined

  if (codeMatch) {
    parent = await categoryRepo.getByCode(codeMatch[1])
  }
  if (!parent) {
    const all = await categoryRepo.getAll()
    parent = all.find((c) => first.includes(c.name) || c.name.includes(first))
  }
  if (!parent) return defaultCategory()

  let currentId = parent.id!
  for (let i = 1; i < path.length; i++) {
    currentId = await ensureSubCategory(currentId, path[i])
  }

  const final = await categoryRepo.getById(currentId)
  return { id: currentId, name: final?.name ?? parent.name }
}

/**
 * 将本地文件夹路径映射为知识库分类。
 * 规则：取最深层文件夹名作为分类，匹配 KnowledgePage 中的预设分类，否则用 custom。
 */
function resolveKnowledgeCategory(path: string[]): string {
  const folderName = path.length > 0 ? path[path.length - 1] : ''
  const normalized = folderName.toLowerCase()

  const mapping: Record<string, string> = {
    法律法规: 'law',
    法律: 'law',
    标准规范: 'standard',
    规范: 'standard',
    危大工程: 'pce',
    安全措施: 'measure',
    安全: 'measure',
    隐患辨识: 'hazard',
    隐患: 'hazard',
    劳动防护: 'ppe',
    劳保: 'ppe',
  }

  for (const [key, value] of Object.entries(mapping)) {
    if (normalized.includes(key)) return value
  }
  return KNOWLEDGE_CATEGORY_FALLBACK
}


async function buildPreview(
  file: File,
  path: string[],
  scanMode: boolean,
): Promise<ImportPreviewItem> {
  const kind = determineFileType(file.name)

  if (kind === 'unsupported') {
    throw new Error('旧版 .doc 格式需先转换为 .docx：在 Word/WPS 中打开该文件 → 文件 → 另存为 → 选择 .docx 格式 → 再导入本系统')
  }

  if (kind === 'template') {
    const { id: categoryId, name: categoryName } = await resolveCategory(path, scanMode)
    const variables = await extractVariables(file)
    const mappings = await Promise.all(variables.map(inferMapping))
    const displayName = file.name.replace(/\.(docx|xls|xlsx)$/i, '')
    const duplicate = await templateRepo.checkDuplicate(displayName, file.size, categoryId)
    return {
      id: generateId(),
      kind: 'template',
      file,
      fileName: file.name,
      relativePath: [...path, file.name].join('/'),
      fileSize: file.size,
      categoryId,
      categoryName,
      variables,
      mappings,
      knowledgeCategory: '',
      status: duplicate ? 'duplicate' : 'new',
    }
  }

  // 知识库文档预览
  const knowledgeCategory = resolveKnowledgeCategory(path)
  const duplicate = false // 知识库不在这个服务里查重
  return {
    id: generateId(),
    kind: 'knowledge',
    file,
    fileName: file.name,
    relativePath: [...path, file.name].join('/'),
    fileSize: file.size,
    categoryId: '',
    categoryName: knowledgeCategory,
    variables: [],
    mappings: [],
    knowledgeCategory,
    status: duplicate ? 'duplicate' : 'new',
  }
}

function yieldToMain(): Promise<void> {
  return new Promise((resolve) => {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => resolve(), { timeout: 50 })
    } else {
      setTimeout(resolve, 10)
    }
  })
}

export interface ScanPreviewResult {
  items: ImportPreviewItem[]
  failed: FailedScanItem[]
}

async function buildPreviewBatch(
  files: ScanFile[],
  onProgress?: ScanProgressCallback,
  scanMode = false,
): Promise<ScanPreviewResult> {
  const items: ImportPreviewItem[] = []
  const failed: FailedScanItem[] = []
  const total = files.length

  for (let i = 0; i < files.length; i++) {
    if (scanCancelled) break
    const f = files[i]
    try {
      const preview = await buildPreview(f.file, f.path, scanMode)
      items.push(preview)
    } catch (err) {
      // 单个文件解析失败不阻断整体扫描，记录失败原因继续下一个
      const reason = err instanceof Error ? err.message : '未知错误'
      console.warn(`[template-import] 解析文件失败: ${f.file.name}`, err)
      failed.push({
        fileName: f.file.name,
        relativePath: [...f.path, f.file.name].join('/'),
        reason,
      })
    }
    onProgress?.({
      total,
      processed: i + 1,
      currentFile: f.file.name,
    })
    if (i < files.length - 1) {
      await yieldToMain()
    }
  }

  return { items, failed }
}

export const templateImportService = {
  isDirectoryPickerSupported(): boolean {
    return typeof window !== 'undefined' && 'showDirectoryPicker' in window
  },

  cancelScan(): void {
    scanCancelled = true
  },

  resetScanCancel(): void {
    scanCancelled = false
  },

  async pickAndScanDirectory(
    onProgress?: ScanProgressCallback,
  ): Promise<ScanPreviewResult> {
    scanCancelled = false
    const w = window as unknown as {
      showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>
    }
    if (!w.showDirectoryPicker) {
      throw new Error('当前浏览器不支持文件夹选择，请使用“选择文件夹”方式导入')
    }
    try {
      const handle = await w.showDirectoryPicker()
      const files = await scanDirectoryHandle(handle)
      if (files.length === 0) return { items: [], failed: [] }
      return buildPreviewBatch(files, onProgress, true)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return { items: [], failed: [] }
      }
      throw err
    }
  },

  async scanWebkitFiles(
    fileList: FileList,
    onProgress?: ScanProgressCallback,
  ): Promise<ScanPreviewResult> {
    scanCancelled = false
    const files = Array.from(fileList)
      .filter((f) => isScannableFile(f.name))
      .map((f) => {
        const parts = (f.webkitRelativePath ?? f.name).split('/')
        return { file: f, path: parts.slice(1, -1) }
      })
    if (files.length === 0) return { items: [], failed: [] }
    return buildPreviewBatch(files, onProgress, true)
  },

  async importSingle(file: File): Promise<ImportResult> {
    const preview = await buildPreview(file, [], false)
    return this.executeImport([preview], 'overwrite')
  },

  async executeImport(
    items: ImportPreviewItem[],
    strategy: 'skip' | 'overwrite',
  ): Promise<ImportResult> {
    const result: ImportResult = { success: 0, skipped: 0, failed: 0, errors: [], failedItems: [] }

    for (const item of items) {
      if (item.status === 'duplicate' && strategy === 'skip') {
        result.skipped++
        continue
      }
      try {
        if (item.kind === 'knowledge') {
          await ragKnowledgeService.importFile(item.file, item.knowledgeCategory)
          result.success++
          continue
        }

        const ext = item.fileName.toLowerCase().split('.').pop() ?? ''
        const fileType = ext === 'docx' ? 'docx' : 'xlsx'
        const base64 = await fileToBase64(item.file)
        const record: Omit<Template, 'id' | 'createdAt' | 'updatedAt'> = {
          name: item.fileName.replace(/\.(docx|xls|xlsx)$/i, ''),
          categoryId: item.categoryId,
          category: item.categoryName,
          type: 'custom',
          fileType,
          contentType: 'complex',
          fileSize: item.fileSize,
          fileUrl: item.fileName,
          content: base64,
          isBuiltIn: false,
          description: `从 ${item.relativePath} 导入，含 ${item.variables.length} 个变量`,
          variables: item.variables,
          variableMappings: item.mappings,
          version: 1,
        }

        if (item.status === 'duplicate' && strategy === 'overwrite') {
          const candidates = await templateRepo.find({
            name: record.name,
            fileSize: record.fileSize,
            categoryId: record.categoryId,
          })
          const existing = candidates[0]
          if (existing?.id) {
            await templateRepo.update(existing.id, record)
            result.success++
            continue
          }
        }

        await templateRepo.add(record)
        result.success++
      } catch (err) {
        result.failed++
        const reason = err instanceof Error ? err.message : '未知错误'
        result.errors.push(`${item.fileName}: ${reason}`)
        result.failedItems.push({
          fileName: item.fileName,
          relativePath: item.relativePath,
          reason,
        })
      }
    }

    return result
  },
}

interface FileSystemHandleLike {
  kind: 'file' | 'directory'
  name: string
  values?: () => AsyncIterable<FileSystemHandleLike>
  getFile?: () => Promise<File>
}

async function scanDirectoryHandle(
  handle: FileSystemDirectoryHandle,
  path: string[] = [],
): Promise<ScanFile[]> {
  const out: ScanFile[] = []
  const h = handle as unknown as FileSystemHandleLike
  if (!h.values) return out

  for await (const entry of h.values()) {
    if (entry.kind === 'directory') {
      const nested = await scanDirectoryHandle(entry as unknown as FileSystemDirectoryHandle, [...path, entry.name])
      out.push(...nested)
    } else if (entry.kind === 'file' && isScannableFile(entry.name)) {
      const file = await (entry as FileSystemHandleLike).getFile!()
      out.push({ file, path })
    }
  }
  return out
}
