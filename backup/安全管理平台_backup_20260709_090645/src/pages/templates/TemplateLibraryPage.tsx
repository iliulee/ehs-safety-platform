import { useEffect, useMemo, useRef, useState } from 'react'
import {
  FileText, FileSpreadsheet, FileType, Presentation,
  Search, Star, Clock,
  Upload, Trash2, FileDown, Pencil, FolderOpen,
  Package, CheckSquare, Square, Loader2,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/sheet'
import { templateService } from '@/services/templateService'
import { templateImportService, type ImportPreviewItem, type FailedScanItem } from '@/services/template-import.service'
import { renderSingle, batchGenerateAndDownload, type RenderResult, type BatchRenderResult } from '@/services/generate.service'
import { templateRepo } from '@/db/repositories/template.repo'
import { categoryRepo, type CategoryNode } from '@/db/repositories/category.repo'
import { useAppStore } from '@/store'
import type { Template, VariableMapping } from '@/types'
import { toast } from 'sonner'
import CategoryTree from '@/components/business/CategoryTree'
import VariableMappingEditor from '@/components/business/VariableMappingEditor'

const FORMAT_ICON: Record<string, React.ReactNode> = {
  word: <FileType className="w-4 h-4" />,
  docx: <FileType className="w-4 h-4" />,
  excel: <FileSpreadsheet className="w-4 h-4" />,
  xlsx: <FileSpreadsheet className="w-4 h-4" />,
  ppt: <Presentation className="w-4 h-4" />,
  pptx: <Presentation className="w-4 h-4" />,
  pdf: <FileText className="w-4 h-4" />,
}

const FORMAT_COLOR: Record<string, string> = {
  word: 'bg-blue-50 text-blue-600',
  docx: 'bg-blue-50 text-blue-600',
  excel: 'bg-emerald-50 text-emerald-600',
  xlsx: 'bg-emerald-50 text-emerald-600',
  ppt: 'bg-orange-50 text-orange-600',
  pptx: 'bg-orange-50 text-orange-600',
  pdf: 'bg-red-50 text-red-600',
}

export default function TemplateLibraryPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [keyword, setKeyword] = useState('')
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)
  const [activeCategoryName, setActiveCategoryName] = useState('全部模板')
  const [selected, setSelected] = useState<Template | null>(null)
  const [uploading, setUploading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [treeCollapsed, setTreeCollapsed] = useState(true)
  const [previewItems, setPreviewItems] = useState<ImportPreviewItem[]>([])
  const [previewFailed, setPreviewFailed] = useState<FailedScanItem[]>([])
  const [importStrategy, setImportStrategy] = useState<'skip' | 'overwrite'>('skip')

  const [manualOpen, setManualOpen] = useState(false)
  const [manualTemplate, setManualTemplate] = useState<Template | null>(null)
  const [manualVariables, setManualVariables] = useState<VariableMapping[]>([])
  const [manualValues, setManualValues] = useState<Record<string, string>>({})
  const [editedMappings, setEditedMappings] = useState<VariableMapping[]>([])
  const [categoryTree, setCategoryTree] = useState<CategoryNode[]>([])
  const [treeRefreshKey, setTreeRefreshKey] = useState(0)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [batchResult, setBatchResult] = useState<BatchRenderResult | null>(null)
  const [batchOpen, setBatchOpen] = useState(false)
  const [generateTrigger, setGenerateTrigger] = useState<Template | null>(null)

  const singleFileRef = useRef<HTMLInputElement>(null)
  const webkitDirRef = useRef<HTMLInputElement>(null)
  const project = useAppStore((s) => s.currentProject)
  const scan = useAppStore((s) => s.scan)
  const { startScan, updateScanProgress, finishScan } = useAppStore()

  useEffect(() => {
    loadTemplates()
    loadCategoryTree()
  }, [])

  useEffect(() => {
    if (generateTrigger) {
      setSelected(generateTrigger)
      handleGenerate()
      setGenerateTrigger(null)
    }
  }, [generateTrigger])

  const loadTemplates = async () => {
    const data = await templateService.list()
    setTemplates(data)
  }

  const loadCategoryTree = async () => {
    const tree = await categoryRepo.getTree()
    setCategoryTree(tree)
  }

  const descendantIdMap = useMemo(() => {
    const map = new Map<string, Set<string>>()
    const walk = (node: CategoryNode) => {
      const ids = new Set<string>([node.id!])
      for (const child of node.children) {
        walk(child)
        ids.add(child.id!)
        const childIds = map.get(child.id!)
        if (childIds) {
          childIds.forEach((id) => ids.add(id))
        }
      }
      map.set(node.id!, ids)
    }
    for (const root of categoryTree) walk(root)
    return map
  }, [categoryTree])

  const filtered = useMemo(() => {
    const allowedIds = activeCategoryId ? (descendantIdMap.get(activeCategoryId) ?? new Set([activeCategoryId])) : null
    return templates.filter((t) => {
      const matchCat = activeCategoryId === null || (t.categoryId && allowedIds?.has(t.categoryId))
      const kw = keyword.trim()
      const matchKw =
        !kw ||
        t.name.includes(kw) ||
        (t.description ?? '').includes(kw) ||
        (t.variables?.some((v) => v.includes(kw)) ?? false)
      return matchCat && matchKw
    })
  }, [templates, activeCategoryId, keyword, descendantIdMap])

  const handleCategorySelect = (id: string | null, name: string) => {
    setActiveCategoryId(id)
    setActiveCategoryName(name ?? '全部模板')
  }

  const handleSingleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const name = file.name.toLowerCase()
    if (!name.endsWith('.docx') && !name.endsWith('.xls') && !name.endsWith('.xlsx')) {
      toast.error('目前仅支持 .docx / .xls / .xlsx 格式')
      if (e.target) e.target.value = ''
      return
    }
    setUploading(true)
    try {
      const result = await templateImportService.importSingle(file)
      toast.success(`导入完成：成功 ${result.success} 个，跳过 ${result.skipped} 个`)
      await loadTemplates()
      await loadCategoryTree()
    } catch (err) {
      toast.error('导入失败：' + (err instanceof Error ? err.message : '未知错误'))
    } finally {
      setUploading(false)
      if (e.target) e.target.value = ''
    }
  }

  const handleScanDirectory = () => {
    if (templateImportService.isDirectoryPickerSupported()) {
      runDirectoryScan(() =>
        templateImportService.pickAndScanDirectory((progress) =>
          updateScanProgress(progress),
        ),
      )
    } else {
      webkitDirRef.current?.click()
    }
  }

  const runDirectoryScan = async (
    scanFn: () => Promise<{ items: ImportPreviewItem[]; failed: FailedScanItem[] }>,
  ) => {
    startScan()
    try {
      const { items, failed } = await scanFn()
      if (items.length === 0 && failed.length === 0) {
        toast.info('未选择文件夹或文件夹为空')
        return
      }
      const templateCount = items.filter((i) => i.kind === 'template').length
      const knowledgeCount = items.filter((i) => i.kind === 'knowledge').length
      toast.success(`扫描完成：发现 ${templateCount} 个模板、${knowledgeCount} 个知识库文档${failed.length > 0 ? `，${failed.length} 个失败` : ''}`)
      setPreviewItems(items)
      setPreviewFailed(failed)
      setImportStrategy('skip')
      setPreviewOpen(true)
    } catch (err) {
      toast.error('扫描失败：' + (err instanceof Error ? err.message : '未知错误'))
    } finally {
      finishScan()
    }
  }

  const handleCancelScan = () => {
    templateImportService.cancelScan()
    finishScan()
    toast.info('已取消扫描')
  }

  const handleWebkitDirectory = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    await runDirectoryScan(() =>
      templateImportService.scanWebkitFiles(files, (progress) =>
        updateScanProgress(progress),
      ),
    )
    if (e.target) e.target.value = ''
  }

  const handleExecuteImport = async () => {
    setUploading(true)
    try {
      const result = await templateImportService.executeImport(previewItems, importStrategy)
      toast.success(`导入完成：成功 ${result.success}，跳过 ${result.skipped}，失败 ${result.failed}`)
      if (result.errors.length > 0) {
        result.errors.forEach((msg) => toast.error(msg))
      }
      setPreviewOpen(false)
      setPreviewItems([])
      setPreviewFailed([])
      await loadTemplates()
      await loadCategoryTree()
      setTreeRefreshKey((k) => k + 1)
    } catch (err) {
      toast.error('导入失败：' + (err instanceof Error ? err.message : '未知错误'))
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除这个模板吗？')) return
    try {
      await templateService.remove(id)
      if (selected?.id === id) {
        setSelected(null)
      }
      await loadTemplates()
      toast.success('已删除')
    } catch (err) {
      toast.error('删除失败：' + (err instanceof Error ? err.message : '未知错误'))
    }
  }

  const openEditor = (template: Template) => {
    setSelected(template)
    setEditedMappings(template.variableMappings ?? [])
  }

  const handleGenerate = async () => {
    if (!selected) return
    await executeRender()
  }

  const executeRender = async () => {
    if (!selected) return
    setGenerating(true)
    try {
      if (selected.isBuiltIn && !selected.content) {
        toast.info('内置模板需先上传对应 Word 模板文件才能生成')
        return
      }
      const result = await renderSingle(selected.id!, {
        projectId: project?.id,
        manualValues,
      })
      if (result.manualVariables.length > 0) {
        setManualTemplate(selected)
        setManualVariables(result.manualVariables)
        const initial: Record<string, string> = {}
        result.manualVariables.forEach((v) => {
          initial[v.name] = manualValues[v.name] ?? ''
        })
        setManualValues((prev) => ({ ...prev, ...initial }))
        setManualOpen(true)
        return
      }
      if (result.missingRequired.length > 0) {
        toast.error(`以下必填变量缺少数据：${result.missingRequired.join('、')}`)
        return
      }
      if (!result.blob) {
        toast.error('生成失败：未得到文档 Blob')
        return
      }
      await finishDownload(result)
    } catch (err) {
      toast.error('生成失败：' + (err instanceof Error ? err.message : '未知错误'))
    } finally {
      setGenerating(false)
    }
  }

  const finishDownload = async (result: RenderResult) => {
    if (!result.blob) return
    const url = URL.createObjectURL(result.blob)
    const a = document.createElement('a')
    a.href = url
    a.download = result.fileName
    a.click()
    URL.revokeObjectURL(url)
    toast.success('文档生成成功，开始下载')
  }

  const handleManualConfirm = async () => {
    setManualOpen(false)
    if (!manualTemplate) return
    setSelected(manualTemplate)
    await executeRender()
  }

  const handleSaveMappings = async () => {
    if (!selected?.id) return
    try {
      await templateRepo.updateVariableMappings(selected.id, editedMappings)
      toast.success('变量映射已保存')
      setSelected((prev) =>
        prev ? { ...prev, variableMappings: editedMappings } : prev,
      )
      await loadTemplates()
    } catch (err) {
      toast.error('保存失败：' + (err instanceof Error ? err.message : '未知错误'))
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length && filtered.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map((t) => t.id!)))
    }
  }

  const handleBatchGenerate = async () => {
    if (selectedIds.size === 0) {
      toast.error('请至少选择一个模板')
      return
    }
    if (!project?.id) {
      toast.error('请先在左下角选择一个项目')
      return
    }
    setGenerating(true)
    try {
      const result = await batchGenerateAndDownload(Array.from(selectedIds), { projectId: project.id })
      setBatchResult(result)
      setBatchOpen(true)
      if (result.success > 0) {
        toast.success(`批量生成完成：成功 ${result.success} 份，跳过 ${result.skipped} 份，失败 ${result.failed} 份`)
      } else if (result.skipped > 0) {
        toast.warning('有模板需要手动填写变量或缺少必填数据')
      } else if (result.failed > 0) {
        toast.error('批量生成失败，请查看详情')
      }
    } catch (err) {
      toast.error('批量生成失败：' + (err instanceof Error ? err.message : '未知错误'))
    } finally {
      setGenerating(false)
    }
  }

  const newCount = previewItems.filter((i) => i.status === 'new').length
  const dupCount = previewItems.filter((i) => i.status === 'duplicate').length
  const importButtonText = previewFailed.length > 0
    ? `确认导入（${newCount} 新增 / ${dupCount} 重复，${previewFailed.length} 个失败跳过）`
    : `确认导入（${newCount} 新增 / ${dupCount} 重复）`

  return (
    <div className="flex h-full min-w-0">
      <aside
        className={`relative flex-shrink-0 h-full transition-all duration-200 ${
          treeCollapsed ? 'w-11' : 'w-36'
        }`}
      >
        <CategoryTree
          selectedId={activeCategoryId}
          onSelect={handleCategorySelect}
          collapsed={treeCollapsed}
          onToggleCollapse={() => setTreeCollapsed((v) => !v)}
          refreshKey={treeRefreshKey}
          onAfterDelete={() => {
            setSelected(null)
            loadTemplates()
          }}
        />
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <div className="px-2.5 py-2 border-b border-gray-200 space-y-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="text-sm font-medium text-gray-800 truncate flex-shrink-0 max-w-[100px]">
              {activeCategoryName}
            </h3>
            <div className="flex-1 min-w-0" />
            <input
              ref={singleFileRef}
              type="file"
              accept=".docx,.xls,.xlsx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={handleSingleUpload}
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
            />
            <input
              ref={webkitDirRef}
              type="file"
              // @ts-expect-error webkitdirectory is a non-standard attribute for folder selection
              webkitdirectory="true"
              onChange={handleWebkitDirectory}
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
            />
            <Button
              size="sm"
              className="h-7 text-[11px] px-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 flex-shrink-0"
              onClick={() => singleFileRef.current?.click()}
              disabled={uploading || scan.isScanning}
            >
              <Upload className="w-3 h-3 mr-1" />
              导入
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[11px] px-2 flex-shrink-0"
              onClick={handleScanDirectory}
              disabled={uploading || scan.isScanning}
            >
              <FolderOpen className="w-3 h-3 mr-1" />
              扫描
            </Button>
            {selectedIds.size > 0 && (
              <Button
                size="sm"
                className="h-7 text-[11px] px-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 flex-shrink-0"
                onClick={handleBatchGenerate}
                disabled={generating}
              >
                {generating ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Package className="w-3 h-3 mr-1" />}
                批量生成{selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
              </Button>
            )}
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索模板名称、变量..."
              className="pl-8 h-8 text-xs bg-white"
            />
          </div>
        </div>

        {scan.isScanning && scan.progress && (
          <div className="px-2.5 py-2 bg-amber-50 border-b border-amber-100">
            <div className="flex items-center justify-between text-[10px] text-amber-800 mb-1">
              <span>正在扫描模板...</span>
              <button
                onClick={handleCancelScan}
                className="text-amber-700 hover:text-amber-900 underline"
              >
                取消
              </button>
            </div>
            <div className="h-1.5 bg-amber-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all duration-200"
                style={{ width: `${scan.progress.total > 0 ? (scan.progress.processed / scan.progress.total) * 100 : 0}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-1">
              <p className="text-[10px] text-amber-600 truncate flex-1">{scan.progress.currentFile}</p>
              <span className="text-[10px] text-amber-700 flex-shrink-0 ml-2">{scan.progress.processed} / {scan.progress.total}</span>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-2">
            <p className="text-[10px] text-blue-700 leading-relaxed">
              Word 中用 <b>{'{{变量名}}'}</b> 写占位符，如 <b>{'{{projectName}}'}</b>，导入后自动生成。点击模板可编辑变量映射或删除。
            </p>
          </div>

          <div className="flex items-center justify-between px-1">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-1 text-[11px] text-gray-600 hover:text-primary"
            >
              {selectedIds.size === filtered.length && filtered.length > 0 ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
              全选{selectedIds.size > 0 ? `(${selectedIds.size}/${filtered.length})` : ''}
            </button>
            {selectedIds.size > 0 && (
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-[11px] text-gray-400 hover:text-gray-600"
              >
                取消选择
              </button>
            )}
          </div>

          {filtered.map((t) => (
            <Card
              key={t.id}
              className={`active:bg-gray-50 transition-colors ${selectedIds.has(t.id!) ? 'ring-1 ring-emerald-500 bg-emerald-50/30' : ''}`}
            >
              <CardContent className="p-2">
                <div className="flex items-start gap-2">
                  <button
                    onClick={() => toggleSelect(t.id!)}
                    className="mt-1.5 text-gray-400 hover:text-emerald-600"
                  >
                    {selectedIds.has(t.id!) ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4" />}
                  </button>
                  <div className={`w-8 h-8 rounded-md ${FORMAT_COLOR[t.fileType]} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                    {FORMAT_ICON[t.fileType]}
                  </div>
                  <div className="flex-1 min-w-0" onClick={() => openEditor(t)}>
                    <div className="flex items-center gap-1">
                      <p className="text-xs font-medium text-gray-800 truncate">{t.name}</p>
                      {t.isBuiltIn && <Star className="w-3 h-3 text-amber-400 fill-amber-400 flex-shrink-0" />}
                    </div>
                    <p className="text-[10px] text-gray-500 truncate">{t.description}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5">{t.category}</Badge>
                      <span className="text-[9px] text-gray-400 flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {t.variables?.length ? `${t.variables.length} 变量` : '可编辑'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100">
                  <button
                    onClick={() => setGenerateTrigger(t)}
                    className="flex-1 h-7 rounded-md bg-emerald-50 flex items-center justify-center gap-1 text-emerald-700 hover:bg-emerald-100 text-[10px] font-medium"
                    title="生成文档"
                  >
                    <FileDown className="w-3 h-3" />
                    生成
                  </button>
                  <button
                    onClick={() => openEditor(t)}
                    className="flex-1 h-7 rounded-md bg-primary/5 flex items-center justify-center gap-1 text-primary hover:bg-primary/10 text-[10px] font-medium"
                    title="编辑变量映射"
                  >
                    <Pencil className="w-3 h-3" />
                    变量映射
                  </button>
                  <button
                    onClick={() => handleDelete(t.id!)}
                    className="flex-1 h-7 rounded-md bg-red-50 flex items-center justify-center gap-1 text-red-600 hover:bg-red-100 text-[10px] font-medium"
                    title="删除此模板"
                  >
                    <Trash2 className="w-3 h-3" />
                    删除
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <div className="py-8 text-center text-xs text-gray-400">
              当前分类暂无模板，点击"导入"或"扫描"上传
            </div>
          )}
        </div>
      </main>

      <Sheet
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="批量导入预览"
        footer={
          <Button
            className="flex-1 h-9 text-xs"
            onClick={handleExecuteImport}
            disabled={uploading || previewItems.length === 0}
          >
            {uploading ? '导入中...' : importButtonText}
          </Button>
        }
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">重复处理策略</span>
            <select
              value={importStrategy}
              onChange={(e) => setImportStrategy(e.target.value as 'skip' | 'overwrite')}
              className="h-8 px-2 text-xs border border-gray-200 rounded-md bg-white"
            >
              <option value="skip">跳过重复</option>
              <option value="overwrite">覆盖重复</option>
            </select>
          </div>

          {previewItems.length > 0 && (
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              <div className="flex items-center gap-3 text-[10px] text-gray-500 px-1">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  模板 {previewItems.filter((i) => i.kind === 'template').length} 个
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  知识库 {previewItems.filter((i) => i.kind === 'knowledge').length} 个
                </span>
              </div>
              {previewItems.map((item) => (
                <div key={item.id} className="p-2.5 bg-gray-50 rounded-lg text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <Badge
                        className={`text-[9px] ${
                          item.kind === 'template'
                            ? 'bg-blue-50 text-blue-600 hover:bg-blue-50'
                            : 'bg-red-50 text-red-600 hover:bg-red-50'
                        }`}
                      >
                        {item.kind === 'template' ? '进模板库' : '进知识库'}
                      </Badge>
                      <p className="font-medium text-gray-800 truncate">{item.fileName}</p>
                    </div>
                    {item.status === 'duplicate' ? (
                      <Badge variant="secondary" className="text-[10px]">重复</Badge>
                    ) : (
                      <Badge variant="default" className="text-[10px]">新增</Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1 truncate">{item.relativePath}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[11px] text-gray-500">分类：{item.categoryName}</span>
                    {item.kind === 'template' && (
                      <span className="text-[11px] text-gray-400">{item.variables.length} 个变量</span>
                    )}
                  </div>
                  {item.kind === 'template' && item.variables.length > 0 && (
                    <p className="text-[10px] text-gray-400 mt-1 truncate">
                      {item.variables.slice(0, 5).join(', ')}
                      {item.variables.length > 5 && ' ...'}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {previewFailed.length > 0 && (
            <div className="border border-red-100 rounded-lg overflow-hidden">
              <div className="bg-red-50 px-2.5 py-1.5 text-[11px] font-medium text-red-700">
                以下文件导入失败（{previewFailed.length} 个）
              </div>
              <div className="max-h-[120px] overflow-y-auto p-2 space-y-1">
                {previewFailed.map((item, idx) => (
                  <div key={idx} className="text-[10px] text-red-600">
                    <p className="truncate">{item.relativePath}</p>
                    <p className="text-red-400">{item.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Sheet>

      <Sheet
        open={!!selected}
        onClose={() => setSelected(null)}
        title="模板变量映射"
        footer={
          selected ? (
            <>
              <Button
                variant="outline"
                className="h-9 text-xs px-3"
                onClick={handleSaveMappings}
              >
                保存映射
              </Button>
              <Button
                className="flex-1 h-9 text-xs"
                onClick={handleGenerate}
                disabled={generating || (selected.isBuiltIn && !selected.content)}
              >
                <FileDown className="w-3.5 h-3.5 mr-1" />
                {generating ? '生成中...' : '下载 Word'}
              </Button>
            </>
          ) : undefined
        }
      >
        {selected && (
          <div className="space-y-3">
            <div className="bg-violet-50 rounded-lg p-2.5">
              <p className="text-xs font-medium text-violet-800">{selected.name}</p>
              <p className="text-[11px] text-violet-600 mt-0.5">{selected.description}</p>
              {selected.isBuiltIn && !selected.content && (
                <p className="text-[11px] text-amber-600 mt-1">
                  ⚠️ 内置模板需上传对应 Word 文件后才能生成，请先准备一个同结构的 .docx 文件。
                </p>
              )}
            </div>

            <VariableMappingEditor
              mappings={editedMappings}
              onChange={setEditedMappings}
            />
          </div>
        )}
      </Sheet>

      <Sheet
        open={batchOpen}
        onClose={() => setBatchOpen(false)}
        title="批量生成结果"
        footer={
          <Button
            className="flex-1 h-9 text-xs"
            variant="outline"
            onClick={() => setBatchOpen(false)}
          >
            关闭
          </Button>
        }
      >
        {batchResult && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-2 text-center">
                <p className="text-lg font-semibold text-emerald-700">{batchResult.success}</p>
                <p className="text-[10px] text-emerald-600">成功</p>
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-lg p-2 text-center">
                <p className="text-lg font-semibold text-amber-700">{batchResult.skipped}</p>
                <p className="text-[10px] text-amber-600">跳过</p>
              </div>
              <div className="bg-red-50 border border-red-100 rounded-lg p-2 text-center">
                <p className="text-lg font-semibold text-red-700">{batchResult.failed}</p>
                <p className="text-[10px] text-red-600">失败</p>
              </div>
            </div>
            {batchResult.details.length > 0 && (
              <div className="space-y-1 max-h-[260px] overflow-y-auto">
                {batchResult.details.map((d, i) => (
                  <div key={i} className="flex items-center gap-2 text-[11px] py-1 border-b border-gray-50 last:border-0">
                    <span
                      className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                        d.status === 'success' ? 'bg-emerald-500' : d.status === 'skipped' ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                    />
                    <span className="flex-1 truncate">{d.fileName}</span>
                    {d.status !== 'success' && <span className="text-red-500 flex-shrink-0">{d.error}</span>}
                  </div>
                ))}
              </div>
            )}
            {batchResult.success > 0 && (
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-2">
                <p className="text-[11px] text-blue-700">已自动打包下载 ZIP 文件，包含 {batchResult.success} 份生成的文档。</p>
              </div>
            )}
          </div>
        )}
      </Sheet>

      <Sheet
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        title="补填手动变量"
        footer={
          <Button
            className="flex-1 h-9 text-xs"
            onClick={handleManualConfirm}
            disabled={generating}
          >
            {generating ? '生成中...' : '确认并生成'}
          </Button>
        }
      >
        <div className="space-y-3">
          <p className="text-[11px] text-gray-500">
            以下变量无法自动从项目数据获取，请手动填写后继续生成。
          </p>
          <div className="space-y-2.5">
            {manualVariables.map((v) => (
              <div key={v.name}>
                <label className="text-xs text-gray-600 block mb-1">
                  {v.label ?? v.name}
                  {v.required && <span className="text-red-500 ml-0.5">*</span>}
                  <span className="text-[10px] text-gray-400 ml-1">{'{{'}{v.name}{'}}'}</span>
                </label>
                <Input
                  value={manualValues[v.name] ?? ''}
                  onChange={(e) =>
                    setManualValues((prev) => ({ ...prev, [v.name]: e.target.value }))
                  }
                  placeholder={`请输入 ${v.label ?? v.name}`}
                  className="h-8 text-xs"
                />
              </div>
            ))}
          </div>
        </div>
      </Sheet>
    </div>
  )
}
