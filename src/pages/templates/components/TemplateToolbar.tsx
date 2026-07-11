import { Search, Upload, FolderOpen, Package, Loader2, ChevronDown, FolderInput, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { ScanProgress } from '@/services/template-import.service'

interface TemplateToolbarProps {
  activeCategoryName: string
  count: number
  keyword: string
  onKeywordChange: (v: string) => void
  onImportSingle: () => void
  onScanDirectory: () => void
  onBatchGenerate: () => void
  onBatchMove?: () => void
  onBatchDelete?: () => void
  batchCount: number
  batchLoading: boolean
  disabled: boolean
  scanProgress?: ScanProgress | null
  onCancelScan?: () => void
}

export function TemplateToolbar({
  activeCategoryName,
  count,
  keyword,
  onKeywordChange,
  onImportSingle,
  onScanDirectory,
  onBatchGenerate,
  onBatchMove,
  onBatchDelete,
  batchCount,
  batchLoading,
  disabled,
  scanProgress,
  onCancelScan,
}: TemplateToolbarProps) {
  return (
    <div className="px-3 py-2 border-b border-gray-200 space-y-2">
      <div className="flex items-center gap-2 min-w-0">
        <h3 className="text-sm font-semibold text-gray-800 truncate flex-shrink-0">
          {activeCategoryName}
          <span className="ml-1 text-xs font-normal text-gray-500">({count})</span>
        </h3>

        <div className="flex-1 min-w-0" />

        <div className="relative w-44 md:w-56">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <Input
            value={keyword}
            onChange={(e) => onKeywordChange(e.target.value)}
            placeholder="搜索模板名称、变量..."
            className="pl-8 h-8 text-xs bg-white"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              className="h-8 text-[11px] px-2.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 flex-shrink-0"
              disabled={disabled}
            >
              <Upload className="w-3 h-3 mr-1" />
              导入
              <ChevronDown className="w-3 h-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="text-xs">
            <DropdownMenuItem onClick={onImportSingle} className="cursor-pointer">
              <Upload className="w-3.5 h-3.5 mr-2" />
              导入单个文件
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onScanDirectory} className="cursor-pointer">
              <FolderOpen className="w-3.5 h-3.5 mr-2" />
              扫描文件夹
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          size="sm"
          variant="outline"
          className="h-8 text-[11px] px-2.5 flex-shrink-0"
          onClick={onScanDirectory}
          disabled={disabled}
        >
          <FolderOpen className="w-3 h-3 mr-1" />
          扫描
        </Button>

        {batchCount > 0 && (
          <>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-[11px] px-2.5 flex-shrink-0"
              onClick={onBatchMove}
            >
              <FolderInput className="w-3 h-3 mr-1" />
              移动到{batchCount > 0 ? `(${batchCount})` : ''}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-[11px] px-2.5 flex-shrink-0 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
              onClick={onBatchDelete}
            >
              <Trash2 className="w-3 h-3 mr-1" />
              删除{batchCount > 0 ? `(${batchCount})` : ''}
            </Button>
            <Button
              size="sm"
              className="h-8 text-[11px] px-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 flex-shrink-0"
              onClick={onBatchGenerate}
              disabled={batchLoading}
            >
              {batchLoading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Package className="w-3 h-3 mr-1" />}
              批量生成{batchCount > 0 ? `(${batchCount})` : ''}
            </Button>
          </>
        )}
      </div>

      {scanProgress && (
        <div className="bg-amber-50 border border-amber-100 rounded-md px-2.5 py-1.5">
          <div className="flex items-center justify-between text-[10px] text-amber-800 mb-1">
            <span>正在扫描模板...</span>
            {onCancelScan && (
              <button onClick={onCancelScan} className="text-amber-700 hover:text-amber-900 underline">
                取消
              </button>
            )}
          </div>
          <div className="h-1.5 bg-amber-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 transition-all duration-200"
              style={{ width: `${scanProgress.total > 0 ? (scanProgress.processed / scanProgress.total) * 100 : 0}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-1">
            <p className="text-[10px] text-amber-600 truncate flex-1">{scanProgress.currentFile}</p>
            <span className="text-[10px] text-amber-700 flex-shrink-0 ml-2">
              {scanProgress.processed} / {scanProgress.total}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
