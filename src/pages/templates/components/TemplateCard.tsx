import { FileText, FileSpreadsheet, FileType, Presentation, Star, Clock, FileDown, Trash2, CheckSquare, Square, FolderInput, SlidersHorizontal, Edit3 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Template } from '@/types'

const FORMAT_ICON: Record<string, React.ReactNode> = {
  word: <FileType className="w-5 h-5" />,
  docx: <FileType className="w-5 h-5" />,
  excel: <FileSpreadsheet className="w-5 h-5" />,
  xlsx: <FileSpreadsheet className="w-5 h-5" />,
  ppt: <Presentation className="w-5 h-5" />,
  pptx: <Presentation className="w-5 h-5" />,
  pdf: <FileText className="w-5 h-5" />,
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

interface TemplateCardProps {
  template: Template
  selected: boolean
  deleting?: boolean
  onToggleSelect: () => void
  onGenerate: () => void
  onEdit: () => void
  onOpenEditor?: () => void
  onVariables?: () => void
  onDelete: () => void
  onMove?: () => void
  onDragStart?: (e: React.DragEvent) => void
}

export function TemplateCard({
  template,
  selected,
  deleting = false,
  onToggleSelect,
  onGenerate,
  onEdit,
  onOpenEditor,
  onVariables,
  onDelete,
  onMove,
  onDragStart,
}: TemplateCardProps) {
  const editableTypes = ['docx', 'xlsx']
  const isEditable = editableTypes.includes(template.fileType)

  return (
    <Card
      className={`group cursor-pointer transition-all hover:border-gray-300 hover:shadow-sm ${selected ? 'ring-1 ring-emerald-500 bg-emerald-50/30' : ''} ${deleting ? 'opacity-60 pointer-events-none' : ''}`}
      onClick={deleting ? undefined : (isEditable ? onOpenEditor : onEdit)}
      draggable={!deleting && !!onDragStart}
      onDragStart={onDragStart}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <button
            disabled={deleting}
            onClick={(e) => {
              e.stopPropagation()
              onToggleSelect()
            }}
            className="mt-1.5 text-gray-400 hover:text-emerald-600 transition-colors disabled:opacity-50"
          >
            {selected ? (
              <CheckSquare className="w-5 h-5 text-emerald-600" />
            ) : (
              <Square className="w-5 h-5" />
            )}
          </button>

          <div className={`w-11 h-11 rounded-xl ${FORMAT_COLOR[template.fileType]} flex items-center justify-center flex-shrink-0`}>
            {FORMAT_ICON[template.fileType]}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-base font-medium text-gray-800 truncate">{template.name}</p>
              {template.isBuiltIn && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 flex-shrink-0" />}
            </div>
            <p className="text-xs text-gray-500 truncate mt-1">
              {template.description || '暂无描述'}
            </p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge variant="secondary" className="text-[11px] px-2 py-0 h-5 font-normal">
                {template.category}
              </Badge>
              <span className="text-[11px] text-gray-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {template.variables?.length ? `${template.variables.length} 个变量` : '可编辑'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              disabled={deleting}
              onClick={(e) => {
                e.stopPropagation()
                onGenerate()
              }}
              className="h-9 px-3 rounded-lg bg-emerald-50 flex items-center gap-1.5 text-emerald-700 hover:bg-emerald-100 text-xs font-medium transition-colors disabled:opacity-50"
              title="生成文档"
            >
              <FileDown className="w-3.5 h-3.5" />
              生成
            </button>
            {isEditable && onVariables && (
              <button
                disabled={deleting}
                onClick={(e) => {
                  e.stopPropagation()
                  onVariables()
                }}
                className="h-9 w-9 rounded-lg hover:bg-slate-100 flex items-center justify-center text-gray-400 hover:text-slate-600 transition-colors disabled:opacity-50"
                title="变量映射"
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>
            )}
            {isEditable && onOpenEditor && (
              <button
                disabled={deleting}
                onClick={(e) => {
                  e.stopPropagation()
                  onOpenEditor()
                }}
                className="h-9 w-9 rounded-lg hover:bg-blue-50 flex items-center justify-center text-gray-400 hover:text-blue-600 transition-colors disabled:opacity-50"
                title="在线编辑"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            )}
            {onMove && (
              <button
                disabled={deleting}
                onClick={(e) => {
                  e.stopPropagation()
                  onMove()
                }}
                className="h-9 w-9 rounded-lg hover:bg-amber-50 flex items-center justify-center text-gray-400 hover:text-amber-600 transition-colors disabled:opacity-50"
                title="移动到"
              >
                <FolderInput className="w-4 h-4" />
              </button>
            )}
            <button
              disabled={deleting}
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              className="h-9 w-9 rounded-lg hover:bg-red-50 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
              title="删除模板"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
