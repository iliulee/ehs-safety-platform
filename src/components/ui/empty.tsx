import { FileX } from 'lucide-react'

interface EmptyProps {
  title?: string
  description?: string
  action?: React.ReactNode
}

export function Empty({ title = '暂无数据', description = '点击右下角按钮新增', action }: EmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center px-4">
      <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center mb-3">
        <FileX className="w-7 h-7 text-gray-300" />
      </div>
      <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
      <p className="text-xs text-gray-400 mb-4">{description}</p>
      {action}
    </div>
  )
}
