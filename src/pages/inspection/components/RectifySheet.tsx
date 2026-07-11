import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Sheet } from '@/components/ui/sheet'
import { FormField } from '@/components/ui/form-field'
import { hazardService } from '@/services/hazardService'
import type { Hazard } from '@/types'

interface RectifySheetProps {
  hazard: Hazard
  onClose: () => void
  onSuccess: () => void
}

export function RectifySheet({ hazard, onClose, onSuccess }: RectifySheetProps) {
  const [measure, setMeasure] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (hazard) setMeasure(hazard.rectifyMeasure ?? '')
  }, [hazard])

  const handleSubmit = async () => {
    if (!measure.trim() || !hazard.id) return
    setSubmitting(true)
    try {
      await hazardService.update(hazard.id, {
        rectifyMeasure: measure.trim(),
        rectifyDate: new Date().toISOString().slice(0, 10),
        status: 'reviewing',
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
      title="整改反馈"
      footer={
        <>
          <Button variant="outline" className="flex-1" onClick={onClose}>
            取消
          </Button>
          <Button className="flex-1" onClick={handleSubmit} disabled={!measure.trim() || submitting}>
            {submitting ? '提交中...' : '提交整改'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="bg-amber-50 rounded-lg p-3">
          <p className="text-xs text-amber-600 mb-1">隐患内容</p>
          <p className="text-sm text-gray-800">{hazard.title}</p>
        </div>
        <FormField label="整改措施" required>
          <Textarea rows={4} value={measure} onChange={(e) => setMeasure(e.target.value)} placeholder="描述整改措施和完成情况" />
        </FormField>
      </div>
    </Sheet>
  )
}
