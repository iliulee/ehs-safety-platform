import { useEffect, useState, useMemo } from 'react'
import { Search, ChevronRight, Thermometer, User, AlertTriangle, ClipboardList, ShieldCheck, Edit3, Trash2, Sparkles, Loader2, FileDown } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Sheet } from '@/components/ui/sheet'
import { FormField } from '@/components/ui/form-field'
import { Empty } from '@/components/ui/empty'
import { FloatingButton } from '@/components/ui/floating-button'
import { getCurrentProjectId } from '@/store'
import { dailyLogService } from '@/services/dailyLogService'
import { educationService } from '@/services/educationService'
import { hazardService } from '@/services/hazardService'
import { aiParser, type ParsedDailyData } from '@/services/ai-parser.service'
import { matchWorkers } from '@/services/worker-matcher.service'
import { generateAndDownloadDailyLog } from '@/services/generate-daily-log.service'
import { AIParseError } from '@/types/errors'
import { toast } from 'sonner'
import type { DailyLog } from '@/types'

const WEATHER_OPTIONS = [
  { code: 'sunny', label: '晴', icon: '☀️' },
  { code: 'cloudy', label: '多云', icon: '⛅' },
  { code: 'overcast', label: '阴', icon: '☁️' },
  { code: 'light_rain', label: '小雨', icon: '🌦️' },
  { code: 'rain', label: '中雨', icon: '🌧️' },
  { code: 'heavy_rain', label: '大雨', icon: '⛈️' },
  { code: 'snow', label: '雪', icon: '🌨️' },
  { code: 'fog', label: '雾', icon: '🌫️' },
  { code: 'wind', label: '大风', icon: '💨' },
]

const WEATHER_LABEL_MAP: Record<string, { label: string; icon: string }> = {}
WEATHER_OPTIONS.forEach(w => { WEATHER_LABEL_MAP[w.code] = w })

function getWeekday(dateStr: string): string {
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const d = new Date(dateStr)
  return days[d.getDay()]
}

function formatDateDisplay(dateStr: string): string {
  const d = new Date(dateStr)
  const month = d.getMonth() + 1
  const day = d.getDate()
  return `${month}月${day}日`
}

export default function LogListPage() {
  const [logs, setLogs] = useState<DailyLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchText, setSearchText] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [detailLog, setDetailLog] = useState<DailyLog | null>(null)
  const [editLog, setEditLog] = useState<DailyLog | null>(null)
  const [aiParseOpen, setAiParseOpen] = useState(false)

  const loadLogs = async () => {
    setLoading(true)
    const list = await dailyLogService.list()
    setLogs(list.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')))
    setLoading(false)
  }

  useEffect(() => { loadLogs() }, [])

  const filteredLogs = useMemo(() => {
    let list = logs
    if (searchText.trim()) {
      const q = searchText.toLowerCase()
      list = list.filter(l =>
        (l.workContent ?? '').toLowerCase().includes(q) ||
        (l.content ?? '').toLowerCase().includes(q) ||
        (l.safetyMeasures ?? '').toLowerCase().includes(q) ||
        (l.issuesFound ?? '').toLowerCase().includes(q) ||
        (l.recorder ?? '').toLowerCase().includes(q),
      )
    }
    return list
  }, [logs, searchText])

  const today = new Date().toISOString().slice(0, 10)
  const hasTodayLog = logs.some(l => l.date === today)
  const thisMonth = new Date().toISOString().slice(0, 7)
  const monthLogs = logs.filter(l => l.date?.startsWith(thisMonth))
  const issueLogs = logs.filter(l => l.issuesFound && l.issuesFound.trim().length > 0)

  const handleEdit = (log: DailyLog) => {
    setDetailLog(null)
    setEditLog(log)
  }

  return (
    <div className="pb-20">
      <div className="px-3 pt-3">
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl p-4 text-white mb-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs opacity-90">本月日志</p>
              <p className="text-2xl font-bold">{monthLogs.length}<span className="text-sm font-normal opacity-80 ml-1">篇</span></p>
            </div>
            <div className="flex gap-4">
              <div className="text-right">
                <p className="text-xs opacity-90">记录问题</p>
                <p className="text-lg font-semibold">{issueLogs.length}</p>
              </div>
              <div className="text-right">
                <p className="text-xs opacity-90">今日</p>
                <p className="text-lg font-semibold">
                  {hasTodayLog ? <span className="text-emerald-200">已填</span> : <span className="text-yellow-100">未填</span>}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="搜索日志内容..."
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 border-purple-200 text-purple-700 hover:bg-purple-50"
            onClick={() => setAiParseOpen(true)}
          >
            <Sparkles className="w-4 h-4" />
            AI 拆解
          </Button>
        </div>
      </div>

      <div className="px-3 space-y-2">
        {loading ? (
          <div className="py-12 text-center text-sm text-gray-400">加载中...</div>
        ) : filteredLogs.length === 0 ? (
          <Empty title="暂无安全日志" description="点击右下角 + 按钮填写今日日志" />
        ) : (
          filteredLogs.map(l => {
            const weather = WEATHER_LABEL_MAP[l.weather ?? '']
            const hasIssue = l.issuesFound && l.issuesFound.trim().length > 0
            return (
              <Card key={l.id} className="cursor-pointer active:bg-gray-50" onClick={() => setDetailLog(l)}>
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-12 text-center">
                      <div className={`text-lg font-bold ${l.date === today ? 'text-orange-600' : 'text-gray-700'}`}>
                        {new Date(l.date).getDate()}
                      </div>
                      <div className="text-xs text-gray-400">{getWeekday(l.date)}</div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {new Date(l.date).getMonth() + 1}月
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 border-l border-gray-100 pl-3">
                      <div className="flex items-center gap-2 mb-1">
                        {weather && (
                          <span className="text-sm">{weather.icon}</span>
                        )}
                        {l.temperature && (
                          <span className="text-xs text-gray-500 flex items-center gap-0.5">
                            <Thermometer className="w-3 h-3" />{l.temperature}
                          </span>
                        )}
                        {hasIssue && (
                          <Badge className="bg-red-50 text-red-600 border-0 text-xs flex items-center gap-0.5">
                            <AlertTriangle className="w-3 h-3" />有问题
                          </Badge>
                        )}
                      </div>
                      {l.workContent && (
                        <p className="text-sm text-gray-800 line-clamp-2 mb-1">{l.workContent}</p>
                      )}
                      {l.safetyMeasures && !l.workContent && (
                        <p className="text-sm text-gray-800 line-clamp-2 mb-1">{l.safetyMeasures}</p>
                      )}
                      <div className="flex items-center justify-between">
                        {l.recorder && (
                          <span className="text-xs text-gray-400 flex items-center gap-0.5">
                            <User className="w-3 h-3" />{l.recorder}
                          </span>
                        )}
                        <ChevronRight className="w-4 h-4 text-gray-300" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      <FloatingButton onClick={() => setAddOpen(true)} />

      <LogFormSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={() => { setAddOpen(false); loadLogs() }}
      />

      {detailLog && (
        <LogDetailSheet
          log={detailLog}
          onClose={() => setDetailLog(null)}
          onEdit={() => handleEdit(detailLog)}
          onDeleted={() => { setDetailLog(null); loadLogs() }}
        />
      )}

      {editLog && (
        <LogFormSheet
          open={true}
          onClose={() => setEditLog(null)}
          onSuccess={() => { setEditLog(null); loadLogs() }}
          log={editLog}
        />
      )}

      <AiParseSheet
        open={aiParseOpen}
        onClose={() => setAiParseOpen(false)}
        onSuccess={() => { setAiParseOpen(false); loadLogs() }}
      />
    </div>
  )
}

/**
 * AI 文字拆解面板
 * 用户输入工地口述文字 → AI 拆解为结构化数据 → 用户确认后写入各业务表
 */
function AiParseSheet({ open, onClose, onSuccess }: {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}) {
  const [inputText, setInputText] = useState('')
  const [parsing, setParsing] = useState(false)
  const [result, setResult] = useState<ParsedDailyData | null>(null)
  const [writing, setWriting] = useState(false)
  const [generatingDoc, setGeneratingDoc] = useState(false)
  const [unmatchedNames, setUnmatchedNames] = useState<string[]>([])

  const handleParse = async () => {
    if (!inputText.trim()) {
      toast.error('请输入待拆解的文字')
      return
    }
    setParsing(true)
    setUnmatchedNames([])
    try {
      const parsed = await aiParser.parseDailyNarrative(inputText, getCurrentProjectId())
      setResult(parsed)
      toast.success('AI 拆解完成，请核对后写入')
    } catch (err) {
      if (err instanceof AIParseError) {
        toast.error(err.message)
      } else {
        toast.error('AI 拆解失败：' + (err instanceof Error ? err.message : '未知错误'))
      }
    } finally {
      setParsing(false)
    }
  }

  const handleConfirmWrite = async () => {
    if (!result) return
    setWriting(true)
    try {
      const projectId = getCurrentProjectId()
      let writeCount = 0
      const allUnmatched: string[] = []

      // 1. 写入安全日志
      if (result.dailyLog) {
        await dailyLogService.create({
          date: result.dailyLog.date,
          weather: result.dailyLog.weather,
          temperature: result.dailyLog.temperature?.toString(),
          workContent: result.dailyLog.workContent,
          safetyMeasures: result.dailyLog.safetyMeasures,
          issuesFound: result.dailyLog.issues,
          projectId,
        })
        writeCount++
      }

      // 2. 写入安全教育记录
      if (result.educationRecords?.length) {
        for (const edu of result.educationRecords) {
          const { matched, unmatched } = await matchWorkers(edu.attendeeNames, projectId)
          if (unmatched.length) allUnmatched.push(...unmatched)
          await educationService.create({
            title: edu.topic,
            date: edu.date,
            attendeeIds: Array.from(matched.values()),
            content: `参会人员：${edu.attendeeNames.join('、')}`,
            projectId,
          })
          writeCount++
        }
      }

      // 3. 写入隐患记录（AI 的 critical 映射为 serious）
      if (result.hazards?.length) {
        for (const h of result.hazards) {
          await hazardService.create({
            title: h.title,
            description: `日期：${h.date}${h.location ? `；位置：${h.location}` : ''}`,
            level: h.level === 'critical' ? 'serious' : h.level,
            status: h.status,
            location: h.location,
            source: 'ai',
            projectId,
          })
          writeCount++
        }
      }

      setUnmatchedNames(allUnmatched)
      if (allUnmatched.length > 0) {
        toast.warning(`已写入 ${writeCount} 条记录，${allUnmatched.length} 名工人未匹配：${allUnmatched.join('、')}`)
      } else {
        toast.success(`已写入 ${writeCount} 条记录`)
      }
      onSuccess()
    } catch (err) {
      toast.error('写入失败：' + (err instanceof Error ? err.message : '未知错误'))
    } finally {
      setWriting(false)
    }
  }

  const handleGenerateDoc = async () => {
    if (!result?.dailyLog) {
      toast.info('请先完成 AI 拆解')
      return
    }
    setGeneratingDoc(true)
    try {
      const out = await generateAndDownloadDailyLog({ data: result })
      if (out.residualVariables.length > 0) {
        toast.warning(`已生成 Word，但有 ${out.residualVariables.length} 个变量未替换：${out.residualVariables.join('、')}`)
      } else {
        toast.success(`已生成：${out.fileName}`)
      }
    } catch (err) {
      toast.error('生成 Word 失败：' + (err instanceof Error ? err.message : '未知错误'))
    } finally {
      setGeneratingDoc(false)
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="AI 文字拆解 → 安全日志"
      footer={
        <>
          <Button variant="outline" className="flex-1" onClick={onClose}>取消</Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleGenerateDoc}
            disabled={!result || generatingDoc}
          >
            {generatingDoc
              ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />生成中...</>
              : <><FileDown className="w-4 h-4 mr-1" />生成日志 Word</>}
          </Button>
          <Button
            className="flex-1"
            onClick={handleConfirmWrite}
            disabled={!result || writing}
          >
            {writing ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />写入中...</> : '确认写入'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {/* 输入区 */}
        <FormField label="工地口述文字">
          <Textarea
            rows={4}
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder="例：今天没有危大作业。上午9点开展了进场安全教育，人员是张三、李四、王二、马波。下午进行了塔吊月度验收。3点发现一处临边防护缺失，已通知整改。今天天气晴，30度。"
          />
        </FormField>

        <Button
          className="w-full"
          onClick={handleParse}
          disabled={parsing || !inputText.trim()}
        >
          {parsing ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />AI 拆解中（最长 30 秒）...</>
          ) : (
            <><Sparkles className="w-4 h-4 mr-2" />开始 AI 拆解</>
          )}
        </Button>

        {/* 拆解结果 */}
        {result && (
          <div className="space-y-3 pt-2 border-t border-gray-100">
            {result.dailyLog && (
              <div className="bg-blue-50 rounded-lg p-3 space-y-1.5">
                <p className="text-xs text-blue-700 font-medium flex items-center gap-1">
                  <ClipboardList className="w-3 h-3" />安全日志
                </p>
                <div className="text-sm text-gray-800 space-y-0.5">
                  <p>📅 日期：{result.dailyLog.date}</p>
                  {result.dailyLog.weather && <p>🌤 天气：{result.dailyLog.weather}</p>}
                  {result.dailyLog.temperature !== undefined && <p>🌡 温度：{result.dailyLog.temperature}℃</p>}
                  {result.dailyLog.workContent && <p>📝 施工内容：{result.dailyLog.workContent}</p>}
                  {result.dailyLog.safetyMeasures && <p>🛡 安全措施：{result.dailyLog.safetyMeasures}</p>}
                  {result.dailyLog.issues && <p>⚠️ 问题：{result.dailyLog.issues}</p>}
                </div>
              </div>
            )}

            {result.educationRecords?.length ? (
              <div className="bg-emerald-50 rounded-lg p-3 space-y-1.5">
                <p className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />安全教育（{result.educationRecords.length}）
                </p>
                {result.educationRecords.map((edu, i) => (
                  <div key={i} className="text-sm text-gray-800">
                    {edu.date} - {edu.topic}：{edu.attendeeNames.join('、')}
                  </div>
                ))}
              </div>
            ) : null}

            {result.hazards?.length ? (
              <div className="bg-red-50 rounded-lg p-3 space-y-1.5">
                <p className="text-xs text-red-700 font-medium flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />隐患记录（{result.hazards.length}）
                </p>
                {result.hazards.map((h, i) => (
                  <div key={i} className="text-sm text-gray-800">
                    {h.date} - {h.title}（{h.level === 'critical' ? '重大' : h.level === 'major' ? '较大' : '一般'}，{h.status === 'pending' ? '待整改' : h.status === 'rectifying' ? '整改中' : '已关闭'}）
                  </div>
                ))}
              </div>
            ) : null}

            {unmatchedNames.length > 0 && (
              <div className="bg-amber-50 rounded-lg p-3 text-xs text-amber-700">
                ⚠️ 以下工人未在工人表中找到，教育记录的参会人将缺失：{unmatchedNames.join('、')}。请先到「人员管理」录入这些工人。
              </div>
            )}
          </div>
        )}
      </div>
    </Sheet>
  )
}

function LogFormSheet({ open, onClose, onSuccess, log }: {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  log?: DailyLog | null
}) {
  const isEdit = !!log
  const [date, setDate] = useState('')
  const [weather, setWeather] = useState('sunny')
  const [temperature, setTemperature] = useState('')
  const [recorder, setRecorder] = useState('')
  const [workContent, setWorkContent] = useState('')
  const [safetyMeasures, setSafetyMeasures] = useState('')
  const [issuesFound, setIssuesFound] = useState('')
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      if (log) {
        setDate(log.date)
        setWeather(log.weather ?? 'sunny')
        setTemperature(log.temperature ?? '')
        setRecorder(log.recorder ?? '')
        setWorkContent(log.workContent ?? '')
        setSafetyMeasures(log.safetyMeasures ?? '')
        setIssuesFound(log.issuesFound ?? '')
        setContent(log.content ?? '')
      } else {
        setDate(new Date().toISOString().slice(0, 10))
        setWeather('sunny')
        setTemperature('')
        setRecorder('')
        setWorkContent('')
        setSafetyMeasures('')
        setIssuesFound('')
        setContent('')
      }
    }
  }, [open, log])

  const handleSubmit = async () => {
    if (!date) return
    setSubmitting(true)
    try {
      const data = {
        date,
        weather: weather || undefined,
        temperature: temperature.trim() || undefined,
        recorder: recorder.trim() || undefined,
        workContent: workContent.trim() || undefined,
        safetyMeasures: safetyMeasures.trim() || undefined,
        issuesFound: issuesFound.trim() || undefined,
        content: content.trim() || undefined,
        projectId: getCurrentProjectId(),
      }
      if (isEdit && log?.id) {
        await dailyLogService.update(log.id, data)
      } else {
        await dailyLogService.create(data)
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
      title={isEdit ? '编辑安全日志' : '填写安全日志'}
      footer={
        <>
          <Button variant="outline" className="flex-1" onClick={onClose}>取消</Button>
          <Button className="flex-1" onClick={handleSubmit} disabled={!date || submitting}>
            {submitting ? '提交中...' : '保存'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <FormField label="日期" required>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </FormField>
          <FormField label="气温">
            <Input value={temperature} onChange={e => setTemperature(e.target.value)} placeholder="如：18~26℃" />
          </FormField>
        </div>

        <FormField label="天气">
          <div className="flex flex-wrap gap-1.5">
            {WEATHER_OPTIONS.map(w => (
              <button
                key={w.code}
                type="button"
                onClick={() => setWeather(w.code)}
                className={`px-2.5 py-1.5 rounded-lg text-xs border transition-colors ${
                  weather === w.code
                    ? 'bg-orange-50 border-orange-300 text-orange-700'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {w.icon} {w.label}
              </button>
            ))}
          </div>
        </FormField>

        <FormField label="记录人">
          <Input value={recorder} onChange={e => setRecorder(e.target.value)} placeholder="填写人姓名" />
        </FormField>

        <FormField label="施工内容">
          <Textarea
            rows={2}
            value={workContent}
            onChange={e => setWorkContent(e.target.value)}
            placeholder="今日主要施工部位、作业内容、施工人数、机械设备等"
          />
        </FormField>

        <FormField label="安全措施落实情况">
          <Textarea
            rows={2}
            value={safetyMeasures}
            onChange={e => setSafetyMeasures(e.target.value)}
            placeholder="安全防护措施、安全交底、安全检查等情况"
          />
        </FormField>

        <FormField label="发现问题及隐患">
          <Textarea
            rows={2}
            value={issuesFound}
            onChange={e => setIssuesFound(e.target.value)}
            placeholder="检查发现的安全问题、隐患及处理情况（无则留空）"
          />
        </FormField>

        <FormField label="备注/其他事项">
          <Textarea
            rows={2}
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="其他需要记录的事项"
          />
        </FormField>
      </div>
    </Sheet>
  )
}

function LogDetailSheet({ log, onClose, onEdit, onDeleted }: {
  log: DailyLog
  onClose: () => void
  onEdit: () => void
  onDeleted: () => void
}) {
  const weather = WEATHER_LABEL_MAP[log.weather ?? '']
  const hasIssue = log.issuesFound && log.issuesFound.trim().length > 0

  const handleDelete = async () => {
    if (!log.id || !confirm('确定删除该日志记录？')) return
    await dailyLogService.remove(log.id)
    onDeleted()
  }

  return (
    <Sheet
      open={true}
      onClose={onClose}
      title="安全日志详情"
      footer={
        <>
          <Button variant="outline" className="flex-1" onClick={handleDelete}>
            <Trash2 className="w-4 h-4 mr-1" />删除
          </Button>
          <Button variant="outline" className="flex-1" onClick={onEdit}>
            <Edit3 className="w-4 h-4 mr-1" />编辑
          </Button>
          <Button variant="outline" className="flex-1" onClick={onClose}>关闭</Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
          <div>
            <h4 className="text-lg font-semibold text-gray-900">{formatDateDisplay(log.date)}</h4>
            <p className="text-xs text-gray-500">{getWeekday(log.date)}</p>
          </div>
          <div className="flex items-center gap-2">
            {weather && <span className="text-2xl">{weather.icon}</span>}
            {log.temperature && (
              <span className="text-sm text-gray-600 flex items-center gap-1">
                <Thermometer className="w-4 h-4" />{log.temperature}
              </span>
            )}
          </div>
        </div>

        {log.recorder && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <User className="w-3 h-3" />记录人：{log.recorder}
          </div>
        )}

        {log.workContent && (
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-xs text-blue-700 mb-1 font-medium flex items-center gap-1">
              <ClipboardList className="w-3 h-3" />施工内容
            </p>
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{log.workContent}</p>
          </div>
        )}

        {log.safetyMeasures && (
          <div className="bg-emerald-50 rounded-lg p-3">
            <p className="text-xs text-emerald-700 mb-1 font-medium flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />安全措施
            </p>
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{log.safetyMeasures}</p>
          </div>
        )}

        {hasIssue && (
          <div className="bg-red-50 rounded-lg p-3">
            <p className="text-xs text-red-700 mb-1 font-medium flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />发现问题
            </p>
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{log.issuesFound}</p>
          </div>
        )}

        {log.content && (
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">备注</p>
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{log.content}</p>
          </div>
        )}
      </div>
    </Sheet>
  )
}
