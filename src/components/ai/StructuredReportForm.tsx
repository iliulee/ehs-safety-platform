import { useEffect, useState } from 'react'
import { Plus, Trash2, CloudSun, CalendarDays, HardHat, AlertTriangle, GraduationCap, FileWarning, Users, ClipboardList, Save, FileDown, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import type { DailyLog, DailyReportItem, DailyReportFormData, DailyReportSubmitData } from '@/types'

interface StructuredReportFormProps {
  initialData?: Partial<DailyReportFormData>
  inheritedKeys?: string[]
  loading?: boolean
  onSaveDraft?: (data: DailyReportSubmitData) => void
  onGenerate: (data: DailyReportSubmitData) => void
}

const WEATHER_OPTIONS = ['晴', '阴', '多云', '小雨', '中雨', '大雨', '雪', '雾', '风']

function today() {
  return new Date().toISOString().split('T')[0]
}

export function StructuredReportForm({
  initialData,
  inheritedKeys = [],
  loading = false,
  onSaveDraft,
  onGenerate,
}: StructuredReportFormProps) {
  const [form, setForm] = useState<DailyReportFormData>({
    date: initialData?.date ?? today(),
    weather: initialData?.weather ?? '晴',
    workContent: initialData?.workContent ?? '',
    hazards: initialData?.hazards ?? [],
    hasEducation: initialData?.hasEducation ?? false,
    educationTopic: initialData?.educationTopic ?? '',
    educationAttendees: initialData?.educationAttendees ?? '',
    hasPenalty: initialData?.hasPenalty ?? false,
    penaltyUnit: initialData?.penaltyUnit ?? '',
    penaltyAmount: initialData?.penaltyAmount ?? '',
    penaltyReason: initialData?.penaltyReason ?? '',
    hasTraining: initialData?.hasTraining ?? false,
    trainingTopic: initialData?.trainingTopic ?? '',
    trainingOrganizer: initialData?.trainingOrganizer ?? '',
    hasNewWorker: initialData?.hasNewWorker ?? false,
    newWorkerCount: initialData?.newWorkerCount ?? '',
    newWorkerNames: initialData?.newWorkerNames ?? '',
  })
  const [inheritedSet, setInheritedSet] = useState<Set<string>>(new Set(inheritedKeys))

  useEffect(() => {
    setForm({
      date: initialData?.date ?? today(),
      weather: initialData?.weather ?? '晴',
      workContent: initialData?.workContent ?? '',
      hazards: initialData?.hazards ?? [],
      hasEducation: initialData?.hasEducation ?? false,
      educationTopic: initialData?.educationTopic ?? '',
      educationAttendees: initialData?.educationAttendees ?? '',
      hasPenalty: initialData?.hasPenalty ?? false,
      penaltyUnit: initialData?.penaltyUnit ?? '',
      penaltyAmount: initialData?.penaltyAmount ?? '',
      penaltyReason: initialData?.penaltyReason ?? '',
      hasTraining: initialData?.hasTraining ?? false,
      trainingTopic: initialData?.trainingTopic ?? '',
      trainingOrganizer: initialData?.trainingOrganizer ?? '',
      hasNewWorker: initialData?.hasNewWorker ?? false,
      newWorkerCount: initialData?.newWorkerCount ?? '',
      newWorkerNames: initialData?.newWorkerNames ?? '',
    })
    setInheritedSet(new Set(inheritedKeys))
  }, [initialData, inheritedKeys])

  const isInherited = (key: string) => inheritedSet.has(key)

  const clearInherit = (key: string) => {
    setInheritedSet((prev) => {
      const next = new Set(prev)
      next.delete(key)
      return next
    })
  }

  const update = <K extends keyof DailyReportFormData>(key: K, value: DailyReportFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const addHazard = () => {
    setForm((prev) => ({
      ...prev,
      hazards: [
        ...prev.hazards,
        { id: `${Date.now()}`, title: '', level: '一般', measure: '', status: 'pending' },
      ],
    }))
  }

  const updateHazard = (index: number, field: keyof DailyReportFormData['hazards'][0], value: string) => {
    setForm((prev) => {
      const list = [...prev.hazards]
      list[index] = { ...list[index], [field]: value }
      return { ...prev, hazards: list }
    })
  }

  const removeHazard = (index: number) => {
    setForm((prev) => ({
      ...prev,
      hazards: prev.hazards.filter((_, i) => i !== index),
    }))
  }

  const buildSubmitData = (): DailyReportSubmitData => {
    const items: DailyReportItem[] = []

    if (form.workContent.trim()) {
      items.push({
        id: `wc-${Date.now()}`,
        type: 'workContent',
        title: form.workContent,
        data: { content: form.workContent },
        inherited: isInherited('workContent'),
        modified: isInherited('workContent'),
      })
    }

    form.hazards.forEach((h) => {
      items.push({
        id: h.id,
        type: 'hazard',
        title: h.title || '未命名隐患',
        data: { ...h },
        inherited: isInherited(h.id),
        modified: isInherited(h.id),
      })
    })

    if (form.hasEducation && form.educationTopic.trim()) {
      items.push({
        id: `edu-${Date.now()}`,
        type: 'education',
        title: form.educationTopic,
        data: {
          topic: form.educationTopic,
          attendees: form.educationAttendees,
        },
        inherited: isInherited('education'),
        modified: isInherited('education'),
      })
    }

    if (form.hasPenalty && form.penaltyUnit.trim()) {
      items.push({
        id: `pen-${Date.now()}`,
        type: 'penalty',
        title: `${form.penaltyUnit} · ${form.penaltyReason || '违规'}`,
        data: {
          unit: form.penaltyUnit,
          amount: Number(form.penaltyAmount) || 0,
          reason: form.penaltyReason,
        },
        inherited: isInherited('penalty'),
        modified: isInherited('penalty'),
      })
    }

    if (form.hasTraining && form.trainingTopic.trim()) {
      items.push({
        id: `trn-${Date.now()}`,
        type: 'training',
        title: form.trainingTopic,
        data: {
          topic: form.trainingTopic,
          organizer: form.trainingOrganizer,
        },
        inherited: isInherited('training'),
        modified: isInherited('training'),
      })
    }

    if (form.hasNewWorker && form.newWorkerNames.trim()) {
      items.push({
        id: `nw-${Date.now()}`,
        type: 'custom',
        title: `新工人进场三级教育 ${form.newWorkerCount} 人`,
        data: {
          count: Number(form.newWorkerCount) || 0,
          names: form.newWorkerNames,
        },
        inherited: isInherited('newWorker'),
        modified: isInherited('newWorker'),
      })
    }

    const hazardListText = form.hazards
      .map((h, i) => `${i + 1}. ${h.title || '未命名隐患'}（${h.level}）`)
      .join('；')

    const manualValues: Record<string, string> = {
      日期: form.date,
      天气: form.weather,
      施工内容: form.workContent,
      隐患数量: String(form.hazards.length),
      隐患列表: hazardListText,
      教育次数: form.hasEducation ? '1' : '0',
      培训主题: form.educationTopic,
      参与人员: form.educationAttendees,
      处罚次数: form.hasPenalty ? '1' : '0',
      罚款金额: form.penaltyAmount || '0',
      被处罚单位: form.penaltyUnit,
      违规原因: form.penaltyReason,
      培训次数: form.hasTraining ? '1' : '0',
      培训组织方: form.trainingOrganizer,
      新进场人数: form.newWorkerCount || '0',
      新进场人员: form.newWorkerNames,
    }

    const dailyLog: Omit<DailyLog, 'id' | 'createdAt' | 'updatedAt'> = {
      date: form.date,
      weather: form.weather,
      workContent: form.workContent,
      content: `${form.workContent}\n隐患${form.hazards.length}处；教育${form.hasEducation ? 1 : 0}次；处罚${form.hasPenalty ? 1 : 0}次。`,
      items,
    }

    return { dailyLog, manualValues }
  }

  const handleSaveDraft = () => {
    onSaveDraft?.(buildSubmitData())
  }

  const handleGenerate = () => {
    onGenerate(buildSubmitData())
  }

  const InheritBadge = ({ inheritKey }: { inheritKey: string }) => {
    if (!isInherited(inheritKey)) return null
    return (
      <Badge
        variant="outline"
        className="ml-2 text-amber-600 border-amber-200 bg-amber-50 cursor-pointer hover:bg-amber-100"
        onClick={() => clearInherit(inheritKey)}
        title="点击清除继承标记"
      >
        <RotateCcw className="w-3 h-3 mr-1" />
        继承自昨天
      </Badge>
    )
  }

  return (
    <div className="space-y-5">
      {/* 顶部基础信息 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-emerald-600" />
            基础信息
            <InheritBadge inheritKey="workContent" />
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="date">日期</Label>
            <Input
              id="date"
              type="date"
              value={form.date}
              onChange={(e) => update('date', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="weather" className="flex items-center gap-1.5">
              <CloudSun className="w-3.5 h-3.5" />
              天气
            </Label>
            <select
              id="weather"
              value={form.weather}
              onChange={(e) => update('weather', e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              {WEATHER_OPTIONS.map((w) => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="workContent" className="flex items-center gap-1.5">
              <ClipboardList className="w-3.5 h-3.5" />
              今日施工内容
            </Label>
            <Textarea
              id="workContent"
              placeholder="例如：基础土方开挖、钢筋绑扎、模板支设..."
              value={form.workContent}
              onChange={(e) => update('workContent', e.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* 安全巡查 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            安全巡查
            <Badge variant="secondary" className="ml-2 font-normal">
              {form.hazards.length} 处隐患
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {form.hazards.map((h, idx) => (
            <div key={h.id} className="rounded-lg border border-slate-200 p-3 space-y-3 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">隐患 {idx + 1}</span>
                <div className="flex items-center gap-1">
                  <InheritBadge inheritKey={h.id} />
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-slate-400 hover:text-red-500" onClick={() => removeHazard(idx)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  placeholder="隐患描述"
                  value={h.title}
                  onChange={(e) => updateHazard(idx, 'title', e.target.value)}
                />
                <select
                  value={h.level}
                  onChange={(e) => updateHazard(idx, 'level', e.target.value)}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="一般">一般</option>
                  <option value="较大">较大</option>
                  <option value="重大">重大</option>
                  <option value="特别重大">特别重大</option>
                </select>
                <Input
                  placeholder="整改措施"
                  value={h.measure}
                  onChange={(e) => updateHazard(idx, 'measure', e.target.value)}
                  className="md:col-span-2"
                />
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" className="w-full" onClick={addHazard}>
            <Plus className="w-3.5 h-3.5 mr-1" />
            新增隐患
          </Button>
        </CardContent>
      </Card>

      {/* 安全教育 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-blue-500" />
            安全教育
            <InheritBadge inheritKey="education" />
            <Switch checked={form.hasEducation} onCheckedChange={(v) => update('hasEducation', v)} className="ml-auto" />
          </CardTitle>
        </CardHeader>
        {form.hasEducation && (
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-0">
            <Input
              placeholder="教育主题"
              value={form.educationTopic}
              onChange={(e) => update('educationTopic', e.target.value)}
            />
            <Input
              placeholder="参与人员，如：张三、李四、王五"
              value={form.educationAttendees}
              onChange={(e) => update('educationAttendees', e.target.value)}
            />
          </CardContent>
        )}
      </Card>

      {/* 违规处罚 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <FileWarning className="w-4 h-4 text-red-500" />
            违规处罚
            <InheritBadge inheritKey="penalty" />
            <Switch checked={form.hasPenalty} onCheckedChange={(v) => update('hasPenalty', v)} className="ml-auto" />
          </CardTitle>
        </CardHeader>
        {form.hasPenalty && (
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-0">
            <Input
              placeholder="被处罚单位"
              value={form.penaltyUnit}
              onChange={(e) => update('penaltyUnit', e.target.value)}
            />
            <Input
              type="number"
              placeholder="罚款金额（元）"
              value={form.penaltyAmount}
              onChange={(e) => update('penaltyAmount', e.target.value)}
            />
            <Input
              placeholder="违规原因"
              value={form.penaltyReason}
              onChange={(e) => update('penaltyReason', e.target.value)}
            />
          </CardContent>
        )}
      </Card>

      {/* 培训学习 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <HardHat className="w-4 h-4 text-purple-500" />
            培训学习
            <InheritBadge inheritKey="training" />
            <Switch checked={form.hasTraining} onCheckedChange={(v) => update('hasTraining', v)} className="ml-auto" />
          </CardTitle>
        </CardHeader>
        {form.hasTraining && (
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-0">
            <Input
              placeholder="培训主题"
              value={form.trainingTopic}
              onChange={(e) => update('trainingTopic', e.target.value)}
            />
            <Input
              placeholder="组织方"
              value={form.trainingOrganizer}
              onChange={(e) => update('trainingOrganizer', e.target.value)}
            />
          </CardContent>
        )}
      </Card>

      {/* 新工人交底 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Users className="w-4 h-4 text-orange-500" />
            新工人进场三级教育
            <InheritBadge inheritKey="newWorker" />
            <Switch checked={form.hasNewWorker} onCheckedChange={(v) => update('hasNewWorker', v)} className="ml-auto" />
          </CardTitle>
        </CardHeader>
        {form.hasNewWorker && (
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-0">
            <Input
              type="number"
              placeholder="进场人数"
              value={form.newWorkerCount}
              onChange={(e) => update('newWorkerCount', e.target.value)}
            />
            <Input
              placeholder="姓名，如：赵六、钱七、孙八"
              value={form.newWorkerNames}
              onChange={(e) => update('newWorkerNames', e.target.value)}
            />
          </CardContent>
        )}
      </Card>

      {/* 底部操作栏 */}
      <div className="flex items-center justify-end gap-3 pt-2 sticky bottom-4 bg-white/90 backdrop-blur p-3 rounded-xl border border-slate-200 shadow-sm z-10">
        {onSaveDraft && (
          <Button variant="outline" onClick={handleSaveDraft} disabled={loading}>
            <Save className="w-4 h-4 mr-1.5" />
            保存草稿
          </Button>
        )}
        <Button onClick={handleGenerate} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
          {loading ? (
            <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-1.5" />
          ) : (
            <FileDown className="w-4 h-4 mr-1.5" />
          )}
          生成日报 Word
        </Button>
      </div>
    </div>
  )
}
