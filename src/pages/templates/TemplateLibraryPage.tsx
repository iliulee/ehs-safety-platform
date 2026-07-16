import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { templateService } from '@/services/templateService'
import { templateImportService } from '@/services/template-import.service'
import { templateRepo } from '@/db/repositories/template.repo'
import { useAppStore } from '@/store'
import { useTemplateLibrary } from './hooks/useTemplateLibrary'
import { useTemplateImport } from './hooks/useTemplateImport'
import { useTemplateGenerate } from './hooks/useTemplateGenerate'
import { TemplateToolbar } from './components/TemplateToolbar'
import { TemplateList } from './components/TemplateList'
import { TemplateSheets } from './components/TemplateSheets'
import { MoveCategoryDialog } from './components/MoveCategoryDialog'
import CategoryTreeNew from '@/components/business/CategoryTreeNew'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import type { Template } from '@/types'
import { toast } from 'sonner'

export default function TemplateLibraryPage() {
  const {
    filtered,
    keyword,
    setKeyword,
    activeCategoryId,
    activeCategoryName,
    handleCategorySelect,
    categories,
    templateCounts,
    uncategorizedCount,
    refreshTree,
  } = useTemplateLibrary()

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())
  const [moveOpen, setMoveOpen] = useState(false)
  const [moveTarget, setMoveTarget] = useState<Template | null>(null)
  const [movingIds, setMovingIds] = useState<Set<string>>(new Set())

  const navigate = useNavigate()
  const importOps = useTemplateImport(() => {})
  const generateOps = useTemplateGenerate()
  const scan = useAppStore((s) => s.scan)
  const { finishScan } = useAppStore()

  const openEditorInNewPage = (template: Template) => {
    if (template.fileType === 'docx') {
      navigate(`/editor/docx?id=${template.id}`)
    } else if (template.fileType === 'xlsx') {
      navigate(`/editor/xlsx?id=${template.id}`)
    }
  }

  const handleDelete = async (id: string) => {
    if (!id || deletingIds.has(id)) return
    if (!confirm('确定删除这个模板吗？')) return

    // 先清 UI 态，再删数据库，避免 useLiveQuery 重渲染时读到已删除数据
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    setDeletingIds((prev) => new Set(prev).add(id))

    try {
      await templateService.remove(id)
      toast.success('已删除')
    } catch (err) {
      toast.error('删除失败：' + (err instanceof Error ? err.message : '未知错误'))
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  const handleMove = (t: Template) => {
    setMoveTarget(t)
    setMoveOpen(true)
  }

  const handleBatchMove = () => {
    setMoveTarget(null)
    setMoveOpen(true)
  }

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`确定删除选中的 ${selectedIds.size} 个模板吗？\n此操作不可恢复。`)) return

    const ids = Array.from(selectedIds)
    setDeletingIds((prev) => {
      const next = new Set(prev)
      ids.forEach((id) => next.add(id))
      return next
    })
    setSelectedIds(new Set())

    let failed = 0
    for (const id of ids) {
      try {
        await templateService.remove(id)
      } catch {
        failed++
      }
    }
    setDeletingIds(new Set())
    if (failed > 0) {
      toast.error(`删除完成：${ids.length - failed} 个成功，${failed} 个失败`)
    } else {
      toast.success(`已删除 ${ids.length} 个模板`)
    }
  }

  const handleDragStart = (e: React.DragEvent, template: Template) => {
    // 如果当前模板已选中，拖拽所有选中的；否则只拖拽当前
    const ids = selectedIds.has(template.id!)
      ? Array.from(selectedIds)
      : [template.id!]
    e.dataTransfer.setData('application/template-ids', JSON.stringify(ids))
    e.dataTransfer.effectAllowed = 'move'
  }

  const confirmMove = async (categoryId: string | null) => {
    const ids = moveTarget ? [moveTarget.id!] : Array.from(selectedIds)
    if (ids.length === 0) return

    setMovingIds((prev) => {
      const next = new Set(prev)
      ids.forEach((id) => next.add(id))
      return next
    })

    try {
      for (const id of ids) {
        await templateRepo.update(id, { categoryId } as Partial<Template>)
      }
      toast.success(`已移动 ${ids.length} 个模板`)
      setSelectedIds(new Set())
    } catch (err) {
      toast.error('移动失败：' + (err instanceof Error ? err.message : '未知错误'))
    } finally {
      setMovingIds((prev) => {
        const next = new Set(prev)
        ids.forEach((id) => next.delete(id))
        return next
      })
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

  return (
    <div className="flex min-h-[calc(100vh-120px)] min-w-0">
      <aside className="relative flex-shrink-0 h-full min-w-[220px] w-[250px]">
        <CategoryTreeNew
          categories={categories}
          templateCounts={templateCounts}
          uncategorizedCount={uncategorizedCount}
          selectedId={activeCategoryId}
          onSelect={handleCategorySelect}
          onTreeMutated={refreshTree}
        />
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <ErrorBoundary>
          <TemplateToolbar
            activeCategoryName={activeCategoryName}
            count={filtered.length}
            keyword={keyword}
            onKeywordChange={setKeyword}
            onImportSingle={() => importOps.singleFileRef.current?.click()}
            onScanDirectory={importOps.handleScanDirectory}
            onBatchGenerate={() => generateOps.handleBatchGenerate(selectedIds)}
            onBatchMove={handleBatchMove}
            onBatchDelete={handleBatchDelete}
            batchCount={selectedIds.size}
            batchLoading={generateOps.generating}
            disabled={importOps.uploading || scan.isScanning}
            scanProgress={scan.progress}
            onCancelScan={() => {
              templateImportService.cancelScan()
              finishScan()
              toast.info('已取消扫描')
            }}
          />

          <div className="flex-1 overflow-y-auto">
            <TemplateList
              templates={filtered}
              selectedIds={selectedIds}
              deletingIds={deletingIds}
              movingIds={movingIds}
              onToggleSelect={toggleSelect}
              onToggleSelectAll={toggleSelectAll}
              onClearSelection={() => setSelectedIds(new Set())}
              onGenerate={generateOps.handleGenerate}
              onOpenEditor={openEditorInNewPage}
              onDelete={handleDelete}
              onMove={handleMove}
              onDragStart={handleDragStart}
              onImport={() => importOps.singleFileRef.current?.click()}
              onScan={importOps.handleScanDirectory}
            />
          </div>
        </ErrorBoundary>
      </main>

      <input
        ref={importOps.singleFileRef}
        type="file"
        accept=".doc,.docx,.xls,.xlsx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        onChange={importOps.handleSingleUpload}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />
      <input
        ref={importOps.webkitDirRef}
        type="file"
        // @ts-expect-error webkitdirectory is a non-standard attribute for folder selection
        webkitdirectory="true"
        onChange={importOps.handleWebkitDirectory}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />

      <TemplateSheets
        previewOpen={importOps.previewOpen}
        setPreviewOpen={importOps.setPreviewOpen}
        previewItems={importOps.previewItems}
        previewFailed={importOps.previewFailed}
        importStrategy={importOps.importStrategy}
        setImportStrategy={importOps.setImportStrategy}
        onExecuteImport={importOps.handleExecuteImport}
        uploading={importOps.uploading}
        batchOpen={generateOps.batchOpen}
        setBatchOpen={generateOps.setBatchOpen}
        batchResult={generateOps.batchResult}
        manualOpen={generateOps.manualOpen}
        setManualOpen={generateOps.setManualOpen}
        manualVariables={generateOps.manualVariables}
        manualValues={generateOps.manualValues}
        setManualValues={generateOps.setManualValues}
        onManualConfirm={generateOps.handleManualConfirm}
      />

      <MoveCategoryDialog
        open={moveOpen}
        onOpenChange={setMoveOpen}
        currentCategoryId={moveTarget?.categoryId}
        excludeIds={moveTarget?.id ? [moveTarget.id] : []}
        onConfirm={confirmMove}
      />
    </div>
  )
}
