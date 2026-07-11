import { useEffect, useState, useMemo } from 'react'
import { Search, Calendar, User, Clock, CheckCircle2, Users, Trash2 } from 'lucide-react'
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
import { trainingService } from '@/services/trainingService'
import { workerService } from '@/services/workerService'
import type { TrainingRecord, Worker } from '@/types'

const TRAINING_TYPES = [
  { code: 'safety', label: '安全技能培训' },
  { code: 'operation', label: '操作规程培训' },
  { code: 'emergency', label: '应急救援培训' },
  { code: 'special', label: '特种作业培训' },
  { code: 'fire', label: '消防安全培训' },
  { code: 'firstaid', label: '急救知识培训' },
  { code: 'legal', label: '法律法规培训' },
  { code: 'other', label: '其他培训' },
]

const ASSESSMENT_MAP: Record<string, { label: string; color: string }> = {
  pass: { label: '考核合格', color: 'bg-emerald-50 text-emerald-700' },
  fail: { label: '考核不合格', color: 'bg-red-50 text-red-700' },
  pending: { label: '待考核', color: 'bg-amber-50 text-amber-700' },
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-'
  return dateStr.slice(0, 10)
}

function getTrainingTypeLabel(code?: string): string {
  if (!code) return '培训'
  return TRAINING_TYPES.find(t => t.code === code)?.label ?? '培训'
}

function getTrainingTypeColor(code?: string): string {
  const colorMap: Record<string, string> = {
    safety: 'bg-blue-50 text-blue-700',
    operation: 'bg-cyan-50 text-cyan-700',
    emergency: 'bg-red-50 text-red-700',
    special: 'bg-orange-50 text-orange-700',
    fire: 'bg-rose-50 text-rose-700',
    firstaid: 'bg-pink-50 text-pink-700',
    legal: 'bg-indigo-50 text-indigo-700',
    other: 'bg-gray-50 text-gray-700',
  }
  return colorMap[code ?? ''] ?? 'bg-gray-50 text-gray-700'
}

export default function TrainingListPage() {
  const [records, setRecords] = useState<TrainingRecord[]>([])
  const [workers, setWorkers] = useState<Worker[]>([])
  const [loading, setLoading] = useState(true)
  const [searchText, setSearchText] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [assessmentFilter, setAssessmentFilter] = useState<string>('all')
  const [addOpen, setAddOpen] = useState(false)
  const [detailRecord, setDetailRecord] = useState<TrainingRecord | null>(null)

  const loadData = async () => {
    setLoading(true)
    const [list, workerList] = await Promise.all([
      trainingService.list(),
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
    if (assessmentFilter !== 'all') list = list.filter(r => (r.assessmentResult ?? 'pending') === assessmentFilter)
    if (searchText.trim()) {
      const q = searchText.toLowerCase()
      list = list.filter(r =>
        r.title.toLowerCase().includes(q) ||
        (r.trainer ?? '').toLowerCase().includes(q) ||
        (r.content ?? '').toLowerCase().includes(q),
      )
    }
    return list
  }, [records, typeFilter, assessmentFilter, searchText])

  const getWorkerNames = (ids: string[]): string => {
    if (!ids || ids.length === 0) return '未选择'
    const names = ids.map(id => workers.find(w => w.id === id)?.name).filter(Boolean)
    if (names.length <= 3) return names.join('、')
    return `${names.slice(0, 3).join('、')}等${names.length}人`
  }

  const passCount = records.filter(r => r.assessmentResult === 'pass').length
  const pendingCount = records.filter(r => !r.assessmentResult || r.assessmentResult === 'pending').length

  return (
    <div className="pb-20">
      <div className="px-3 pt-3">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl p-4 text-white mb-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs opacity-90">培训总次数</p>
              <p className="text-2xl font-bold">{records.length}<span className="text-sm font-normal opacity-80 ml-1">次</span></p>
            </div>
            <div className="flex gap-4">
              <div className="text-right">
                <p className="text-xs opacity-90">合格</p>
                <p className="text-lg font-semibold">{passCount}</p>
              </div>
              <div className="text-right">
                <p className="text-xs opacity-90">待考核</p>
                <p className="text-lg font-semibold">{pendingCount}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="搜索培训主题/讲师..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            className="pl-8 h-9"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 mb-3 -mx-0.5 px-0.5 scrollbar-hide">
          <button
            onClick={() => { setTypeFilter('all'); setAssessmentFilter('all') }}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              typeFilter === 'all' && assessmentFilter === 'all'
                ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            全部
          </button>
          <button
            onClick={() => { setTypeFilter('all'); setAssessmentFilter('pending') }}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              assessmentFilter === 'pending' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            待考核
          </button>
          <button
            onClick={() => { setTypeFilter('all'); setAssessmentFilter('pass') }}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              assessmentFilter === 'pass' ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            已合格
          </button>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-2 mb-2 -mx-0.5 px-0.5 scrollbar-hide">
          {TRAINING_TYPES.map(tab => (
            <button
              key={tab.code}
              onClick={() => { setTypeFilter(tab.code); setAssessmentFilter('all') }}
              className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs transition-colors ${
                typeFilter === tab.code ? 'bg-emerald-100 text-emerald-700 font-medium' : 'bg-gray-50 text-gray-500'
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
          <Empty title="暂无培训记录" description="点击右下角 + 按钮新增培训记录" />
        ) : (
          filteredRecords.map(r => {
            const typeColor = getTrainingTypeColor(r.type)
            const typeLabel = getTrainingTypeLabel(r.type)
            const assessment = ASSESSMENT_MAP[r.assessmentResult ?? 'pending']
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
                      {r.trainer && <span className="flex items-center gap-0.5"><User className="w-3 h-3" />{r.trainer}</span>}
                      {r.duration && <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{r.duration}分钟</span>}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Users className="w-3 h-3" />
                        <span>{getWorkerNames(r.attendeeIds)}</span>
                      </div>
                      <Badge className={`${assessment.color} border-0 text-xs`}>{assessment.label}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      <FloatingButton onClick={() => setAddOpen(true)} />

      <AddTrainingSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={() => { setAddOpen(false); loadData() }}
        workers={workers}
      />

      {detailRecord && (
        <TrainingDetailSheet
          record={detailRecord}
          workers={workers}
          onClose={() => setDetailRecord(null)}
          onUpdated={() => { setDetailRecord(null); loadData() }}
        />
      )}
    </div>
  )
}

function AddTrainingSheet({ open, onClose, onSuccess, workers }: {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  workers: Worker[]
}) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState('safety')
  const [date, setDate] = useState('')
  const [trainer, setTrainer] = useState('')
  const [duration, setDuration] = useState('')
  const [location, setLocation] = useState('')
  const [content, setContent] = useState('')
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setTitle(''); setType('safety'); setDate(new Date().toISOString().slice(0, 10))
      setTrainer(''); setDuration('120'); setLocation(''); setContent('')
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
      await trainingService.create({
        title: title.trim(),
        type,
        date,
        trainer: trainer.trim() || undefined,
        duration: duration ? parseInt(duration) : undefined,
        location: location.trim() || undefined,
        content: content.trim() || undefined,
        attendeeIds: selectedWorkers,
        assessmentResult: 'pending',
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
      title="新增培训记录"
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
        <FormField label="培训主题" required>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="如：电焊工安全操作培训" />
        </FormField>
        <div className="grid grid-cols-2 gap-2">
          <FormField label="培训类型" required>
            <Select value={type} onChange={e => setType(e.target.value)}>
              {TRAINING_TYPES.map(t => (
                <option key={t.code} value={t.code}>{t.label}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="培训日期" required>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <FormField label="培训讲师">
            <Input value={trainer} onChange={e => setTrainer(e.target.value)} placeholder="姓名" />
          </FormField>
          <FormField label="时长(分钟)">
            <Input type="number" value={duration} onChange={e => setDuration(e.target.value)} placeholder="120" />
          </FormField>
        </div>
        <FormField label="培训地点">
          <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="如：项目部培训室" />
        </FormField>
        <FormField label="培训内容">
          <Textarea rows={3} value={content} onChange={e => setContent(e.target.value)} placeholder="培训主要内容摘要" />
        </FormField>
        <FormField label={`参训人员 (${selectedWorkers.length}/${activeWorkers.length})`}>
          <div className="border rounded-lg p-2 max-h-40 overflow-y-auto">
            <button
              onClick={selectAll}
              className="w-full text-left text-xs text-emerald-600 py-1 mb-1 border-b border-gray-100"
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
                    className="w-4 h-4 rounded border-gray-300 text-emerald-600"
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

function TrainingDetailSheet({ record, workers, onClose, onUpdated }: {
  record: TrainingRecord
  workers: Worker[]
  onClose: () => void
  onUpdated: () => void
}) {
  const [assessOpen, setAssessOpen] = useState(false)
  const typeColor = getTrainingTypeColor(record.type)
  const typeLabel = getTrainingTypeLabel(record.type)

  const attendeeWorkers = record.attendeeIds
    .map(id => workers.find(w => w.id === id))
    .filter(Boolean) as Worker[]

  const handleDelete = async () => {
    if (!record.id || !confirm('确定删除该培训记录？')) return
    await trainingService.remove(record.id)
    onUpdated()
  }

  return (
    <>
      <Sheet
        open={true}
        onClose={onClose}
        title="培训详情"
        footer={
          <>
            {(!record.assessmentResult || record.assessmentResult === 'pending') && (
              <Button className="flex-1" onClick={() => setAssessOpen(true)}>
                <CheckCircle2 className="w-4 h-4 mr-1" />考核登记
              </Button>
            )}
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
            <Badge className={`${ASSESSMENT_MAP[record.assessmentResult ?? 'pending'].color} border-0`}>
              {ASSESSMENT_MAP[record.assessmentResult ?? 'pending'].label}
            </Badge>
          </div>
          <div>
            <h4 className="text-base font-semibold text-gray-900 mb-1">{record.title}</h4>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-0.5"><Calendar className="w-3 h-3" />{formatDate(record.date)}</span>
              {record.duration && <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{record.duration}分钟</span>}
            </div>
          </div>

          {record.trainer && <InfoRow label="培训讲师" value={record.trainer} />}
          {record.location && <InfoRow label="培训地点" value={record.location} />}

          {record.content && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">培训内容</p>
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
                  <span key={w.id} className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 rounded text-xs">
                    <User className="w-3 h-3" />{w.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </Sheet>

      {assessOpen && record.id && (
        <AssessSheet
          record={record}
          onClose={() => setAssessOpen(false)}
          onSuccess={() => { setAssessOpen(false); onUpdated() }}
        />
      )}
    </>
  )
}

function AssessSheet({ record, onClose, onSuccess }: {
  record: TrainingRecord
  onClose: () => void
  onSuccess: () => void
}) {
  const [result, setResult] = useState<'pass' | 'fail'>('pass')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!record.id) return
    setSubmitting(true)
    try {
      await trainingService.update(record.id, { assessmentResult: result })
      onSuccess()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Sheet
      open={true}
      onClose={onClose}
      title="考核登记"
      footer={
        <>
          <Button variant="outline" className="flex-1" onClick={onClose}>取消</Button>
          <Button
            className={result === 'pass' ? 'flex-1 bg-emerald-600 hover:bg-emerald-700' : 'flex-1 bg-red-600 hover:bg-red-700'}
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? '提交中...' : result === 'pass' ? '登记合格' : '登记不合格'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-1">培训主题</p>
          <p className="text-sm text-gray-800">{record.title}</p>
        </div>
        <FormField label="考核结果" required>
          <Select value={result} onChange={e => setResult(e.target.value as 'pass' | 'fail')}>
            <option value="pass">考核合格</option>
            <option value="fail">考核不合格</option>
          </Select>
        </FormField>
        <p className="text-xs text-gray-400">
          {result === 'pass' ? '参训人员已通过本次培训考核' : '参训人员未通过考核，需安排补训'}
        </p>
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
