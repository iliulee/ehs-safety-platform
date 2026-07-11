import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, FileText, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { StructuredReportForm } from '@/components/ai/StructuredReportForm'
import { InheritSelector } from '@/components/ai/InheritSelector'
import TemplateSelectDialog from '@/components/business/TemplateSelectDialog'
import { generateAndDownload } from '@/services/generate.service'
import { hazardService } from '@/services/hazardService'
import { educationService } from '@/services/educationService'
import { trainingService } from '@/services/trainingService'
import { penaltyService } from '@/services/penaltyService'
import { dailyLogService } from '@/services/dailyLogService'
import { templateService } from '@/services/templateService'
import {
  getYesterdayLog,
  itemsToFormData,
  type YesterdayData,
} from '@/services/daily-report.service'
import { getCurrentProjectId } from '@/store'
import type { Template, Hazard, EducationRecord, TrainingRecord, DailyReportItem, DailyReportFormData, DailyReportSubmitData } from '@/types'

export default function DailyReportPage() {
  const navigate = useNavigate()
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const [yesterdayData, setYesterdayData] = useState<YesterdayData | null>(null)
  const [showInheritSelector, setShowInheritSelector] = useState(false)
  const [initialFormData, setInitialFormData] = useState<Partial<DailyReportFormData>>({})
  const [inheritedKeys, setInheritedKeys] = useState<string[]>([])

  useEffect(() => {
    templateService.list().then((list) => {
      const docxTemplates = list.filter((t) => t.fileType === 'docx')
      setTemplates(docxTemplates)
      if (docxTemplates.length > 0) {
        setSelectedTemplateId(docxTemplates[0].id ?? '')
      }
    })
  }, [])

  // 检测昨日日报，默认今天的日期
  useEffect(() => {
    const checkYesterday = async () => {
      const today = new Date().toISOString().split('T')[0]
      const data = await getYesterdayLog(today, getCurrentProjectId() ?? undefined)
      if (data && data.items.length > 0) {
        setYesterdayData(data)
        setShowInheritSelector(true)
      }
    }
    checkYesterday().catch(console.error)
  }, [])

  const buildInheritKeys = (items: DailyReportItem[]): string[] => {
    const keys: string[] = []
    for (const item of items) {
      if (item.type === 'workContent') keys.push('workContent')
      if (item.type === 'hazard') keys.push(item.id)
      if (item.type === 'education') keys.push('education')
      if (item.type === 'penalty') keys.push('penalty')
      if (item.type === 'training') keys.push('training')
      if (item.type === 'custom') keys.push('newWorker')
    }
    return keys
  }

  const handleInheritConfirm = (value: { mode: string; selectedItems: DailyReportItem[] }) => {
    if (value.mode === 'blank' || value.selectedItems.length === 0) {
      setShowInheritSelector(false)
      setInitialFormData({})
      setInheritedKeys([])
      return
    }

    const today = new Date().toISOString().split('T')[0]
    const formData = itemsToFormData(value.selectedItems, today)
    setInitialFormData(formData)
    setInheritedKeys(buildInheritKeys(value.selectedItems))
    setShowInheritSelector(false)
  }

  const handleInheritSkip = () => {
    setShowInheritSelector(false)
  }

  const saveBusinessData = async (data: DailyReportSubmitData) => {
    const projectId = getCurrentProjectId()
    const date = data.dailyLog.date

    // 保存隐患
    const hazardPromises = data.dailyLog.items
      ?.filter((item) => item.type === 'hazard')
      .map((item) => {
        const h = item.data as { title: string; level: string; measure: string; status: string }
        return hazardService.create({
          title: h.title || '未命名隐患',
          description: h.measure,
          level: (['general', 'major'].includes(h.level) ? h.level : 'general') as Hazard['level'],
          status: (h.status || 'pending') as Hazard['status'],
          projectId,
          source: 'manual',
        } as Omit<Hazard, 'id' | 'createdAt' | 'updatedAt'>)
      }) ?? []

    // 保存处罚
    const penaltyPromises = data.dailyLog.items
      ?.filter((item) => item.type === 'penalty')
      .map((item) => {
        const p = item.data as { unit: string; amount: number; reason: string }
        return penaltyService.create({
          projectId,
          date,
          unit: p.unit,
          amount: p.amount || 0,
          reason: p.reason || '违规作业',
          status: 'pending',
        })
      }) ?? []

    // 保存安全教育
    const educationPromises = data.dailyLog.items
      ?.filter((item) => item.type === 'education')
      .map((item) => {
        const e = item.data as { topic: string; attendees: string }
        return educationService.create({
          projectId,
          title: e.topic,
          type: '三级教育',
          date,
          attendeeIds: e.attendees ? e.attendees.split(/[,，、]/).filter(Boolean) : [],
          content: e.topic,
        } as Omit<EducationRecord, 'id' | 'createdAt' | 'updatedAt'>)
      }) ?? []

    // 保存培训
    const trainingPromises = data.dailyLog.items
      ?.filter((item) => item.type === 'training')
      .map((item) => {
        const t = item.data as { topic: string; organizer: string }
        return trainingService.create({
          projectId,
          title: t.topic,
          type: '安全培训',
          date,
          attendeeIds: [],
          content: `组织方：${t.organizer || '甲方'}`,
        } as Omit<TrainingRecord, 'id' | 'createdAt' | 'updatedAt'>)
      }) ?? []

    await Promise.all([...hazardPromises, ...penaltyPromises, ...educationPromises, ...trainingPromises])
  }

  const handleSaveDraft = async (data: DailyReportSubmitData) => {
    setLoading(true)
    try {
      await dailyLogService.create(data.dailyLog)
      toast.success('草稿已保存')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = async (data: DailyReportSubmitData) => {
    if (!selectedTemplateId) {
      toast.error('请选择日报模板')
      return
    }

    setLoading(true)
    try {
      // 先保存业务数据
      await saveBusinessData(data)

      // 保存日报草稿
      await dailyLogService.create(data.dailyLog)

      // 生成 Word
      const result = await generateAndDownload(selectedTemplateId, {
        projectId: getCurrentProjectId(),
        manualValues: data.manualValues,
      })

      if (!result.blob) {
        if (result.manualVariables.length > 0) {
          toast.error(`需要手动填写：${result.manualVariables.map((v) => v.label ?? v.name).join('、')}`)
        } else if (result.missingRequired.length > 0) {
          toast.error(`缺少必填变量：${result.missingRequired.join('、')}`)
        } else {
          toast.error('生成失败')
        }
        return
      }

      toast.success('日报已生成')
    } catch (err) {
      const msg = err instanceof Error ? err.message : '生成失败'
      toast.error(msg)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-48px)] -m-6 bg-slate-50 pb-20">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="h-9 px-2" onClick={() => navigate('/')}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-base font-semibold text-slate-800">填写今日日报</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 text-sm font-normal"
              onClick={() => setTemplateDialogOpen(true)}
            >
              <FileText className="w-4 h-4 text-slate-400" />
              <span className="max-w-[140px] truncate">
                {selectedTemplateId
                  ? templates.find((t) => t.id === selectedTemplateId)?.name ?? '选择日报模板'
                  : '选择日报模板'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {templates.length === 0 && (
          <Card className="mb-4 border-amber-200 bg-amber-50">
            <CardContent className="py-4 text-sm text-amber-700">
              还没有 Word 日报模板，请先到"模板库"导入一个 .docx 模板并配置变量映射。
            </CardContent>
          </Card>
        )}

        {showInheritSelector && yesterdayData && (
          <InheritSelector
            yesterdayDate={yesterdayData.date}
            items={yesterdayData.items}
            onConfirm={handleInheritConfirm}
            onSkip={handleInheritSkip}
          />
        )}

        <StructuredReportForm
          initialData={initialFormData}
          inheritedKeys={inheritedKeys}
          loading={loading}
          onSaveDraft={handleSaveDraft}
          onGenerate={handleGenerate}
        />
      </div>

      <TemplateSelectDialog
        open={templateDialogOpen}
        onOpenChange={setTemplateDialogOpen}
        templates={templates}
        selectedId={selectedTemplateId}
        onSelect={setSelectedTemplateId}
      />
    </div>
  )
}
