import { useEffect, useState, useMemo, useCallback } from 'react'
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
import { trainingService } from '@/services/training.service'
import { TRAINING_TYPE_LABELS, TRAINING_SCENE_LABELS } from '@/types'
import type { EducationRecord, Worker, TrainingSession, TrainingEnrollment, TrainingScene } from '@/types'
import { SignatureUploader } from './components/SignatureUploader'

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
  // v5.0.1 加 Tab：新格式（推荐）/ 老格式（兼容只读）
  const [tab, setTab] = useState<'new' | 'legacy'>('new')

  return (
    <div className="pb-20">
      {/* 顶部 Tab 切换 */}
      <div className="px-3 pt-3">
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1 mb-3">
          <button
            onClick={() => setTab('new')}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === 'new' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
            }`}
          >
            新格式（推荐）
          </button>
          <button
            onClick={() => setTab('legacy')}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === 'legacy' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
            }`}
          >
            老格式（兼容只读）
          </button>
        </div>
      </div>

      {tab === 'new' ? <NewEducationTab /> : <LegacyEducationTab />}
    </div>
  )
}

// ============ 新格式 Tab（走 trainingService 新表） ============

function NewEducationTab() {
  const [sessions, setSessions] = useState<TrainingSession[]>([])
  const [workers, setWorkers] = useState<Worker[]>([])
  const [loading, setLoading] = useState(true)
  const [searchText, setSearchText] = useState('')
  const [sceneFilter, setSceneFilter] = useState<'all' | TrainingScene>('all')
  const [addOpen, setAddOpen] = useState(false)
  const [detailSession, setDetailSession] = useState<{ session: TrainingSession; enrollments: TrainingEnrollment[] } | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const pid = getCurrentProjectId()
      const [list, workerList] = await Promise.all([
        trainingService.listTrainings(pid, undefined, 'safetyEducation'),
        workerService.list(),
      ])
      setSessions(list)
      setWorkers(workerList)
    } catch (err) {
      console.error('加载培训列表失败', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const filteredSessions = useMemo(() => {
    let list = sessions
    if (sceneFilter !== 'all') list = list.filter(s => s.scene === sceneFilter)
    if (searchText.trim()) {
      const q = searchText.toLowerCase()
      list = list.filter(s =>
        s.title.toLowerCase().includes(q) ||
        (s.educator ?? '').toLowerCase().includes(q) ||
        (s.content ?? '').toLowerCase().includes(q),
      )
    }
    return list
  }, [sessions, sceneFilter, searchText])

  const sceneTabs: Array<{ code: 'all' | TrainingScene; label: string }> = [
    { code: 'all', label: '全部' },
    { code: 'threeLevelCompany', label: '公司级' },
    { code: 'threeLevelProject', label: '项目部级' },
    { code: 'threeLevelTeam', label: '班组级' },
    { code: 'monthly', label: '月度' },
    { code: 'adhoc', label: '临时' },
    { code: 'preShift', label: '班前' },
  ]

  const thisMonthCount = sessions.filter(s => {
    if (!s.date) return false
    const now = new Date()
    const d = new Date(s.date)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  }).length

  const handleViewDetail = async (session: TrainingSession) => {
    try {
      const enrollments = await trainingService.getEnrollments(session.id!)
      setDetailSession({ session, enrollments })
    } catch (err) {
      console.error('加载报名记录失败', err)
    }
  }

  return (
    <>
      <div className="px-3">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-4 text-white mb-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs opacity-90">本月教育（新表）</p>
              <p className="text-2xl font-bold">{thisMonthCount}<span className="text-sm font-normal opacity-80 ml-1">次</span></p>
            </div>
            <div className="text-right">
              <p className="text-xs opacity-90">累计教育场次</p>
              <p className="text-lg font-semibold">{sessions.length}<span className="text-xs opacity-80 ml-0.5">场</span></p>
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
          {sceneTabs.map(tab => (
            <button
              key={tab.code}
              onClick={() => setSceneFilter(tab.code)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                sceneFilter === tab.code ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'
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
        ) : filteredSessions.length === 0 ? (
          <Empty title="暂无教育记录" description="点击右下角 + 按钮新增（新表）" />
        ) : (
          filteredSessions.map(s => (
            <Card key={s.id} className="cursor-pointer active:bg-gray-50" onClick={() => handleViewDetail(s)}>
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <h4 className="text-sm font-medium text-gray-900 flex-1 line-clamp-1">{s.title}</h4>
                  <Badge className="bg-violet-50 text-violet-700 border-0 text-xs flex-shrink-0">
                    {TRAINING_SCENE_LABELS[s.scene]}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-0.5"><Calendar className="w-3 h-3" />{formatDate(s.date)}</span>
                    {s.educator && <span className="flex items-center gap-0.5"><User className="w-3 h-3" />{s.educator}</span>}
                    {s.duration && <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{s.duration}分钟</span>}
                  </div>
                  {s.location && <div className="text-xs text-gray-400">📍 {s.location}</div>}
                </div>
                <div className="flex items-center justify-end mt-1">
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <FloatingButton onClick={() => setAddOpen(true)} />

      <AddNewEducationSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={() => { setAddOpen(false); loadData() }}
        workers={workers}
      />

      {detailSession && (
        <NewEducationDetailSheet
          data={detailSession}
          workers={workers}
          onClose={() => setDetailSession(null)}
        />
      )}
    </>
  )
}

/** 新格式：新增教育（走 trainingService.createTraining + enrollWorkers） */
function AddNewEducationSheet({ open, onClose, onSuccess, workers }: {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  workers: Worker[]
}) {
  const [title, setTitle] = useState('')
  const [scene, setScene] = useState<TrainingScene>('threeLevelProject')
  const [date, setDate] = useState('')
  const [educator, setEducator] = useState('')
  const [duration, setDuration] = useState('60')
  const [location, setLocation] = useState('')
  const [content, setContent] = useState('')
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setTitle('')
      setScene('threeLevelProject')
      setDate(new Date().toISOString().slice(0, 10))
      setEducator('')
      setDuration('60')
      setLocation('')
      setContent('')
      setSelectedWorkers([])
    }
  }, [open])

  const activeWorkers = workers.filter(w => w.status === 'active')

  const toggleWorker = (id: string) => {
    setSelectedWorkers(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  const selectAll = () => {
    if (selectedWorkers.length === activeWorkers.length) setSelectedWorkers([])
    else setSelectedWorkers(activeWorkers.map(w => w.id!).filter(Boolean))
  }

  const handleSubmit = async () => {
    if (!title.trim() || !date) return
    setSubmitting(true)
    try {
      // 1. 创建培训会话
      const trainingId = await trainingService.createTraining({
        title: title.trim(),
        type: 'safetyEducation',
        scene,
        date,
        educator: educator.trim() || undefined,
        duration: duration ? parseInt(duration) : undefined,
        location: location.trim() || undefined,
        content: content.trim() || undefined,
        projectId: getCurrentProjectId(),
        status: 'completed',
      })
      // 2. 批量报名工人
      if (selectedWorkers.length > 0) {
        await trainingService.enrollWorkers(trainingId, selectedWorkers, { scene })
      }
      onSuccess()
    } catch (err) {
      console.error('创建教育记录失败', err)
    } finally {
      setSubmitting(false)
    }
  }

  const sceneOptions: TrainingScene[] = ['threeLevelCompany', 'threeLevelProject', 'threeLevelTeam', 'monthly', 'adhoc', 'preShift']

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="新增安全教育（新表）"
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
          <FormField label="教育场景" required>
            <Select value={scene} onChange={e => setScene(e.target.value as TrainingScene)}>
              {sceneOptions.map(s => (
                <option key={s} value={s}>{TRAINING_SCENE_LABELS[s]}</option>
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

/** 新格式：教育详情（显示报名工人列表 + 签字照片上传） */
function NewEducationDetailSheet({ data, workers, onClose }: {
  data: { session: TrainingSession; enrollments: TrainingEnrollment[] }
  workers: Worker[]
  onClose: () => void
}) {
  const { session } = data
  // 内部维护 enrollments，签字后可刷新
  const [enrollments, setEnrollments] = useState<TrainingEnrollment[]>(data.enrollments)
  const signedCount = enrollments.filter(e => e.signedAt).length
  const allSigned = enrollments.length > 0 && signedCount === enrollments.length

  const refreshEnrollments = async () => {
    try {
      const list = await trainingService.getEnrollments(session.id!)
      setEnrollments(list)
    } catch (err) {
      console.error('刷新报名记录失败', err)
    }
  }

  return (
    <Sheet
      open={true}
      onClose={onClose}
      title="教育详情（新表）"
      className="max-w-3xl"
      footer={
        <Button variant="outline" className="flex-1" onClick={onClose}>关闭</Button>
      }
    >
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge className="bg-violet-50 text-violet-700 border-0">
            {TRAINING_SCENE_LABELS[session.scene]}
          </Badge>
          <Badge className="bg-blue-50 text-blue-700 border-0">
            {TRAINING_TYPE_LABELS[session.type]}
          </Badge>
        </div>
        <div>
          <h4 className="text-base font-semibold text-gray-900 mb-1">{session.title}</h4>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-0.5"><Calendar className="w-3 h-3" />{formatDate(session.date)}</span>
            {session.duration && <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{session.duration}分钟</span>}
          </div>
        </div>
        {session.educator && <InfoRow label="教育人" value={session.educator} />}
        {session.location && <InfoRow label="教育地点" value={session.location} />}
        {session.content && (
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">教育内容</p>
            <p className="text-sm text-gray-800">{session.content}</p>
          </div>
        )}

        {/* 顶部统计大字：已签 X / Y 人 */}
        <div className={`rounded-lg p-3 text-center ${allSigned ? 'bg-emerald-50' : 'bg-amber-50'}`}>
          <p className={`text-2xl font-bold ${allSigned ? 'text-emerald-700' : 'text-amber-700'}`}>
            已签 {signedCount} / {enrollments.length} 人
          </p>
          <p className={`text-xs mt-0.5 ${allSigned ? 'text-emerald-600' : 'text-amber-600'}`}>
            {allSigned ? '✓ 全部签字完成' : '还有 ' + (enrollments.length - signedCount) + ' 人未签字'}
          </p>
        </div>

        {/* 参训人员列表：每行带 SignatureUploader */}
        <div>
          <p className="text-xs text-gray-500 mb-2">参训人员签字</p>
          {enrollments.length === 0 ? (
            <p className="text-xs text-gray-400">未记录参训人员</p>
          ) : (
            <div className="space-y-2">
              {enrollments.map(e => (
                <SignatureUploader
                  key={e.id}
                  enrollmentId={e.id!}
                  workerName={e.workerName || workers.find(w => w.id === e.workerId)?.name || '未知'}
                  currentSignatureId={e.signatureBlobId}
                  onSigned={refreshEnrollments}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </Sheet>
  )
}

// ============ 老格式 Tab（只读，原内容） ============

function LegacyEducationTab() {
  const [records, setRecords] = useState<EducationRecord[]>([])
  const [workers, setWorkers] = useState<Worker[]>([])
  const [loading, setLoading] = useState(true)
  const [searchText, setSearchText] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
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

  return (
    <>
      <div className="px-3">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 mb-3 text-xs text-amber-700">
          📌 老格式数据只读，新增请切到「新格式」Tab
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
          <Empty title="暂无老格式教育记录" description="" />
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
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {detailRecord && (
        <EducationDetailSheet
          record={detailRecord}
          workers={workers}
          onClose={() => setDetailRecord(null)}
          onDeleted={() => { setDetailRecord(null); loadData() }}
        />
      )}
    </>
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
