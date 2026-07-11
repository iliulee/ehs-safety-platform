import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Sheet } from '@/components/ui/sheet'
import { FormField } from '@/components/ui/form-field'
import { workerService } from '@/services/workerService'
import { getCurrentProjectId } from '@/store'
import { Plus, Trash2, FileText, Image as ImageIcon } from 'lucide-react'
import { toast } from 'sonner'
import type { Worker, Subcontractor, Certificate } from '@/types'

const CERT_TYPES = ['身份证', '特种作业证', '安全C证', '健康证', '驾驶证', '其他']

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

interface WorkerFormSheetProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  workTypeItems: { code: string; label: string }[]
  subcontractors: Subcontractor[]
  worker?: Worker | null
}

export function WorkerFormSheet({ open, onClose, onSuccess, workTypeItems, subcontractors, worker }: WorkerFormSheetProps) {
  const isEdit = !!worker
  const [name, setName] = useState('')
  const [idCard, setIdCard] = useState('')
  const [phone, setPhone] = useState('')
  const [workType, setWorkType] = useState('')
  const [gender, setGender] = useState<'male' | 'female'>('male')
  const [nation, setNation] = useState('汉族')
  const [address, setAddress] = useState('')
  const [entryDate, setEntryDate] = useState('')
  const [subcontractor, setSubcontractor] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [certificates, setCertificates] = useState<Certificate[]>([])

  useEffect(() => {
    if (open) {
      if (worker) {
        setName(worker.name); setIdCard(worker.idCard ?? ''); setPhone(worker.phone ?? '')
        setWorkType(worker.workType ?? ''); setGender((worker.gender as 'male' | 'female') ?? 'male')
        setNation(worker.nation ?? '汉族'); setAddress(worker.address ?? '')
        setEntryDate(worker.entryDate ?? ''); setSubcontractor(worker.subcontractorId ?? '')
        workerService.getCertificates(worker.id!).then(setCertificates)
      } else {
        setName(''); setIdCard(''); setPhone(''); setWorkType('')
        setGender('male'); setNation('汉族'); setAddress(''); setEntryDate(new Date().toISOString().slice(0, 10)); setSubcontractor('')
        setCertificates([])
      }
    }
  }, [open, worker])

  const handleSubmit = async () => {
    if (!name.trim()) return
    setSubmitting(true)
    try {
      const data = {
        name: name.trim(),
        idCard: idCard.trim() || undefined,
        phone: phone.trim() || undefined,
        workType: workType || undefined,
        gender,
        nation: nation.trim() || undefined,
        address: address.trim() || undefined,
        entryDate: entryDate || undefined,
        subcontractorId: subcontractor.trim() || undefined,
        status: 'active' as const,
        projectId: getCurrentProjectId(),
      }
      if (isEdit && worker?.id) {
        await workerService.update(worker.id, data)
        await workerService.saveCertificates(worker.id, certificates)
      } else {
        const workerId = await workerService.create(data)
        await workerService.saveCertificates(workerId, certificates)
      }
      onSuccess()
    } finally {
      setSubmitting(false)
    }
  }

  const addCertificate = () => {
    setCertificates((prev) => [
      ...prev,
      {
        id: `temp_${Date.now()}`,
        workerId: worker?.id ?? '',
        certType: '身份证',
        certNumber: '',
        issueAuthority: '',
        issueDate: '',
        expiryDate: '',
        attachmentUrl: '',
      } as Certificate,
    ])
  }

  const updateCertificate = (index: number, patch: Partial<Certificate>) => {
    setCertificates((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)))
  }

  const removeCertificate = (index: number) => {
    setCertificates((prev) => prev.filter((_, i) => i !== index))
  }

  const handleFileChange = async (index: number, file: File | null) => {
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error('单个附件不能超过 5MB')
      return
    }
    try {
      const base64 = await readFileAsBase64(file)
      updateCertificate(index, { attachmentUrl: base64 })
      toast.success('附件已上传')
    } catch {
      toast.error('附件读取失败')
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={isEdit ? '编辑人员' : '新增人员'}
      footer={
        <>
          <Button variant="outline" className="flex-1" onClick={onClose}>取消</Button>
          <Button className="flex-1" onClick={handleSubmit} disabled={!name.trim() || submitting}>
            {submitting ? '提交中...' : '保存'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <FormField label="姓名" required>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="请输入姓名" />
        </FormField>
        <div className="grid grid-cols-2 gap-2">
          <FormField label="性别">
            <Select value={gender} onChange={e => setGender(e.target.value as 'male' | 'female')}>
              <option value="male">男</option>
              <option value="female">女</option>
            </Select>
          </FormField>
          <FormField label="民族">
            <Input value={nation} onChange={e => setNation(e.target.value)} placeholder="汉族" />
          </FormField>
        </div>
        <FormField label="身份证号">
          <Input value={idCard} onChange={e => setIdCard(e.target.value)} placeholder="18位身份证号" maxLength={18} />
        </FormField>
        <FormField label="联系电话">
          <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="手机号码" />
        </FormField>
        <FormField label="工种">
          <Select value={workType} onChange={e => setWorkType(e.target.value)}>
            <option value="">请选择</option>
            {workTypeItems.map(w => (
              <option key={w.code} value={w.code}>{w.label}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="进场日期">
          <Input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} />
        </FormField>
        <FormField label="所属分包">
          <Select value={subcontractor} onChange={e => setSubcontractor(e.target.value)}>
            <option value="">请选择分包单位</option>
            {subcontractors.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="住址">
          <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="户籍地址" />
        </FormField>

        <div className="pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-800">证件备案</h4>
            <button
              onClick={addCertificate}
              type="button"
              className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium"
            >
              <Plus className="w-3.5 h-3.5" /> 添加证件
            </button>
          </div>

          <div className="space-y-3">
            {certificates.map((cert, index) => (
              <div key={cert.id ?? index} className="bg-gray-50 rounded-xl p-3 space-y-2.5">
                <div className="flex items-center gap-2">
                  <Select
                    value={cert.certType}
                    onChange={e => updateCertificate(index, { certType: e.target.value })}
                    className="h-8 text-xs flex-1"
                  >
                    {CERT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </Select>
                  <button
                    onClick={() => removeCertificate(index)}
                    type="button"
                    className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={cert.certNumber ?? ''}
                    onChange={e => updateCertificate(index, { certNumber: e.target.value })}
                    placeholder="证件号"
                    className="h-8 text-xs"
                  />
                  <Input
                    value={cert.issueAuthority ?? ''}
                    onChange={e => updateCertificate(index, { issueAuthority: e.target.value })}
                    placeholder="发证机关"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <FormField label="发证日期" className="mb-0">
                    <Input
                      type="date"
                      value={cert.issueDate ?? ''}
                      onChange={e => updateCertificate(index, { issueDate: e.target.value })}
                      className="h-8 text-xs"
                    />
                  </FormField>
                  <FormField label="有效期至" className="mb-0">
                    <Input
                      type="date"
                      value={cert.expiryDate ?? ''}
                      onChange={e => updateCertificate(index, { expiryDate: e.target.value })}
                      className="h-8 text-xs"
                    />
                  </FormField>
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex-1">
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="sr-only"
                      onChange={e => handleFileChange(index, e.target.files?.[0] ?? null)}
                    />
                    <div className={`h-8 px-3 rounded-lg border text-xs flex items-center gap-2 cursor-pointer hover:border-primary transition-colors ${
                      cert.attachmentUrl ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-white text-gray-500'
                    }`}>
                      {cert.attachmentUrl ? (
                        <>
                          {cert.attachmentUrl.startsWith('data:application/pdf') ? <FileText className="w-3.5 h-3.5" /> : <ImageIcon className="w-3.5 h-3.5" />}
                          已上传附件
                        </>
                      ) : (
                        <>上传图片或 PDF</>
                      )}
                    </div>
                  </label>
                  {cert.attachmentUrl && (
                    <button
                      onClick={() => updateCertificate(index, { attachmentUrl: '' })}
                      type="button"
                      className="text-xs text-gray-400 hover:text-red-500"
                    >
                      清除
                    </button>
                  )}
                </div>
              </div>
            ))}
            {certificates.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-2">暂无证件，点击上方按钮添加</p>
            )}
          </div>
        </div>
      </div>
    </Sheet>
  )
}
