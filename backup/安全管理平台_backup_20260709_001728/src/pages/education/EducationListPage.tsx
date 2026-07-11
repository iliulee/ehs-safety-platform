import { useEffect, useState, useMemo } from 'react'
import { Search, ChevronRight, Calendar, User, Clock, Users, Trash2 } from 'lucide-react'
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
import { getDictLabel, getCurrentProjectId } from '@/store'
import { educationService } from '@/services/educationService'
import { workerService } from '@/services/workerService'
import type { EducationRecord, Worker } from '@/types'

const EDUCATION_TYPES = [
  { code: 'company', label: '公司级教育' },
  { code: 'project', label: '项目级教育' },
  { code: 'team', label: '班组级教育' },
  { code: 'daily', label: '班前安全教育' },
  { code: 'special', label: '专项安全教育' },
  { code: 'seasonal', label: '季节性安全教育' },
]

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-'
  return dateStr.slice(0, 10)
}

function getEducationTypeLabel(code?: string): string {
  if (!code) return '安全教育'
  return EDUCATION_TYPES.find(t => t.code === code)?.label ?? '安全教育'
}

function getEducationTypeColor(code?: string): string {
  switch (code) {
    case 'company': return 'bg-purple-50 text-purple-700'
    case 'project': return 'bg-blue-50 text-blue-700'
    case 'team': return 'bg-emerald-50 text-emerald-700'
    case 'daily': return 'bg-amber-50 text-amber-700'
    case 'special': return 'bg-red-50 text-red-700'
    case 'seasonal': return 'bg-cyan-50 text-cyan-700'
    default: return 'bg-gray-50 text-gray-700'
  }
}

export default function EducationListPage() {
  const [records, setRecords] = useState<EducationRecord[]>([])
  const [workers, setWorkers] = useState<Worker[]>([])
  const [loading, setLoading] = useState(true)
  const [searchText, setSearchText] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [addOpen, setAddOpen] = useState(false)
  const [detailRecord, setDetailRecord] = useState<EducationRecord | null>(null)

  const loadData = async () => {
    setLoading(true)
    const [list, workerList] = await Promise.all([
      educationService.list(),
      workerService.list(),
    ])
    setRecords(list.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)))
    setWorkers(workerList)
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const filteredRecords = useMemo(() => {
    let list = records
    if (typeFilter !== 'all') list = list.filter(r => r.type === typeFilter)
    if (searchText.trim()) {
      const q = searchText.toLowerCase()
      list = list.filter(r =>
        r.title.toLowerCase().includes(q) ||
        (r.educator ?? '').toLowerCase().includes(q) ||
        (r.content ?? '').toLowerCase().includes(q),
      )
    }
    return list
  }, [records, typeFilter, searchText])

  const getWorkerNames = (ids: string[]): string => {
    if (!ids || ids.length === 0) return '未选择'
    const names = ids.map(id => workers.find(w => w.id === id)?.name).filter(Boolean)
    if (names.length <= 3) return names.join('、')
    return `${names.slice(0, 3).join('、')}等${names.length}人`
  }

  const thisMonthCount = records.filter(r => {
    if (!r.date) return false
    const now = new Date()
    const d = new Date(r.date)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  }).length

  const totalAttendees = records.reduce((sum, r) => sum + (r.attendeeIds?.length ?? 0), 0)

  return (
    <div className="pb-20">
      <div className="px-3 pt-3">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-4 text-white mb-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs opacity-90">本月教育</p>
              <p className="text-2xl font-bold">{thisMonthCount}<span className="text-sm font-normal opacity-80 ml-1">次</span></p>
            </div>
            <div className="text-right">
              <p className="text-xs opacity-90">累计教育人次</p>
              <p className="text-lg font-semibold">{totalAttendees}<span className="text-xs opacity-80 ml-0.5">人次</span></p>
            </div>
          </div>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="搜索教育主题/讲师..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            className="pl-8 h-9"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 mb-3 -mx-0.5 px-0.5 scrollbar-hide">
          {[{ code: 'all', label: '全部' }, ...EDUCATION_TYPES].map(tab => (
            <button
              key={tab.code}
              onClick={() => setTypeFilter(tab.code)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                typeFilter === tab.code ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'
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
        ) : filteredRecords.length === 0 ? (
          <Empty title="暂无教育记录" description="点击右下角 + 按钮新增教育记录" />
        ) : (
          filteredRecords.map(r => {
            const typeColor = getEducationTypeColor(r.type)
            const typeLabel = getEducationTypeLabel(r.type)
            return (
              <Card key={r.id} className="cursor-pointer active:bg-gray-50" onClick={() => setDetailRecord(r)}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h4 className="text-sm font-medium text-gray-900 flex-1 line-clamp-1">{r.title}</h4>
                    <Badge className={`${typeColor} border-0 text-xs flex-shrink-0`}>{typeLabel}</Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-0.5"><Calendar className="w-3 h-3" />{formatDate(r.date)}</span>
                      {r.educator && <span className="flex items-center gap-0.5"><User className="w-3 h-3" />{r.educator}</span>}
                      {r.duration && <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{r.duration}分钟</span>}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Users className="w-3 h-3" />
                      <span>{getWorkerNames(r.attendeeIds)}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-end mt-1">
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      <FloatingButton onClick={() => setAddOpen(true)} />

      <AddEducationSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={() => { setAddOpen(false); loadData() }}
        workers={workers}
      />

      {detailRecord && (
        <EducationDetailSheet
          record={detailRecord}
          workers={workers}
          onClose={() => setDetailRecord(null)}
          onDeleted={() => { setDetailRecord(null); loadData() }}
        />
      )}
    </div>
  )
}

function AddEducationSheet({ open, onClose, onSuccess, workers }: {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  workers: Worker[]
}) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState('project')
  const [date, setDate] = useState('')
  const [educator, setEducator] = useState('')
  const [duration, setDuration] = useState('')
  const [location, setLocation] = useState('')
  const [content, setContent] = useState('')
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setTitle(''); setType('project'); setDate(new Date().toISOString().slice(0, 10))
      setEducator(''); setDuration('60'); setLocation(''); setContent('')
      setSelectedWorkers([])
    }
  }, [open])

  const activeWorkers = workers.filter(w => w.status === 'active')

  const toggleWorker = (id: string) => {
    setSelectedWorkers(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const selectAll = () => {
    if (selectedWorkers.length === activeWorkers.length) {
      setSelectedWorkers([])
    } else {
      setSelectedWorkers(activeWorkers.map(w => w.id!).filter(Boolean))
    }
  }

  const handleSubmit = async () => {
    if (!title.trim() || !date) return
    setSubmitting(true)
    try {
      await educationService.create({
        title: title.trim(),
        type,
        date,
        educator: educator.trim() || undefined,
        duration: duration ? parseInt(duration) : undefined,
        location: location.trim() || undefined,
        content: content.trim() || undefined,
        attendeeIds: selectedWorkers,
        projectId: getCurrentProjectId(),
      })
      onSuccess()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="新增安全教育"
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
        <FormField label="教育主题" required>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="如：高处作业安全培训" />
        </FormField>
        <div className="grid grid-cols-2 gap-2">
          <FormField label="教育类型" required>
            <Select value={type} onChange={e => setType(e.target.value)}>
              {EDUCATION_TYPES.map(t => (
                <option key={t.code} value={t.code}>{t.label}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="教育日期" required>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <FormField label="讲师/教育人">
            <Input value={educator} onChange={e => setEducator(e.target.value)} placeholder="姓名" />
          </FormField>
          <FormField label="时长(分钟)">
            <Input type="number" value={duration} onChange={e => setDuration(e.target.value)} placeholder="60" />
          </FormField>
        </div>
        <FormField label="教育地点">
          <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="如：项目部会议室" />
        </FormField>
        <FormField label="教育内容">
          <Textarea rows={3} value={content} onChange={e => setContent(e.target.value)} placeholder="简要描述教育内容" />
        </FormField>
        <FormField label={`参训人员 (${selectedWorkers.length}/${activeWorkers.length})`}>
          <div className="border rounded-lg p-2 max-h-40 overflow-y-auto">
            <button
              onClick={selectAll}
              className="w-full text-left text-xs text-blue-600 py-1 mb-1 border-b border-gray-100"
            >
              {selectedWorkers.length === activeWorkers.length ? '取消全选' : '全选在场人员'}
            </button>
            {activeWorkers.length === 0 ? (
              <p className="text-xs text-gray-400 py-2 text-center">暂无在场人员</p>
            ) : (
              activeWorkers.map(w => (
                <label key={w.id} className="flex items-center gap-2 py-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedWorkers.includes(w.id!)}
                    onChange={() => toggleWorker(w.id!)}
                    className="w-4 h-4 rounded border-gray-300 text-primary"
                  />
                  <span className="text-sm text-gray-700">{w.name}</span>
                  {w.workType && (
                    <span className="text-xs text-gray-400">{getDictLabel('work_type', w.workType)}</span>
                  )}
                </label>
              ))
            )}
          </div>
        </FormField>
      </div>
    </Sheet>
  )
}

function EducationDetailSheet({ record, workers, onClose, onDeleted }: {
  record: EducationRecord
  workers: Worker[]
  onClose: () => void
  onDeleted: () => void
}) {
  const typeColor = getEducationTypeColor(record.type)
  const typeLabel = getEducationTypeLabel(record.type)

  const attendeeWorkers = record.attendeeIds
    .map(id => workers.find(w => w.id === id))
    .filter(Boolean) as Worker[]

  const handleDelete = async () => {
    if (!record.id || !confirm('确定删除该教育记录？')) return
    await educationService.remove(record.id)
    onDeleted()
  }

  return (
    <Sheet
      open={true}
      onClose={onClose}
      title="教育详情"
      footer={
        <>
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
          <h4 className="text-base font-semibold text-gray-900 mb-1">{record.title}</h4>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-0.5"><Calendar className="w-3 h-3" />{formatDate(record.date)}</span>
            {record.duration && <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{record.duration}分钟</span>}
          </div>
        </div>

        {record.educator && <InfoRow label="教育人" value={record.educator} />}
        {record.location && <InfoRow label="教育地点" value={record.location} />}

        {record.content && (
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">教育内容</p>
            <p className="text-sm text-gray-800">{record.content}</p>
          </div>
        )}

        <div>
          <p className="text-xs text-gray-500 mb-2">参训人员（{attendeeWorkers.length}人）</p>
          {attendeeWorkers.length === 0 ? (
            <p className="text-xs text-gray-400">未记录参训人员</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {attendeeWorkers.map(w => (
                <span key={w.id} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                  <User className="w-3 h-3" />{w.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Sheet>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50">
      <span className="text-gray-500 text-xs">{label}</span>
      <span className="text-gray-900 text-right">{value}</span>
    </div>
  )
}
