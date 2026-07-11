import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { FileWarning } from 'lucide-react'
import type { ImportPreviewItem, FailedScanItem } from '@/services/template-import.service'

interface ImportPreviewSheetProps {
  open: boolean
  onClose: () => void
  items: ImportPreviewItem[]
  failed: FailedScanItem[]
  strategy: 'skip' | 'overwrite'
  onStrategyChange: (v: 'skip' | 'overwrite') => void
  onConfirm: () => void
  loading: boolean
}

export function ImportPreviewSheet({
  open,
  onClose,
  items,
  failed,
  strategy,
  onStrategyChange,
  onConfirm,
  loading,
}: ImportPreviewSheetProps) {
  const newCount = items.filter((i) => i.status === 'new').length
  const dupCount = items.filter((i) => i.status === 'duplicate').length
  const buttonText = failed.length > 0
    ? `确认导入（${newCount} 新增 / ${dupCount} 重复，${failed.length} 个失败跳过）`
    : `确认导入（${newCount} 新增 / ${dupCount} 重复）`

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="批量导入预览"
      footer={
        <Button className="flex-1 h-9 text-xs" onClick={onConfirm} disabled={loading || items.length === 0}>
          {loading ? '导入中...' : buttonText}
        </Button>
      }
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">重复处理策略</span>
          <select
            value={strategy}
            onChange={(e) => onStrategyChange(e.target.value as 'skip' | 'overwrite')}
            className="h-8 px-2 text-xs border border-gray-200 rounded-md bg-white"
          >
            <option value="skip">跳过重复</option>
            <option value="overwrite">覆盖重复</option>
          </select>
        </div>

        {items.length > 0 && (
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            <div className="flex items-center gap-3 text-[10px] text-gray-500 px-1">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                模板 {items.filter((i) => i.kind === 'template').length} 个
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                知识库 {items.filter((i) => i.kind === 'knowledge').length} 个
              </span>
            </div>
            {items.map((item) => (
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

        {failed.length > 0 && (
          <div className="border border-red-100 rounded-lg overflow-hidden">
            <div className="bg-red-50 px-2.5 py-1.5 text-[11px] font-medium text-red-700">
              以下文件导入失败（{failed.length} 个）
            </div>
            <div className="max-h-[140px] overflow-y-auto p-2 space-y-1">
              {failed.map((item, idx) => (
                <div key={idx} className="text-[10px] text-red-600">
                  <p className="truncate">{item.relativePath}</p>
                  <p className="text-red-400">{item.reason}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {failed.some((f) => f.fileName.toLowerCase().endsWith('.doc')) && (
          <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 text-amber-800">
              <FileWarning className="w-4 h-4" />
              <span className="text-xs font-medium">.doc 格式转换引导</span>
            </div>
            <p className="text-[11px] text-amber-700 leading-relaxed">
              系统暂不支持旧版 .doc 二进制格式。请按下面步骤转成 .docx 后再导入：
            </p>
            <ol className="text-[11px] text-amber-700 list-decimal list-inside space-y-1">
              <li>用 Word 或 WPS 打开该 .doc 文件</li>
              <li>点击左上角「文件」→「另存为」</li>
              <li>保存类型选择「Word 文档 (*.docx)」</li>
              <li>回到本系统，选择转换后的 .docx 文件导入</li>
            </ol>
          </div>
        )}
      </div>
    </Sheet>
  )
}
