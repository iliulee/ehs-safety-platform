import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Sheet } from '@/components/ui/sheet'
import { FormField } from '@/components/ui/form-field'
import { hazardService } from '@/services/hazardService'
import type { Hazard } from '@/types'

interface ReviewSheetProps {
  hazard: Hazard
  onClose: () => void
  onSuccess: () => void
}

export function ReviewSheet({ hazard, onClose, onSuccess }: ReviewSheetProps) {
  const [comment, setComment] = useState('')
  const [result, setResult] = useState<'pass' | 'fail'>('pass')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!hazard.id) return
    setSubmitting(true)
    try {
      await hazardService.update(hazard.id, {
        reviewComment: comment.trim() || (result === 'pass' ? '复查合格，同意闭环' : '复查不合格，需重新整改'),
        reviewDate: new Date().toISOString().slice(0, 10),
        status: result === 'pass' ? 'closed' : 'rectifying',
      })
      onSuccess()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Sheet
      open={true}
      onClose={onClose}
      title="复查验收"
      footer={
        <>
          <Button variant="outline" className="flex-1" onClick={onClose}>
            取消
          </Button>
          <Button
            className={
              result === 'pass'
                ? 'flex-1 bg-emerald-600 hover:bg-emerald-700'
                : 'flex-1 bg-amber-600 hover:bg-amber-700'
            }
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? '提交中...' : result === 'pass' ? '复查通过' : '复查不通过'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="bg-blue-50 rounded-lg p-3">
          <p className="text-xs text-blue-600 mb-1">整改措施</p>
          <p className="text-sm text-gray-800">{hazard.rectifyMeasure ?? '无'}</p>
        </div>
        <FormField label="复查结果" required>
          <Select value={result} onChange={(e) => setResult(e.target.value as 'pass' | 'fail')}>
            <option value="pass">复查合格，同意闭环</option>
            <option value="fail">复查不合格，需重新整改</option>
          </Select>
        </FormField>
        <FormField label="复查意见">
          <Textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="填写复查意见（可选）" />
        </FormField>
      </div>
    </Sheet>
  )
}
