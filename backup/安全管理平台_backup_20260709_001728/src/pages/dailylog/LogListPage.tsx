import { useEffect, useState, useMemo } from 'react'
import { Search, ChevronRight, Thermometer, User, AlertTriangle, ClipboardList, ShieldCheck, Edit3, Trash2 } from 'lucide-react'
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

        <div className="relative mb-3">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="搜索日志内容..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            className="pl-8 h-9"
          />
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
    </div>
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
