import { useState } from 'react'
import { Bot, Loader2, AlertCircle, CheckCircle2, Wand2 } from 'lucide-react'
import { Sheet } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { aiParser, type ParsedDailyData } from '@/services/ai-parser.service'
import { hazardService } from '@/services/hazardService'
import { educationService } from '@/services/educationService'
import { penaltyService } from '@/services/penaltyService'
import { getCurrentProjectId } from '@/store'
import type { DailyReportFormData, HazardLevel } from '@/types'

/** AI 返回的 hazard level → 业务表 HazardLevel 映射（critical → serious） */
const HAZARD_LEVEL_MAP: Record<'general' | 'major' | 'critical', HazardLevel> = {
  general: 'general',
  major: 'major',
  critical: 'serious',
}

interface Props {
  open: boolean
  onClose: () => void
  projectId?: string
  onApply: (data: Partial<DailyReportFormData>) => void
}

/**
 * AI 文字拆解对话框
 * 粘贴微信语音转文字 → AI 拆解 → 应用到日报表单
 */
export function AiParseDialog({ open, onClose, projectId, onApply }: Props) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ParsedDailyData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleParse = async () => {
    if (!text.trim()) {
      toast.error('请先粘贴待拆解的文字')
      return
    }
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const parsed = await aiParser.parseDailyNarrative(text, projectId ?? '')
      setResult(parsed)
      toast.success('拆解完成，请确认后应用到表单')
    } catch (err) {
      const msg = err instanceof Error ? err.message : '拆解失败'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  /** 把 AI 拆解结果转成表单数据 */
  const buildFormData = (): Partial<DailyReportFormData> => {
    if (!result) return {}
    const data: Partial<DailyReportFormData> = {}
    if (result.dailyLog) {
      data.date = result.dailyLog.date
      data.weather = result.dailyLog.weather ?? '晴'
      data.workContent = result.dailyLog.workContent ?? ''
    }
    if (result.hazards && result.hazards.length > 0) {
      data.hazards = result.hazards.map((h, i) => ({
        id: `ai_hazard_${Date.now()}_${i}`,
        title: h.title,
        level: h.level,
        measure: '',
        status: h.status,
      }))
    }
    if (result.educationRecords && result.educationRecords.length > 0) {
      data.hasEducation = true
      data.educationTopic = result.educationRecords[0].topic
      data.educationAttendees = result.educationRecords[0].attendeeNames.join('、')
    }
    if (result.penalties && result.penalties.length > 0) {
      data.hasPenalty = true
      data.penaltyUnit = result.penalties[0].targetName
      data.penaltyReason = result.penalties[0].reason
      data.penaltyAmount = result.penalties[0].amount?.toString() ?? ''
    }
    return data
  }

  const handleApply = () => {
    const formData = buildFormData()
    onApply(formData)
    toast.success('已应用到表单')
    // 重置 + 关闭
    setText('')
    setResult(null)
    setError(null)
    onClose()
  }

  /** Demo 应急：直接把拆解结果写到业务表（隐患/教育/处罚） */
  const handleSaveDirect = async () => {
    if (!result) return
    const projectId = getCurrentProjectId()
    let hazardCount = 0
    let eduCount = 0
    let penaltyCount = 0

    try {
      // 隐患
      if (result.hazards) {
        for (const h of result.hazards) {
          await hazardService.create({
            title: h.title,
            description: h.location ?? '',
            location: h.location,
            level: HAZARD_LEVEL_MAP[h.level],
            status: h.status,
            projectId,
            source: 'ai',
          })
          hazardCount++
        }
      }

      // 教育
      if (result.educationRecords) {
        for (const e of result.educationRecords) {
          await educationService.create({
            projectId,
            title: e.topic,
            type: '三级教育',
            date: e.date || new Date().toISOString().split('T')[0],
            attendeeIds: [],
            content: e.topic,
          })
          eduCount++
        }
      }

      // 处罚
      if (result.penalties) {
        for (const p of result.penalties) {
          await penaltyService.create({
            projectId,
            date: p.date || new Date().toISOString().split('T')[0],
            unit: p.targetName,
            amount: p.amount ?? 0,
            reason: p.reason,
            status: 'pending',
          })
          penaltyCount++
        }
      }

      toast.success(`已保存：${hazardCount} 条隐患 / ${eduCount} 场教育 / ${penaltyCount} 条处罚`)

      // 重置 + 关闭
      setText('')
      setResult(null)
      setError(null)
      onClose()
    } catch (err) {
      toast.error('保存失败：' + (err instanceof Error ? err.message : '未知错误'))
    }
  }

  const handleClose = () => {
    setText('')
    setResult(null)
    setError(null)
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={handleClose}
      title="AI 文字拆解"
      className="max-w-3xl"
      footer={
        <>
          <Button variant="outline" className="flex-1" onClick={handleClose}>取消</Button>
          {!result ? (
            <Button className="flex-1" onClick={handleParse} disabled={loading || !text.trim()}>
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-1 animate-spin" />拆解中...</>
              ) : (
                <><Bot className="w-4 h-4 mr-1" />开始拆解</>
              )}
            </Button>
          ) : (
            <>
              <Button variant="outline" className="flex-1" onClick={handleApply}>
                <Wand2 className="w-4 h-4 mr-1" />
                应用到表单
              </Button>
              <Button
                className="flex-1 bg-amber-600 hover:bg-amber-700"
                onClick={handleSaveDirect}
              >
                <CheckCircle2 className="w-4 h-4 mr-1" />
                直接保存
              </Button>
            </>
          )}
        </>
      }
    >
      <div className="space-y-3">
        {/* 输入区 */}
        <div>
          <label className="text-xs text-gray-500 mb-1 block">粘贴微信语音转文字 / 工地口述</label>
          <Textarea
            rows={6}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="例如：今天天气晴，25度。上午进行高处作业安全培训，张三李四王五参加。发现2号塔吊周边护栏缺失，已安排整改。下午对木工班罚款200元，原因是未戴安全帽。"
            className="resize-none"
          />
          <p className="text-[10px] text-gray-400 mt-1">提示：AI 会自动提取日期、天气、教育、隐患、处罚等信息</p>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="p-3 rounded-lg bg-red-50 text-red-700 flex items-start gap-2 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">拆解失败</p>
              <p className="text-xs mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* 解析结果 */}
        {result && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm font-medium">拆解完成</span>
            </div>

            {/* 日报基础 */}
            {result.dailyLog && (
              <ResultSection title="日报基础" color="bg-blue-50 text-blue-700">
                <p className="text-xs">日期：{result.dailyLog.date}</p>
                {result.dailyLog.weather && <p className="text-xs">天气：{result.dailyLog.weather}</p>}
                {result.dailyLog.workContent && <p className="text-xs">工作内容：{result.dailyLog.workContent}</p>}
              </ResultSection>
            )}

            {/* 隐患 */}
            {result.hazards && result.hazards.length > 0 && (
              <ResultSection title={`隐患（${result.hazards.length}条）`} color="bg-red-50 text-red-700">
                {result.hazards.map((h, i) => (
                  <p key={i} className="text-xs">• {h.title} [{h.level}] {h.location ?? ''}</p>
                ))}
              </ResultSection>
            )}

            {/* 教育 */}
            {result.educationRecords && result.educationRecords.length > 0 && (
              <ResultSection title={`教育（${result.educationRecords.length}场）`} color="bg-violet-50 text-violet-700">
                {result.educationRecords.map((e, i) => (
                  <p key={i} className="text-xs">• {e.topic}（{e.attendeeNames.join('、')}）</p>
                ))}
              </ResultSection>
            )}

            {/* 处罚 */}
            {result.penalties && result.penalties.length > 0 && (
              <ResultSection title={`处罚（${result.penalties.length}条）`} color="bg-amber-50 text-amber-700">
                {result.penalties.map((p, i) => (
                  <p key={i} className="text-xs">• {p.targetName}：{p.reason}{p.amount ? `（${p.amount}元）` : ''}</p>
                ))}
              </ResultSection>
            )}

            {/* 危大工程 */}
            {result.dangerousProjects && result.dangerousProjects.length > 0 && (
              <ResultSection title={`危大工程（${result.dangerousProjects.length}项）`} color="bg-orange-50 text-orange-700">
                {result.dangerousProjects.map((d, i) => (
                  <p key={i} className="text-xs">• {d.category}：{d.isOperating ? '施工中' : '未施工'}</p>
                ))}
              </ResultSection>
            )}
          </div>
        )}
      </div>
    </Sheet>
  )
}

function ResultSection({ title, color, children }: {
  title: string
  color: string
  children: React.ReactNode
}) {
  return (
    <div className="border border-slate-200 rounded-lg p-2.5">
      <Badge className={`${color} border-0 text-xs mb-1.5`}>{title}</Badge>
      <div className="space-y-0.5">{children}</div>
    </div>
  )
}
