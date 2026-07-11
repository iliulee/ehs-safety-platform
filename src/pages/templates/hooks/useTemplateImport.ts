import { useRef, useState } from 'react'
import { templateImportService, type ImportPreviewItem, type FailedScanItem } from '@/services/template-import.service'
import { useAppStore } from '@/store'
import { toast } from 'sonner'

export function useTemplateImport(onAfterImport: () => void) {
  const [uploading, setUploading] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewItems, setPreviewItems] = useState<ImportPreviewItem[]>([])
  const [previewFailed, setPreviewFailed] = useState<FailedScanItem[]>([])
  const [importStrategy, setImportStrategy] = useState<'skip' | 'overwrite'>('skip')

  const singleFileRef = useRef<HTMLInputElement>(null)
  const webkitDirRef = useRef<HTMLInputElement>(null)
  const { startScan, updateScanProgress, finishScan } = useAppStore()

  const handleSingleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const name = file.name.toLowerCase()

    // 旧版 .doc 直接给出转换引导，而不是粗暴报错
    if (name.endsWith('.doc')) {
      setPreviewItems([])
      setPreviewFailed([
        {
          fileName: file.name,
          relativePath: file.name,
          reason: '旧版 .doc 格式需先转换为 .docx：在 Word/WPS 中打开该文件 → 文件 → 另存为 → 选择 .docx 格式 → 再导入本系统',
        },
      ])
      setImportStrategy('skip')
      setPreviewOpen(true)
      if (e.target) e.target.value = ''
      return
    }

    if (!name.endsWith('.docx') && !name.endsWith('.xls') && !name.endsWith('.xlsx')) {
      toast.error('目前仅支持 .docx / .xls / .xlsx 格式')
      if (e.target) e.target.value = ''
      return
    }
    setUploading(true)
    try {
      const result = await templateImportService.importSingle(file)
      toast.success(`导入完成：成功 ${result.success} 个，跳过 ${result.skipped} 个`)
      onAfterImport()
    } catch (err) {
      toast.error('导入失败：' + (err instanceof Error ? err.message : '未知错误'))
    } finally {
      setUploading(false)
      if (e.target) e.target.value = ''
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

  const handleScanDirectory = () => {
    if (templateImportService.isDirectoryPickerSupported()) {
      runDirectoryScan(() => templateImportService.pickAndScanDirectory((progress) => updateScanProgress(progress)))
    } else {
      webkitDirRef.current?.click()
    }
  }

  const handleWebkitDirectory = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    await runDirectoryScan(() => templateImportService.scanWebkitFiles(files, (progress) => updateScanProgress(progress)))
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
      onAfterImport()
    } catch (err) {
      toast.error('导入失败：' + (err instanceof Error ? err.message : '未知错误'))
    } finally {
      setUploading(false)
    }
  }

  return {
    uploading,
    previewOpen,
    setPreviewOpen,
    previewItems,
    previewFailed,
    importStrategy,
    setImportStrategy,
    singleFileRef,
    webkitDirRef,
    handleSingleUpload,
    handleScanDirectory,
    handleWebkitDirectory,
    handleExecuteImport,
  }
}
