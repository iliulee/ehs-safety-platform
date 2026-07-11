import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import type { VariableMapping } from '@/types'

interface ManualVariablesSheetProps {
  open: boolean
  onClose: () => void
  variables: VariableMapping[]
  values: Record<string, string>
  onChange: (name: string, value: string) => void
  onConfirm: () => void
  loading: boolean
}

export function ManualVariablesSheet({
  open,
  onClose,
  variables,
  values,
  onChange,
  onConfirm,
  loading,
}: ManualVariablesSheetProps) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="补填手动变量"
      footer={
        <Button className="flex-1 h-9 text-xs" onClick={onConfirm} disabled={loading}>
          {loading ? '生成中...' : '确认并生成'}
        </Button>
      }
    >
      <div className="space-y-3">
        <p className="text-[11px] text-gray-500">
          以下变量无法自动从项目数据获取，请手动填写后继续生成。
        </p>
        <div className="space-y-2.5">
          {variables.map((v) => (
            <div key={v.name}>
              <label className="text-xs text-gray-600 block mb-1">
                {v.label ?? v.name}
                {v.required && <span className="text-red-500 ml-0.5">*</span>}
              </label>
              <Input
                value={values[v.name] ?? ''}
                onChange={(e) => onChange(v.name, e.target.value)}
                placeholder={`请输入 ${v.label ?? v.name}`}
                className="h-8 text-xs"
              />
            </div>
          ))}
        </div>
      </div>
    </Sheet>
  )
}
