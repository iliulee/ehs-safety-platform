import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/sheet'
import type { BatchRenderResult } from '@/services/generate.service'

interface BatchResultSheetProps {
  open: boolean
  onClose: () => void
  result: BatchRenderResult | null
}

export function BatchResultSheet({ open, onClose, result }: BatchResultSheetProps) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="批量生成结果"
      footer={
        <Button className="flex-1 h-9 text-xs" variant="outline" onClick={onClose}>
          关闭
        </Button>
      }
    >
      {result && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-2 text-center">
              <p className="text-lg font-semibold text-emerald-700">{result.success}</p>
              <p className="text-[10px] text-emerald-600">成功</p>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-lg p-2 text-center">
              <p className="text-lg font-semibold text-amber-700">{result.skipped}</p>
              <p className="text-[10px] text-amber-600">跳过</p>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-lg p-2 text-center">
              <p className="text-lg font-semibold text-red-700">{result.failed}</p>
              <p className="text-[10px] text-red-600">失败</p>
            </div>
          </div>

          {result.details.length > 0 && (
            <div className="space-y-1 max-h-[260px] overflow-y-auto">
              {result.details.map((d, i) => (
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

          {result.success > 0 && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-2">
              <p className="text-[11px] text-blue-700">已自动打包下载 ZIP 文件，包含 {result.success} 份生成的文档。</p>
            </div>
          )}
        </div>
      )}
    </Sheet>
  )
}
