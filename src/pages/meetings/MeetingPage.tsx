import { useEffect, useState, useMemo, type ReactNode } from 'react'
import { Search, Calendar, Clock, MapPin, User, FileText, CheckCircle2, Edit3, Trash2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Sheet } from '@/components/ui/sheet'
import { FormField } from '@/components/ui/form-field'
import { Empty } from '@/components/ui/empty'
import { FloatingButton } from '@/components/ui/floating-button'
import { getCurrentProjectId } from '@/store'
import { meetingService } from '@/services/meetingService'
import type { Meeting } from '@/types'

const MEETING_TYPES = [
  { code: 'regular', label: '安全例会' },
  { code: 'pre_shift', label: '班前会' },
  { code: 'special', label: '专题会' },
  { code: 'rectification', label: '整改会' },
  { code: 'education', label: '教育会' },
  { code: 'other', label: '其他' },
]

const TIME_FILTERS = [
  { code: 'all', label: '全部' },
  { code: 'week', label: '本周' },
  { code: 'month', label: '本月' },
]

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-'
  return dateStr.slice(0, 10)
}

function getMeetingTypeLabel(code?: string): string {
  if (!code) return '会议'
  return MEETING_TYPES.find(t => t.code === code)?.label ?? '会议'
}

function getMeetingTypeColor(code?: string): string {
  const colorMap: Record<string, string> = {
    regular: 'bg-blue-50 text-blue-700',
    pre_shift: 'bg-cyan-50 text-cyan-700',
    special: 'bg-purple-50 text-purple-700',
    rectification: 'bg-orange-50 text-orange-700',
    education: 'bg-emerald-50 text-emerald-700',
    other: 'bg-gray-50 text-gray-700',
  }
  return colorMap[code ?? ''] ?? 'bg-gray-50 text-gray-700'
}

function isThisWeek(dateStr: string): boolean {
  const date = new Date(dateStr)
  const today = new Date()
  const dayOfWeek = today.getDay() || 7
  const monday = new Date(today)
  monday.setDate(today.getDate() - dayOfWeek + 1)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return date >= monday && date <= sunday
}

function isThisMonth(dateStr: string): boolean {
  const date = new Date(dateStr)
  const today = new Date()
  return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth()
}

function parseAttendees(text: string): string[] {
  return text
    .split(/[,，、\n]/)
    .map(s => s.trim())
    .filter(Boolean)
}

function formatAttendees(ids?: string[]): string {
  if (!ids || ids.length === 0) return ''
  return ids.join('、')
}

export default function MeetingPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [searchText, setSearchText] = useState('')
  const [timeFilter, setTimeFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [addOpen, setAddOpen] = useState(false)
  const [editMeeting, setEditMeeting] = useState<Meeting | null>(null)
  const [detailMeeting, setDetailMeeting] = useState<Meeting | null>(null)

  const loadData = async () => {
    setLoading(true)
    const list = await meetingService.list()
    setMeetings(list.sort((a, b) => {
      const dateA = a.date || ''
      const dateB = b.date || ''
      if (dateA !== dateB) return dateB.localeCompare(dateA)
      return (b.createdAt ?? 0) - (a.createdAt ?? 0)
    }))
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const filteredMeetings = useMemo(() => {
    let list = meetings
    if (timeFilter === 'week') list = list.filter(m => m.date && isThisWeek(m.date))
    if (timeFilter === 'month') list = list.filter(m => m.date && isThisMonth(m.date))
    if (typeFilter !== 'all') list = list.filter(m => m.type === typeFilter)
    if (searchText.trim()) {
      const q = searchText.toLowerCase()
      list = list.filter(m =>
        m.title.toLowerCase().includes(q) ||
        (m.host ?? '').toLowerCase().includes(q) ||
        (m.location ?? '').toLowerCase().includes(q),
      )
    }
    return list
  }, [meetings, timeFilter, typeFilter, searchText])

  const monthCount = meetings.filter(m => m.date && isThisMonth(m.date)).length
  const pendingDecisionsCount = meetings.filter(m => m.decisions && m.decisions.trim().length > 0).length

  return (
    <div className="pb-20">
      <div className="px-3 pt-3">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-4 text-white mb-3" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs opacity-90">会议总次数</p>
              <p className="text-2xl font-bold">{meetings.length}<span className="text-sm font-normal opacity-80 ml-1">次</span></p>
            </div>
            <div className="flex gap-4">
              <div className="text-right">
                <p className="text-xs opacity-90">本月会议</p>
                <p className="text-lg font-semibold">{monthCount}</p>
              </div>
              <div className="text-right">
                <p className="text-xs opacity-90">待跟进决议</p>
                <p className="text-lg font-semibold">{pendingDecisionsCount}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="搜索主题/主持人/地点..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            className="pl-8 h-9"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 mb-3 -mx-0.5 px-0.5 scrollbar-hide">
          {TIME_FILTERS.map(tab => (
            <button
              key={tab.code}
              onClick={() => setTimeFilter(tab.code)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                timeFilter === tab.code
                  ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-2 mb-2 -mx-0.5 px-0.5 scrollbar-hide">
          <button
            onClick={() => setTypeFilter('all')}
            className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs transition-colors ${
              typeFilter === 'all' ? 'bg-blue-100 text-blue-700 font-medium' : 'bg-gray-50 text-gray-500'
            }`}
          >
            全部类型
          </button>
          {MEETING_TYPES.map(tab => (
            <button
              key={tab.code}
              onClick={() => setTypeFilter(tab.code)}
              className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs transition-colors ${
                typeFilter === tab.code ? 'bg-blue-100 text-blue-700 font-medium' : 'bg-gray-50 text-gray-500'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-3 space-y-2">
        {loading ? (
          <div className="py-12 text-center text-sm text-gray-400">加载中...</div>
        ) : filteredMeetings.length === 0 ? (
          <Empty title="暂无会议记录" description="点击右下角 + 按钮新增会议记录" />
        ) : (
          filteredMeetings.map(m => {
            const typeColor = getMeetingTypeColor(m.type)
            const typeLabel = getMeetingTypeLabel(m.type)
            return (
              <Card key={m.id} className="cursor-pointer active:bg-gray-50" onClick={() => setDetailMeeting(m)}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h4 className="text-sm font-medium text-gray-900 flex-1 line-clamp-1">{m.title}</h4>
                    <Badge className={`${typeColor} border-0 text-xs flex-shrink-0`}>{typeLabel}</Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                      <span className="flex items-center gap-0.5">
                        <Calendar className="w-3 h-3" />{formatDate(m.date)}
                      </span>
                      {m.time && (
                        <span className="flex items-center gap-0.5">
                          <Clock className="w-3 h-3" />{m.time}
                        </span>
                      )}
                      {m.host && (
                        <span className="flex items-center gap-0.5">
                          <User className="w-3 h-3" />{m.host}
                        </span>
                      )}
                    </div>
                    {m.location && (
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <MapPin className="w-3 h-3" />
                        <span className="line-clamp-1">{m.location}</span>
                      </div>
                    )}
                    {m.decisions && (
                      <div className="flex items-start gap-1 text-xs text-amber-600 bg-amber-50 rounded px-2 py-1 mt-1">
                        <CheckCircle2 className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-2">{m.decisions}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      <FloatingButton onClick={() => setAddOpen(true)} />

      <MeetingFormSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={() => { setAddOpen(false); loadData() }}
      />

      {editMeeting && (
        <MeetingFormSheet
          open={true}
          meeting={editMeeting}
          onClose={() => setEditMeeting(null)}
          onSuccess={() => { setEditMeeting(null); loadData() }}
        />
      )}

      {detailMeeting && (
        <MeetingDetailSheet
          meeting={detailMeeting}
          onClose={() => setDetailMeeting(null)}
          onEdit={() => { setEditMeeting(detailMeeting); setDetailMeeting(null) }}
          onDeleted={() => { setDetailMeeting(null); loadData() }}
        />
      )}
    </div>
  )
}

function MeetingFormSheet({ open, meeting, onClose, onSuccess }: {
  open: boolean
  meeting?: Meeting
  onClose: () => void
  onSuccess: () => void
}) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState('regular')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [location, setLocation] = useState('')
  const [host, setHost] = useState('')
  const [attendees, setAttendees] = useState('')
  const [content, setContent] = useState('')
  const [decisions, setDecisions] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      if (meeting) {
        setTitle(meeting.title)
        setType(meeting.type ?? 'regular')
        setDate(meeting.date ?? '')
        setTime(meeting.time ?? '')
        setLocation(meeting.location ?? '')
        setHost(meeting.host ?? '')
        setAttendees(formatAttendees(meeting.attendeeIds))
        setContent(meeting.content ?? '')
        setDecisions(meeting.decisions ?? '')
      } else {
        setTitle('')
        setType('regular')
        setDate(new Date().toISOString().slice(0, 10))
        setTime('')
        setLocation('')
        setHost('')
        setAttendees('')
        setContent('')
        setDecisions('')
      }
    }
  }, [open, meeting])

  const handleSubmit = async () => {
    if (!title.trim() || !date) return
    setSubmitting(true)
    try {
      const data = {
        title: title.trim(),
        type,
        date,
        time: time.trim() || undefined,
        location: location.trim() || undefined,
        host: host.trim() || undefined,
        attendeeIds: parseAttendees(attendees),
        content: content.trim() || undefined,
        decisions: decisions.trim() || undefined,
        projectId: getCurrentProjectId(),
      }
      if (meeting?.id) {
        await meetingService.update(meeting.id, data)
      } else {
        await meetingService.create(data)
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
      title={meeting ? '编辑会议' : '新增会议'}
      footer={
        <>
          <Button variant="outline" className="flex-1" onClick={onClose}>取消</Button>
          <Button className="flex-1" onClick={handleSubmit} disabled={!title.trim() || !date || submitting}>
            {submitting ? '提交中...' : '保存'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <FormField label="会议主题" required>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="如：第三季度安全生产例会" />
        </FormField>
        <div className="grid grid-cols-2 gap-2">
          <FormField label="会议类型" required>
            <Select value={type} onChange={e => setType(e.target.value)}>
              {MEETING_TYPES.map(t => (
                <option key={t.code} value={t.code}>{t.label}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="会议日期" required>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <FormField label="会议时间">
            <Input type="time" value={time} onChange={e => setTime(e.target.value)} />
          </FormField>
          <FormField label="会议地点">
            <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="如：项目部会议室" />
          </FormField>
        </div>
        <FormField label="主持人">
          <Input value={host} onChange={e => setHost(e.target.value)} placeholder="姓名" />
        </FormField>
        <FormField label="参会人员">
          <Textarea
            rows={2}
            value={attendees}
            onChange={e => setAttendees(e.target.value)}
            placeholder="多人请用逗号或顿号分隔，如：张三、李四、王五"
          />
        </FormField>
        <FormField label="会议内容">
          <Textarea rows={3} value={content} onChange={e => setContent(e.target.value)} placeholder="会议主要内容记录" />
        </FormField>
        <FormField label="会议决议/待办事项">
          <Textarea rows={3} value={decisions} onChange={e => setDecisions(e.target.value)} placeholder="会议形成的决议、待跟进事项" />
        </FormField>
      </div>
    </Sheet>
  )
}

function MeetingDetailSheet({ meeting, onClose, onEdit, onDeleted }: {
  meeting: Meeting
  onClose: () => void
  onEdit: () => void
  onDeleted: () => void
}) {
  const typeColor = getMeetingTypeColor(meeting.type)
  const typeLabel = getMeetingTypeLabel(meeting.type)

  const handleDelete = async () => {
    if (!meeting.id || !confirm('确定删除该会议记录？')) return
    await meetingService.remove(meeting.id)
    onDeleted()
  }

  const attendeeList = meeting.attendeeIds ?? []

  return (
    <Sheet
      open={true}
      onClose={onClose}
      title="会议详情"
      footer={
        <>
          <Button className="flex-1" onClick={onEdit}>
            <Edit3 className="w-4 h-4 mr-1" />编辑
          </Button>
          <Button variant="outline" className="flex-1" onClick={handleDelete}>
            <Trash2 className="w-4 h-4 mr-1" />删除
          </Button>
          <Button variant="outline" className="flex-1" onClick={onClose}>关闭</Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge className={`${typeColor} border-0`}>{typeLabel}</Badge>
        </div>
        <div>
          <h4 className="text-base font-semibold text-gray-900 mb-1">{meeting.title}</h4>
          <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
            <span className="flex items-center gap-0.5">
              <Calendar className="w-3 h-3" />{formatDate(meeting.date)}
            </span>
            {meeting.time && (
              <span className="flex items-center gap-0.5">
                <Clock className="w-3 h-3" />{meeting.time}
              </span>
            )}
          </div>
        </div>

        {meeting.host && <InfoRow icon={<User className="w-3.5 h-3.5" />} label="主持人" value={meeting.host} />}
        {meeting.location && <InfoRow icon={<MapPin className="w-3.5 h-3.5" />} label="会议地点" value={meeting.location} />}

        {attendeeList.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
              <User className="w-3 h-3" />参会人员（{attendeeList.length}人）
            </p>
            <div className="flex flex-wrap gap-1.5">
              {attendeeList.map((name, idx) => (
                <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                  {name}
                </span>
              ))}
            </div>
          </div>
        )}

        {meeting.content && (
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
              <FileText className="w-3 h-3" />会议内容
            </p>
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{meeting.content}</p>
          </div>
        )}

        {meeting.decisions && (
          <div className="bg-amber-50 rounded-lg p-3">
            <p className="text-xs text-amber-600 mb-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />会议决议/待办事项
            </p>
            <p className="text-sm text-amber-800 whitespace-pre-wrap">{meeting.decisions}</p>
          </div>
        )}
      </div>
    </Sheet>
  )
}

function InfoRow({ icon, label, value }: { icon?: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50">
      <span className="text-gray-500 text-xs flex items-center gap-1">{icon}{label}</span>
      <span className="text-gray-900 text-right">{value}</span>
    </div>
  )
}
