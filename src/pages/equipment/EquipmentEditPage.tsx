import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Camera, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { OcrPreviewPanel } from '@/components/ocr/OcrPreviewPanel'
import { equipmentService } from '@/services/equipment.service'
import { ocrService, type NameplateResult } from '@/services/ocr.service'
import {
  suggestNameplateFields,
  HIGH_CONFIDENCE_THRESHOLD,
  type Suggestion,
  type SuggestionKey,
} from '@/services/ocr-suggestions'
import { OCRError } from '@/types/errors'
import { getCurrentProjectId } from '@/store'
import { toast } from 'sonner'
import type { Equipment } from '@/types'

const CATEGORIES = ['起重机械', '土方机械', '混凝土机械', '运输机械', '其他']
const STATUSES: Equipment['status'][] = ['在用', '停用', '已退场', '待检验']
const INSURANCE_TYPES = ['交强险', '商业险', '交强险+商业险', '无']

export default function EquipmentEditPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id?: string }>()
  const isEdit = !!id

  // 表单字段
  const [name, setName] = useState('')
  const [category, setCategory] = useState('起重机械')
  const [model, setModel] = useState('')
  const [serialNumber, setSerialNumber] = useState('')
  const [ownerUnit, setOwnerUnit] = useState('')
  const [entryDate, setEntryDate] = useState('')
  const [exitDate, setExitDate] = useState('')
  const [inspectionDate, setInspectionDate] = useState('')
  const [nextInspectionDate, setNextInspectionDate] = useState('')
  const [status, setStatus] = useState<Equipment['status']>('在用')
  const [remark, setRemark] = useState('')
  const [insuranceCompany, setInsuranceCompany] = useState('')
  const [insuranceType, setInsuranceType] = useState('')
  const [insuranceExpiryDate, setInsuranceExpiryDate] = useState('')
  // v5.0 Day 2 收尾新增 4 字段（铭牌识别）
  const [code, setCode] = useState('')
  const [manufacturer, setManufacturer] = useState('')
  const [manufactureLicense, setManufactureLicense] = useState('')
  const [ratedTorque, setRatedTorque] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(isEdit)

  // OCR 状态
  const [ocrLoading, setOcrLoading] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [rawText, setRawText] = useState('')
  const [ocrConfidence, setOcrConfidence] = useState(0)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [appliedKeys, setAppliedKeys] = useState<Set<string>>(new Set())

  const nameplateInputRef = useRef<HTMLInputElement>(null)
  const lastNameplateFileRef = useRef<File | null>(null)
  const objectUrlRef = useRef<string | null>(null)

  // 加载已有设备数据
  useEffect(() => {
    if (!isEdit || !id) return
    ;(async () => {
      try {
        const item = await equipmentService.getById(id)
        if (!item) {
          toast.error('未找到该设备记录')
          navigate('/equipment', { replace: true })
          return
        }
        setName(item.name)
        setCategory(item.category)
        setModel(item.model ?? '')
        setSerialNumber(item.serialNumber ?? '')
        setOwnerUnit(item.ownerUnit ?? '')
        setEntryDate(item.entryDate ?? '')
        setExitDate(item.exitDate ?? '')
        setInspectionDate(item.inspectionDate ?? '')
        setNextInspectionDate(item.nextInspectionDate ?? '')
        setStatus(item.status)
        setRemark(item.remark ?? '')
        setInsuranceCompany(item.insuranceCompany ?? '')
        setInsuranceType(item.insuranceType ?? '')
        setInsuranceExpiryDate(item.insuranceExpiryDate ?? '')
        setCode(item.code ?? '')
        setManufacturer(item.manufacturer ?? '')
        setManufactureLicense(item.manufactureLicense ?? '')
        setRatedTorque(item.ratedTorque ?? '')
      } catch (err) {
        toast.error('加载设备失败：' + (err instanceof Error ? err.message : '未知错误'))
        navigate('/equipment', { replace: true })
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

  const runNameplateOcr = async (file: File) => {
    setOcrLoading(true)
    try {
      const result: NameplateResult = await ocrService.recognizeEquipmentNameplate(file)
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
      const url = URL.createObjectURL(file)
      objectUrlRef.current = url
      setImageUrl(url)
      setRawText(result.rawText)
      setOcrConfidence(result.confidence)
      setSuggestions(suggestNameplateFields(result.rawText))
      setAppliedKeys(new Set())
      toast.success(`识别完成，置信度 ${result.confidence}%，请核对后填入`)
    } catch (err) {
      if (err instanceof OCRError) {
        toast.error(`铭牌识别失败：${err.message}，请手动输入或重拍`)
      } else {
        toast.error('铭牌识别失败，请手动输入或重拍')
      }
    } finally {
      setOcrLoading(false)
    }
  }

  const handleNameplatePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    lastNameplateFileRef.current = file
    await runNameplateOcr(file)
  }

  const handleRetryOcr = () => {
    if (!lastNameplateFileRef.current) {
      toast.error('请重新拍照')
      return
    }
    runNameplateOcr(lastNameplateFileRef.current)
  }

  const handleRetake = () => {
    resetOcrState()
    nameplateInputRef.current?.click()
  }

  const handleTextChange = (text: string) => {
    setRawText(text)
    setSuggestions(suggestNameplateFields(text))
  }

  const handleApplyField = (key: SuggestionKey, value: string) => {
    switch (key) {
      case 'serialNumber':
        setSerialNumber(value); break
      case 'model':
        setModel(value); break
      case 'deviceName':
        setName(value); break
      case 'code':
        setCode(value); break
      case 'manufacturer':
        setManufacturer(value); break
      case 'manufactureLicense':
        setManufactureLicense(value); break
      case 'ratedTorque':
        setRatedTorque(value); break
      default:
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
          case 'serialNumber': setSerialNumber(s.value); break
          case 'model': setModel(s.value); break
          case 'deviceName': setName(s.value); break
          case 'code': setCode(s.value); break
          case 'manufacturer': setManufacturer(s.value); break
          case 'manufactureLicense': setManufactureLicense(s.value); break
          case 'ratedTorque': setRatedTorque(s.value); break
          default: return
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

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('请填写设备名称')
      return
    }
    setSubmitting(true)
    try {
      const data = {
        name: name.trim(),
        category,
        model: model.trim() || undefined,
        serialNumber: serialNumber.trim() || undefined,
        ownerUnit: ownerUnit.trim() || undefined,
        entryDate: entryDate || undefined,
        exitDate: exitDate || undefined,
        inspectionDate: inspectionDate || undefined,
        nextInspectionDate: nextInspectionDate || undefined,
        status,
        remark: remark.trim() || undefined,
        projectId: getCurrentProjectId(),
        insuranceCompany: insuranceCompany.trim() || undefined,
        insuranceType: insuranceType || undefined,
        insuranceExpiryDate: insuranceExpiryDate || undefined,
        // v5.0 Day 2 收尾新增 4 字段
        code: code.trim() || undefined,
        manufacturer: manufacturer.trim() || undefined,
        manufactureLicense: manufactureLicense.trim() || undefined,
        ratedTorque: ratedTorque.trim() || undefined,
      }
      if (isEdit && id) {
        await equipmentService.update(id, data)
        toast.success('已保存修改')
      } else {
        await equipmentService.create(data as Parameters<typeof equipmentService.create>[0])
        toast.success('已登记设备')
      }
      navigate('/equipment', { replace: true })
    } catch (err) {
      toast.error('保存失败：' + (err instanceof Error ? err.message : '未知错误'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!isEdit || !id) return
    if (!confirm('确定删除该设备？此操作不可恢复。')) return
    try {
      await equipmentService.remove(id)
      toast.success('已删除设备')
      navigate('/equipment', { replace: true })
    } catch (err) {
      toast.error('删除失败：' + (err instanceof Error ? err.message : '未知错误'))
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
        ref={nameplateInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={handleNameplatePhoto}
      />
      <div className="max-w-6xl mx-auto px-6 pt-6 flex flex-col gap-6">
        {/* 顶部 header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/equipment')}
            className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" />
            返回设备列表
          </button>
          <div className="flex-1" />
          <h1 className="text-lg font-semibold text-slate-900">
            {isEdit ? '编辑设备' : '登记设备'}
          </h1>
        </div>

        {/* OCR 卡片（常驻页面顶部，与表单同宽） */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={ocrLoading}
            onClick={() => nameplateInputRef.current?.click()}
            className="w-full h-10"
          >
            {ocrLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                正在识别铭牌...
              </>
            ) : (
              <>
                <Camera className="w-4 h-4 mr-2" />
                拍照识别铭牌
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
              title="铭牌识别"
            />
          )}
        </div>

        {/* 表单卡片（3 列布局） */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">基本信息</h3>
          <form className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">设备名称 <span className="text-red-400">*</span></label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="如：塔式起重机"
              className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">类别</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            >
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">型号</label>
            <input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="如：QTZ80"
              className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">出厂编号</label>
            <input
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              placeholder="出厂编号"
              className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">所属单位</label>
            <input
              value={ownerUnit}
              onChange={(e) => setOwnerUnit(e.target.value)}
              placeholder="所属单位"
              className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">状态</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as Equipment['status'])}
              className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            >
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">进场日期</label>
            <input
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">退场日期</label>
            <input
              type="date"
              value={exitDate}
              onChange={(e) => setExitDate(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">上次检验日期</label>
            <input
              type="date"
              value={inspectionDate}
              onChange={(e) => setInspectionDate(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">下次检验日期</label>
            <input
              type="date"
              value={nextInspectionDate}
              onChange={(e) => setNextInspectionDate(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>
          {/* v5.0 Day 2 收尾新增 4 字段（铭牌识别） */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">设备编号/车牌</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="如：20914 / 云A12345"
              className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">制造商</label>
            <input
              value={manufacturer}
              onChange={(e) => setManufacturer(e.target.value)}
              placeholder="如：中联重科"
              className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">制造许可证号</label>
            <input
              value={manufactureLicense}
              onChange={(e) => setManufactureLicense(e.target.value)}
              placeholder="如：TS 2410383-2022"
              className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">额定起重力矩</label>
            <input
              value={ratedTorque}
              onChange={(e) => setRatedTorque(e.target.value)}
              placeholder="如：800 kN·m"
              className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>
        </form>
      </div>

      {/* 保险信息 */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-4">保险信息</h3>
        <form className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">保险公司</label>
            <input
              value={insuranceCompany}
              onChange={(e) => setInsuranceCompany(e.target.value)}
              placeholder="如：人保财险"
              className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">险种</label>
            <select
              value={insuranceType}
              onChange={(e) => setInsuranceType(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            >
              <option value="">请选择</option>
              {INSURANCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">保险到期日</label>
            <input
              type="date"
              value={insuranceExpiryDate}
              onChange={(e) => setInsuranceExpiryDate(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>
        </form>
      </div>

      {/* 备注 */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-4">备注</h3>
        <input
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
          placeholder="备注信息"
          className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
        />
      </div>
      </div>

      {/* 底部固定操作栏 */}
      <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-3 flex justify-end gap-2">
        {isEdit && (
          <Button variant="destructive" onClick={handleDelete} disabled={submitting} className="mr-auto">
            删除
          </Button>
        )}
        <Button variant="ghost" onClick={() => navigate('/equipment')} disabled={submitting}>
          取消
        </Button>
        <Button onClick={handleSubmit} disabled={!name.trim() || submitting || ocrLoading}>
          {submitting ? '保存中...' : '保存'}
        </Button>
      </div>
    </div>
  )
}
