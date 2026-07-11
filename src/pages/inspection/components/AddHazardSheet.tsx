import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Sheet } from '@/components/ui/sheet'
import { FormField } from '@/components/ui/form-field'
import { hazardService } from '@/services/hazardService'
import { getCurrentProjectId } from '@/store'

interface AddHazardSheetProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  categoryItems: { code: string; label: string }[]
}

export function AddHazardSheet({ open, onClose, onSuccess, categoryItems }: AddHazardSheetProps) {
  const [title, setTitle] = useState('')
  const [level, setLevel] = useState<'general' | 'major' | 'serious'>('general')
  const [category, setCategory] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [deadline, setDeadline] = useState('')
  const [rectifyPerson, setRectifyPerson] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setTitle('')
      setLevel('general')
      setCategory('')
      setLocation('')
      setDescription('')
      setDeadline('')
      setRectifyPerson('')
    }
  }, [open])

  const handleSubmit = async () => {
    if (!title.trim()) return
    setSubmitting(true)
    try {
      await hazardService.create({
        title: title.trim(),
        level,
        category: category || undefined,
        location: location.trim() || undefined,
        description: description.trim() || undefined,
        status: 'pending',
        projectId: getCurrentProjectId(),
        rectifyDeadline: deadline || undefined,
        rectifyPersonId: rectifyPerson.trim() || undefined,
        source: 'manual',
      })
      onSuccess()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="新增隐患"
      footer={
        <>
          <Button variant="outline" className="flex-1" onClick={onClose}>
            取消
          </Button>
          <Button className="flex-1" onClick={handleSubmit} disabled={!title.trim() || submitting}>
            {submitting ? '提交中...' : '提交'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <FormField label="隐患标题" required>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="简要描述隐患内容" />
        </FormField>
        <FormField label="隐患级别" required>
          <Select value={level} onChange={(e) => setLevel(e.target.value as 'general' | 'major' | 'serious')}>
            <option value="general">一般隐患</option>
            <option value="major">较大隐患</option>
            <option value="serious">重大隐患</option>
          </Select>
        </FormField>
        <FormField label="隐患分类">
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">请选择</option>
            {categoryItems.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="隐患部位">
          <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="如：3号楼东侧脚手架" />
        </FormField>
        <FormField label="整改期限">
          <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </FormField>
        <FormField label="整改责任人">
          <Input value={rectifyPerson} onChange={(e) => setRectifyPerson(e.target.value)} placeholder="责任人姓名" />
        </FormField>
        <FormField label="隐患描述">
          <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="详细描述隐患情况" />
        </FormField>
      </div>
    </Sheet>
  )
}
