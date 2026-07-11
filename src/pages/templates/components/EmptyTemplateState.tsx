import { FileText, Upload, FolderOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmptyTemplateStateProps {
  onImport: () => void
  onScan: () => void
}

export function EmptyTemplateState({ onImport, onScan }: EmptyTemplateStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
      <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center mb-3">
        <FileText className="w-7 h-7 text-gray-300" />
      </div>
      <p className="text-sm font-medium text-gray-700 mb-1">当前分类暂无模板</p>
      <p className="text-xs text-gray-500 mb-4 max-w-xs">
        点击「导入单个文件」上传模板，或使用「扫描文件夹」批量导入本地资料。
      </p>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          className="h-8 text-[11px] px-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
          onClick={onImport}
        >
          <Upload className="w-3 h-3 mr-1" />
          导入单个文件
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-[11px] px-3"
          onClick={onScan}
        >
          <FolderOpen className="w-3 h-3 mr-1" />
          扫描文件夹
        </Button>
      </div>
    </div>
  )
}
