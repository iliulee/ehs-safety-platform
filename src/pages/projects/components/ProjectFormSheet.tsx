import { useEffect, useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Sheet } from '@/components/ui/sheet'
import { FormField } from '@/components/ui/form-field'
import { projectService } from '@/services/projectService'
import { variableSettingsService } from '@/services/variable-settings.service'
import { aiService } from '@/services/ai.service'
import { toast } from 'sonner'
import { X, Sparkles, Loader2 } from 'lucide-react'
import type { Project, GlobalVariable } from '@/types'

interface ProjectFormSheetProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  project?: Project | null
}

export function ProjectFormSheet({ open, onClose, onSuccess, project }: ProjectFormSheetProps) {
  const isEdit = !!project
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [location, setLocation] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [status, setStatus] = useState<'pending' | 'active' | 'paused' | 'completed'>('active')
  const [contractor, setContractor] = useState('')
  const [supervisor, setSupervisor] = useState('')
  const [owner, setOwner] = useState('')
  const [managerName, setManagerName] = useState('')
  const [techDirector, setTechDirector] = useState('')
  const [safetyOfficer, setSafetyOfficer] = useState('')
  const [safetyOfficerPhone, setSafetyOfficerPhone] = useState('')
  const [description, setDescription] = useState('')
  const [extraFields, setExtraFields] = useState<Record<string, string>>({})
  const [newFieldKey, setNewFieldKey] = useState('')
  const [newFieldValue, setNewFieldValue] = useState('')
  const [globalVars, setGlobalVars] = useState<GlobalVariable[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [aiExtracting, setAiExtracting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleAiExtract = async (file: File) => {
    const configured = await aiService.isConfigured()
    if (!configured) {
      toast.error('请先在设置中配置DeepSeek API Key')
      return
    }

    setAiExtracting(true)
    try {
      const info = await aiService.extractProjectInfoFromFile(file)

      if (info.name && !name) setName(info.name)
      if (info.code && !code) setCode(info.code)
      if (info.location && !location) setLocation(info.location)
      if (info.startDate && !startDate) setStartDate(info.startDate)
      if (info.endDate && !endDate) setEndDate(info.endDate)
      if (info.contractor && !contractor) setContractor(info.contractor)
      if (info.supervisor && !supervisor) setSupervisor(info.supervisor)
      if (info.owner && !owner) setOwner(info.owner)
      if (info.managerName && !managerName) setManagerName(info.managerName)
      if (info.techDirector && !techDirector) setTechDirector(info.techDirector)
      if (info.safetyOfficer && !safetyOfficer) setSafetyOfficer(info.safetyOfficer)
      if (info.safetyOfficerPhone && !safetyOfficerPhone) setSafetyOfficerPhone(info.safetyOfficerPhone)
      if (info.description && !description) setDescription(info.description)

      const filledCount = Object.values(info).filter(v => v).length
      toast.success(`AI识别完成，已填充${filledCount}个字段`)
    } catch (err: any) {
      toast.error(err.message || 'AI识别失败，请检查文件格式或API配置')
    } finally {
      setAiExtracting(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  useEffect(() => {
    if (open) {
      variableSettingsService.list().then(setGlobalVars)
    }
  }, [open])

  useEffect(() => {
    if (open) {
      if (project) {
        setName(project.name)
        setCode(project.code ?? '')
        setLocation(project.location ?? '')
        setStartDate(project.startDate ?? '')
        setEndDate(project.endDate ?? '')
        setStatus(project.status)
        setContractor(project.contractor ?? '')
        setSupervisor(project.supervisor ?? '')
        setOwner(project.owner ?? '')
        setManagerName(project.managerName ?? '')
        setTechDirector(project.techDirector ?? '')
        setSafetyOfficer(project.safetyOfficer ?? '')
        setSafetyOfficerPhone(project.safetyOfficerPhone ?? '')
        setDescription(project.description ?? '')
        setExtraFields(project.extraFields ?? {})
      } else {
        setName(''); setCode(''); setLocation('')
        setStartDate(new Date().toISOString().slice(0, 10))
        setEndDate('')
        setStatus('active')
        setContractor(''); setSupervisor(''); setOwner('')
        setManagerName(''); setTechDirector('')
        setSafetyOfficer(''); setSafetyOfficerPhone('')
        setDescription('')
        setExtraFields({})
      }
      setNewFieldKey('')
      setNewFieldValue('')
    }
  }, [open, project])

  const handleSubmit = async () => {
    if (!name.trim()) return
    setSubmitting(true)
    try {
      const data = {
        name: name.trim(),
        code: code.trim() || undefined,
        location: location.trim() || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        status,
        contractor: contractor.trim() || undefined,
        supervisor: supervisor.trim() || undefined,
        owner: owner.trim() || undefined,
        managerName: managerName.trim() || undefined,
        techDirector: techDirector.trim() || undefined,
        safetyOfficer: safetyOfficer.trim() || undefined,
        safetyOfficerPhone: safetyOfficerPhone.trim() || undefined,
        description: description.trim() || undefined,
        extraFields: Object.keys(extraFields).length > 0 ? extraFields : undefined,
      }
      if (isEdit && project?.id) {
        await projectService.update(project.id, data)
      } else {
        await projectService.create(data)
      }
      onSuccess()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={isEdit ? '编辑项目' : '新建项目'}
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
        {!isEdit && (
          <div className="bg-violet-50 border border-violet-100 rounded-lg p-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".docx,.txt,.md,.pdf"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0]
                if (file) handleAiExtract(file)
              }}
            />
            <Button
              size="sm"
              variant="outline"
              className="w-full h-8 text-xs gap-1 text-violet-600 border-violet-200 bg-white hover:bg-violet-100"
              disabled={aiExtracting}
              onClick={() => fileInputRef.current?.click()}
            >
              {aiExtracting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              {aiExtracting ? 'AI识别中，请稍候...' : 'AI导入：从Word/PDF自动提取项目信息'}
            </Button>
            <p className="text-[10px] text-violet-500 mt-1.5 text-center">
              支持施工组织设计、项目立项文件、合同等文件自动识别
            </p>
          </div>
        )}

        <FormField label="项目名称" required>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="如：XX小区二期工程" />
        </FormField>
        <div className="grid grid-cols-2 gap-2">
          <FormField label="项目编号">
            <Input value={code} onChange={e => setCode(e.target.value)} placeholder="项目编号" />
          </FormField>
          <FormField label="项目状态" required>
            <Select value={status} onChange={e => setStatus(e.target.value as any)}>
              <option value="pending">待开工</option>
              <option value="active">施工中</option>
              <option value="paused">已停工</option>
              <option value="completed">已竣工</option>
            </Select>
          </FormField>
        </div>
        <FormField label="项目地点">
          <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="如：XX市XX区XX路" />
        </FormField>
        <div className="grid grid-cols-2 gap-2">
          <FormField label="计划开工">
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </FormField>
          <FormField label="计划竣工">
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </FormField>
        </div>
        <FormField label="施工单位">
          <Input value={contractor} onChange={e => setContractor(e.target.value)} placeholder="施工单位名称" />
        </FormField>
        <FormField label="监理单位">
          <Input value={supervisor} onChange={e => setSupervisor(e.target.value)} placeholder="监理单位名称" />
        </FormField>
        <FormField label="建设单位">
          <Input value={owner} onChange={e => setOwner(e.target.value)} placeholder="建设单位名称" />
        </FormField>
        <div className="grid grid-cols-2 gap-2">
          <FormField label="项目经理">
            <Input value={managerName} onChange={e => setManagerName(e.target.value)} placeholder="姓名" />
          </FormField>
          <FormField label="技术负责人">
            <Input value={techDirector} onChange={e => setTechDirector(e.target.value)} placeholder="姓名" />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <FormField label="安全员">
            <Input value={safetyOfficer} onChange={e => setSafetyOfficer(e.target.value)} placeholder="姓名" />
          </FormField>
          <FormField label="安全员电话">
            <Input value={safetyOfficerPhone} onChange={e => setSafetyOfficerPhone(e.target.value)} placeholder="联系电话" />
          </FormField>
        </div>
        <FormField label="项目简介">
          <Textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="项目概况、建筑面积、结构类型等" />
        </FormField>

        {globalVars.filter((v) => v.source === 'project' && v.extraFieldKey).length > 0 && (
          <div className="pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-700">项目变量字段</span>
              <span className="text-[10px] text-gray-400">与模板变量对应</span>
            </div>
            <div className="space-y-2">
              {globalVars
                .filter((v) => v.source === 'project' && v.extraFieldKey)
                .map((v) => (
                  <FormField key={v.id} label={v.label}>
                    <Input
                      value={extraFields[v.extraFieldKey!] ?? ''}
                      onChange={(e) =>
                        setExtraFields((prev) => ({
                          ...prev,
                          [v.extraFieldKey!]: e.target.value,
                        }))
                      }
                      placeholder={`请输入${v.label}`}
                      className="h-9 text-xs"
                    />
                  </FormField>
                ))}
            </div>
          </div>
        )}

        <div className="pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-700">其他扩展字段</span>
            <span className="text-[10px] text-gray-400">自由添加</span>
          </div>
          <div className="space-y-2">
            {Object.entries(extraFields).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2">
                <div className="w-28 px-2 py-1.5 text-xs text-gray-600 bg-gray-100 rounded-md border border-gray-200 truncate">
                  {key}
                </div>
                <Input
                  value={value}
                  onChange={e => setExtraFields(prev => ({ ...prev, [key]: e.target.value }))}
                  placeholder="字段值"
                  className="h-8 text-xs flex-1"
                />
                <button
                  onClick={() => setExtraFields(prev => {
                    const next = { ...prev }
                    delete next[key]
                    return next
                  })}
                  className="w-8 h-8 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-md border border-transparent hover:border-red-100"
                  title="删除"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <Input
                value={newFieldKey}
                onChange={e => setNewFieldKey(e.target.value)}
                placeholder="字段名，如 qualityDirector"
                className="h-8 text-xs w-28"
              />
              <Input
                value={newFieldValue}
                onChange={e => setNewFieldValue(e.target.value)}
                placeholder="字段值"
                className="h-8 text-xs flex-1"
              />
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs px-2"
                onClick={() => {
                  const key = newFieldKey.trim()
                  if (!key) return
                  setExtraFields(prev => ({ ...prev, [key]: newFieldValue }))
                  setNewFieldKey('')
                  setNewFieldValue('')
                }}
              >
                添加
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Sheet>
  )
}