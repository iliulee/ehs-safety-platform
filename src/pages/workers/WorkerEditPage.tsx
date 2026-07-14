import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, Camera, Loader2, Plus, Trash2, FileText, Image as ImageIcon, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { FormField } from '@/components/ui/form-field'
import { OcrPreviewPanel } from '@/components/ocr/OcrPreviewPanel'
import { workerService } from '@/services/workerService'
import { subcontractorService } from '@/services/subcontractorService'
import { ocrService, type IdCardResult } from '@/services/ocr.service'
import {
  suggestIdCardFields,
  HIGH_CONFIDENCE_THRESHOLD,
  type Suggestion,
  type SuggestionKey,
} from '@/services/ocr-suggestions'
import { OCRError } from '@/types/errors'
import { useAppStore, getCurrentProjectId } from '@/store'
import { toast } from 'sonner'
import type { Subcontractor, Certificate } from '@/types'

const CERT_TYPES = ['身份证', '特种作业证', '安全C证', '健康证', '驾驶证', '其他']

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function WorkerEditPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id?: string }>()
  const isEdit = !!id

  const { getDictItems } = useAppStore()
  const workTypeItems = getDictItems('work_type')

  const subcontractors = useLiveQuery(
    async () => subcontractorService.list(),
    [],
    [] as Subcontractor[],
  )

  // 表单字段
  const [name, setName] = useState('')
  const [idCard, setIdCard] = useState('')
  const [phone, setPhone] = useState('')
  const [workType, setWorkType] = useState('')
  const [gender, setGender] = useState<'male' | 'female'>('male')
  const [nation, setNation] = useState('汉族')
  const [address, setAddress] = useState('')
  const [entryDate, setEntryDate] = useState('')
  const [subcontractor, setSubcontractor] = useState('')
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(isEdit)

  // OCR 状态
  const [ocrLoading, setOcrLoading] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [rawText, setRawText] = useState('')
  const [ocrConfidence, setOcrConfidence] = useState(0)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [appliedKeys, setAppliedKeys] = useState<Set<string>>(new Set())

  const idCardInputRef = useRef<HTMLInputElement>(null)
  const lastIdCardFileRef = useRef<File | null>(null)
  const objectUrlRef = useRef<string | null>(null)

  // 加载已有工人数据
  useEffect(() => {
    if (!isEdit || !id) {
      setEntryDate(new Date().toISOString().slice(0, 10))
      return
    }
    ;(async () => {
      try {
        const w = await workerService.getById(id)
        if (!w) {
          toast.error('未找到该人员记录')
          navigate('/workers', { replace: true })
          return
        }
        setName(w.name)
        setIdCard(w.idCard ?? '')
        setPhone(w.phone ?? '')
        setWorkType(w.workType ?? '')
        setGender((w.gender as 'male' | 'female') ?? 'male')
        setNation(w.nation ?? '汉族')
        setAddress(w.address ?? '')
        setEntryDate(w.entryDate ?? '')
        setSubcontractor(w.subcontractorId ?? '')
        setCertificates(await workerService.getCertificates(w.id!))
      } catch (err) {
        toast.error('加载人员失败：' + (err instanceof Error ? err.message : '未知错误'))
        navigate('/workers', { replace: true })
      } finally {
        setLoading(false)
      }
    })()
  }, [id, isEdit, navigate])

  // 清理 object URL
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
    }
  }, [])

  const resetOcrState = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
    setImageUrl(null)
    setRawText('')
    setOcrConfidence(0)
    setSuggestions([])
    setAppliedKeys(new Set())
  }

  const runIdCardOcr = async (file: File) => {
    setOcrLoading(true)
    try {
      const result: IdCardResult = await ocrService.recognizeIdCard(file)
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
      const url = URL.createObjectURL(file)
      objectUrlRef.current = url
      setImageUrl(url)
      setRawText(result.rawText)
      setOcrConfidence(result.confidence)
      const suggested = suggestIdCardFields(result.rawText)
      setSuggestions(suggested)
      setAppliedKeys(new Set())

      // 自动保存身份证照片到证件备案
      try {
        const base64 = await readFileAsBase64(file)
        const idNumberValue = suggested.find(
          (s) => s.key === 'idNumber' && s.validation.status === 'valid',
        )?.value
        const existingIdx = certificates.findIndex((c) => c.certType === '身份证')
        const certEntry: Certificate = {
          id: `temp_${Date.now()}`,
          workerId: id ?? '',
          certType: '身份证',
          certNumber: idNumberValue || undefined,
          issueAuthority: '',
          issueDate: '',
          expiryDate: '',
          attachmentUrl: base64,
        } as Certificate
        if (existingIdx >= 0) {
          setCertificates((prev) => prev.map((c, i) => (i === existingIdx ? { ...c, ...certEntry } : c)))
        } else {
          setCertificates((prev) => [...prev, certEntry])
        }
      } catch {
        // 附件保存失败不阻塞主流程
      }

      toast.success(`识别完成，置信度 ${result.confidence}%，请核对后填入`)
    } catch (err) {
      if (err instanceof OCRError) {
        toast.error(`身份证识别失败：${err.message}，请手动输入或重拍`)
      } else {
        toast.error('身份证识别失败，请手动输入或重拍')
      }
    } finally {
      setOcrLoading(false)
    }
  }

  const handleIdCardPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    lastIdCardFileRef.current = file
    await runIdCardOcr(file)
  }

  const handleRetryOcr = () => {
    if (!lastIdCardFileRef.current) {
      toast.error('请重新拍照')
      return
    }
    runIdCardOcr(lastIdCardFileRef.current)
  }

  const handleRetake = () => {
    resetOcrState()
    idCardInputRef.current?.click()
  }

  const handleTextChange = (text: string) => {
    setRawText(text)
    setSuggestions(suggestIdCardFields(text))
  }

  const handleApplyField = (key: SuggestionKey, value: string) => {
    switch (key) {
      case 'name':
        setName(value); break
      case 'idNumber':
        setIdCard(value); break
      case 'gender':
        setGender(value === '女' ? 'female' : 'male'); break
      case 'nation':
        setNation(value); break
      case 'address':
        setAddress(value); break
      case 'birthDate':
        toast.info('出生日期已复制到剪贴板，请手动粘贴到对应字段')
        navigator.clipboard?.writeText(value).catch(() => {})
        return
    }
    setAppliedKeys((prev) => new Set(prev).add(key))
    toast.success(`已填入「${value}」`)
  }

  const handleApplyAllHigh = () => {
    const newApplied = new Set(appliedKeys)
    let count = 0
    suggestions.forEach((s) => {
      if (s.confidence >= HIGH_CONFIDENCE_THRESHOLD && s.validation.status !== 'invalid' && !newApplied.has(s.key)) {
        switch (s.key) {
          case 'name': setName(s.value); break
          case 'idNumber': setIdCard(s.value); break
          case 'gender': setGender(s.value === '女' ? 'female' : 'male'); break
          case 'nation': setNation(s.value); break
          case 'address': setAddress(s.value); break
          case 'birthDate': return
        }
        newApplied.add(s.key)
        count++
      }
    })
    setAppliedKeys(newApplied)
    if (count > 0) {
      toast.success(`已填入 ${count} 个高置信度字段`)
    } else {
      toast.info('没有新的高置信度字段可填入')
    }
  }

  const addCertificate = () => {
    setCertificates((prev) => [
      ...prev,
      {
        id: `temp_${Date.now()}`,
        workerId: id ?? '',
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

  const handleDownloadAttachment = (cert: Certificate) => {
    if (!cert.attachmentUrl) return
    try {
      const a = document.createElement('a')
      a.href = cert.attachmentUrl
      a.download = `${cert.certType}_${cert.certNumber || '无编号'}.${cert.attachmentUrl.startsWith('data:application/pdf') ? 'pdf' : 'jpg'}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch {
      toast.error('下载失败')
    }
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

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('请填写姓名')
      return
    }
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
      if (isEdit && id) {
        await workerService.update(id, data)
        await workerService.saveCertificates(id, certificates)
        toast.success('已保存修改')
      } else {
        const workerId = await workerService.create(data)
        await workerService.saveCertificates(workerId, certificates)
        toast.success('已新增人员')
      }
      navigate('/workers', { replace: true })
    } catch (err) {
      toast.error('保存失败：' + (err instanceof Error ? err.message : '未知错误'))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <input
        ref={idCardInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={handleIdCardPhoto}
      />
      <div className="max-w-6xl mx-auto px-6 pt-6 flex flex-col gap-6">
        {/* 顶部 header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/workers')}
            className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" />
            返回人员列表
          </button>
          <div className="flex-1" />
          <h1 className="text-lg font-semibold text-slate-900">
            {isEdit ? '编辑人员' : '新增人员'}
          </h1>
        </div>

        {/* OCR 卡片（常驻页面顶部，与表单同宽） */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={ocrLoading}
            onClick={() => idCardInputRef.current?.click()}
            className="w-full h-10"
          >
            {ocrLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                正在识别身份证...
              </>
            ) : (
              <>
                <Camera className="w-4 h-4 mr-2" />
                拍照识别身份证
              </>
            )}
          </Button>
          {imageUrl && (
            <OcrPreviewPanel
              imageUrl={imageUrl}
              rawText={rawText}
              confidence={ocrConfidence}
              suggestions={suggestions}
              appliedKeys={appliedKeys}
              onApplyField={handleApplyField}
              onApplyAllHigh={handleApplyAllHigh}
              onTextChange={handleTextChange}
              onRetry={handleRetryOcr}
              onRetake={handleRetake}
              title="身份证识别"
            />
          )}
        </div>

        {/* 表单卡片（3 列布局） */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">基本信息</h3>
          <form className="grid grid-cols-3 gap-4">
          <FormField label="姓名" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="请输入姓名" />
          </FormField>
          <FormField label="性别">
            <Select value={gender} onChange={(e) => setGender(e.target.value as 'male' | 'female')}>
              <option value="male">男</option>
              <option value="female">女</option>
            </Select>
          </FormField>
          <FormField label="民族">
            <Input value={nation} onChange={(e) => setNation(e.target.value)} placeholder="汉族" />
          </FormField>
          <FormField label="身份证号">
            <Input value={idCard} onChange={(e) => setIdCard(e.target.value)} placeholder="18位身份证号" maxLength={18} />
          </FormField>
          <FormField label="联系电话">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="手机号码" />
          </FormField>
          <FormField label="工种">
            <Select value={workType} onChange={(e) => setWorkType(e.target.value)}>
              <option value="">请选择</option>
              {workTypeItems.map((w) => (
                <option key={w.code} value={w.code}>{w.label}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="进场日期">
            <Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
          </FormField>
          <FormField label="所属分包">
            <Select value={subcontractor} onChange={(e) => setSubcontractor(e.target.value)}>
              <option value="">请选择分包单位</option>
              {subcontractors.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="住址" className="col-span-3">
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="户籍地址" />
          </FormField>
        </form>
      </div>

      {/* 证件备案 */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-800">证件备案</h3>
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
                  onChange={(e) => updateCertificate(index, { certType: e.target.value })}
                  className="h-8 text-xs flex-1"
                >
                  {CERT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
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
                  onChange={(e) => updateCertificate(index, { certNumber: e.target.value })}
                  placeholder="证件号"
                  className="h-8 text-xs"
                />
                <Input
                  value={cert.issueAuthority ?? ''}
                  onChange={(e) => updateCertificate(index, { issueAuthority: e.target.value })}
                  placeholder="发证机关"
                  className="h-8 text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <FormField label="发证日期" className="mb-0">
                  <Input
                    type="date"
                    value={cert.issueDate ?? ''}
                    onChange={(e) => updateCertificate(index, { issueDate: e.target.value })}
                    className="h-8 text-xs"
                  />
                </FormField>
                <FormField label="有效期至" className="mb-0">
                  <Input
                    type="date"
                    value={cert.expiryDate ?? ''}
                    onChange={(e) => updateCertificate(index, { expiryDate: e.target.value })}
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
                    onChange={(e) => handleFileChange(index, e.target.files?.[0] ?? null)}
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
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDownloadAttachment(cert)}
                      type="button"
                      className="text-xs text-primary hover:text-primary/80 flex items-center gap-0.5 px-2 py-1 rounded hover:bg-primary/5"
                      title="下载原图"
                    >
                      <Download className="w-3.5 h-3.5" />
                      下载原图
                    </button>
                    <button
                      onClick={() => updateCertificate(index, { attachmentUrl: '' })}
                      type="button"
                      className="text-xs text-gray-400 hover:text-red-500"
                    >
                      清除
                    </button>
                  </div>
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

      {/* 底部固定操作栏 */}
      <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-3 flex justify-end gap-2">
        <Button variant="ghost" onClick={() => navigate('/workers')} disabled={submitting}>
          取消
        </Button>
        <Button onClick={handleSubmit} disabled={!name.trim() || submitting || ocrLoading}>
          {submitting ? '保存中...' : '保存'}
        </Button>
      </div>
    </div>
  )
}
