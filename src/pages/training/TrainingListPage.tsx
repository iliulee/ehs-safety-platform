import { useEffect, useState, useMemo, useCallback } from 'react'
import { Search, ChevronRight, Calendar, User, Clock, Users } from 'lucide-react'
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
import { trainingService as legacyTrainingService } from '@/services/trainingService'
import { trainingService } from '@/services/training.service'
import { workerService } from '@/services/workerService'
import { TRAINING_TYPE_LABELS, TRAINING_SCENE_LABELS } from '@/types'
import type { TrainingRecord, Worker, TrainingSession, TrainingEnrollment, TrainingType, TrainingScene } from '@/types'
import { SignatureUploader } from '../education/components/SignatureUploader'

// 老格式培训类型（旧 TrainingRecord.type 用）
const LEGACY_TRAINING_TYPES = [
  { code: 'safety', label: '安全技能培训' },
  { code: 'operation', label: '操作规程培训' },
  { code: 'emergency', label: '应急救援培训' },
  { code: 'special', label: '特种作业培训' },
  { code: 'fire', label: '消防安全培训' },
  { code: 'firstaid', label: '急救知识培训' },
  { code: 'legal', label: '法律法规培训' },
  { code: 'other', label: '其他培训' },
]

// 新格式可选培训类型（除 safetyEducation，安全教育归教育页）
const NEW_TRAINING_TYPE_OPTIONS: TrainingType[] = [
  'skillTraining', 'meeting', 'techDisclosure', 'preShift', 'physicalExam',
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

function getLegacyTrainingTypeLabel(code?: string): string {
  if (!code) return '培训'
  return LEGACY_TRAINING_TYPES.find(t => t.code === code)?.label ?? '培训'
}

function getLegacyTrainingTypeColor(code?: string): string {
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

      {tab === 'new' ? <NewTrainingTab /> : <LegacyTrainingTab />}
    </div>
  )
}

// ============ 新格式 Tab（走 trainingService 新表） ============

function NewTrainingTab() {
  const [sessions, setSessions] = useState<TrainingSession[]>([])
  const [workers, setWorkers] = useState<Worker[]>([])
  const [loading, setLoading] = useState(true)
  const [searchText, setSearchText] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | TrainingType>('all')
  const [sceneFilter, setSceneFilter] = useState<'all' | TrainingScene>('all')
  const [addOpen, setAddOpen] = useState(false)
  const [detailSession, setDetailSession] = useState<{ session: TrainingSession; enrollments: TrainingEnrollment[] } | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const pid = getCurrentProjectId()
      const [list, workerList] = await Promise.all([
        trainingService.listTrainings(pid),
        workerService.list(),
      ])
      // 培训页只展示非 safetyEducation 的会话（安全教育归教育页）
      setSessions(list.filter(s => s.type !== 'safetyEducation'))
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
    if (typeFilter !== 'all') list = list.filter(s => s.type === typeFilter)
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
  }, [sessions, typeFilter, sceneFilter, searchText])

  const sceneTabs: Array<{ code: 'all' | TrainingScene; label: string }> = [
    { code: 'all', label: '全部场景' },
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
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl p-4 text-white mb-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs opacity-90">本月培训（新表）</p>
              <p className="text-2xl font-bold">{thisMonthCount}<span className="text-sm font-normal opacity-80 ml-1">次</span></p>
            </div>
            <div className="text-right">
              <p className="text-xs opacity-90">累计培训场次</p>
              <p className="text-lg font-semibold">{sessions.length}<span className="text-xs opacity-80 ml-0.5">场</span></p>
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

        <div className="flex gap-1.5 overflow-x-auto pb-1 mb-2 -mx-0.5 px-0.5 scrollbar-hide">
          <button
            onClick={() => setTypeFilter('all')}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              typeFilter === 'all' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            全部类型
          </button>
          {NEW_TRAINING_TYPE_OPTIONS.map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                typeFilter === t ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {TRAINING_TYPE_LABELS[t]}
            </button>
          ))}
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
          <Empty title="暂无培训记录" description="点击右下角 + 按钮新增（新表）" />
        ) : (
          filteredSessions.map(s => (
            <Card key={s.id} className="cursor-pointer active:bg-gray-50" onClick={() => handleViewDetail(s)}>
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <h4 className="text-sm font-medium text-gray-900 flex-1 line-clamp-1">{s.title}</h4>
                  <Badge className="bg-emerald-50 text-emerald-700 border-0 text-xs flex-shrink-0">
                    {TRAINING_TYPE_LABELS[s.type]}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-0.5"><Calendar className="w-3 h-3" />{formatDate(s.date)}</span>
                    {s.educator && <span className="flex items-center gap-0.5"><User className="w-3 h-3" />{s.educator}</span>}
                    {s.duration && <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{s.duration}分钟</span>}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">{TRAINING_SCENE_LABELS[s.scene]}</span>
                    {s.location && <span className="text-xs text-gray-400">📍 {s.location}</span>}
                  </div>
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

      <AddNewTrainingSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={() => { setAddOpen(false); loadData() }}
        workers={workers}
      />

      {detailSession && (
        <NewTrainingDetailSheet
          data={detailSession}
          workers={workers}
          onClose={() => setDetailSession(null)}
        />
      )}
    </>
  )
}

/** 新格式：新增培训（走 trainingService.createTraining + enrollWorkers） */
function AddNewTrainingSheet({ open, onClose, onSuccess, workers }: {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  workers: Worker[]
}) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState<TrainingType>('skillTraining')
  const [scene, setScene] = useState<TrainingScene>('threeLevelProject')
  const [date, setDate] = useState('')
  const [educator, setEducator] = useState('')
  const [duration, setDuration] = useState('120')
  const [location, setLocation] = useState('')
  const [content, setContent] = useState('')
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setTitle('')
      setType('skillTraining')
      setScene('threeLevelProject')
      setDate(new Date().toISOString().slice(0, 10))
      setEducator('')
      setDuration('120')
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
        type,
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
      console.error('创建培训记录失败', err)
    } finally {
      setSubmitting(false)
    }
  }

  const sceneOptions: TrainingScene[] = ['threeLevelCompany', 'threeLevelProject', 'threeLevelTeam', 'monthly', 'adhoc', 'preShift']

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="新增培训记录（新表）"
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
            <Select value={type} onChange={e => setType(e.target.value as TrainingType)}>
              {NEW_TRAINING_TYPE_OPTIONS.map(t => (
                <option key={t} value={t}>{TRAINING_TYPE_LABELS[t]}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="培训场景" required>
            <Select value={scene} onChange={e => setScene(e.target.value as TrainingScene)}>
              {sceneOptions.map(s => (
                <option key={s} value={s}>{TRAINING_SCENE_LABELS[s]}</option>
              ))}
            </Select>
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <FormField label="培训日期" required>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </FormField>
          <FormField label="时长(分钟)">
            <Input type="number" value={duration} onChange={e => setDuration(e.target.value)} placeholder="120" />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <FormField label="培训讲师">
            <Input value={educator} onChange={e => setEducator(e.target.value)} placeholder="姓名" />
          </FormField>
          <FormField label="培训地点">
            <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="如：项目部培训室" />
          </FormField>
        </div>
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

/** 新格式：培训详情（显示 enrollment 列表 + 签字照片上传） */
function NewTrainingDetailSheet({ data, workers, onClose }: {
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
      title="培训详情"
      className="max-w-3xl"
      footer={
        <Button variant="outline" className="flex-1" onClick={onClose}>关闭</Button>
      }
    >
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge className="bg-emerald-50 text-emerald-700 border-0">{TRAINING_TYPE_LABELS[session.type]}</Badge>
          <Badge className="bg-violet-50 text-violet-700 border-0">{TRAINING_SCENE_LABELS[session.scene]}</Badge>
        </div>
        <div>
          <h4 className="text-base font-semibold text-gray-900 mb-1">{session.title}</h4>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-0.5"><Calendar className="w-3 h-3" />{formatDate(session.date)}</span>
            {session.duration && <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{session.duration}分钟</span>}
          </div>
        </div>

        {session.educator && <InfoRow label="培训讲师" value={session.educator} />}
        {session.location && <InfoRow label="培训地点" value={session.location} />}

        {session.content && (
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">培训内容</p>
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

// ============ 老格式 Tab（只读，不让新增） ============

function LegacyTrainingTab() {
  const [records, setRecords] = useState<TrainingRecord[]>([])
  const [workers, setWorkers] = useState<Worker[]>([])
  const [loading, setLoading] = useState(true)
  const [searchText, setSearchText] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [assessmentFilter, setAssessmentFilter] = useState<string>('all')
  const [detailRecord, setDetailRecord] = useState<TrainingRecord | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [list, workerList] = await Promise.all([
        legacyTrainingService.list(),
        workerService.list(),
      ])
      setRecords(list.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)))
      setWorkers(workerList)
    } catch (err) {
      console.error('加载老格式培训列表失败', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

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

  return (
    <>
      <div className="px-3">
        {/* 老格式只读提示 */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 mb-3 text-xs text-amber-800">
          📌 老格式数据只读，新增请切到「新格式」Tab
        </div>

        <div className="bg-gradient-to-r from-slate-500 to-slate-600 rounded-xl p-4 text-white mb-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs opacity-90">老格式培训总次数</p>
              <p className="text-2xl font-bold">{records.length}<span className="text-sm font-normal opacity-80 ml-1">次</span></p>
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
          {LEGACY_TRAINING_TYPES.map(tab => (
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
          <Empty title="暂无老格式培训记录" description="老格式只读，新增请切到新格式 Tab" />
        ) : (
          filteredRecords.map(r => {
            const typeColor = getLegacyTrainingTypeColor(r.type)
            const typeLabel = getLegacyTrainingTypeLabel(r.type)
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

      {/* 老格式只读：没有 FloatingButton，没有新增 Sheet */}

      {detailRecord && (
        <LegacyTrainingDetailSheet
          record={detailRecord}
          workers={workers}
          onClose={() => setDetailRecord(null)}
        />
      )}
    </>
  )
}

/** 老格式只读详情（不能考核登记、不能删除） */
function LegacyTrainingDetailSheet({ record, workers, onClose }: {
  record: TrainingRecord
  workers: Worker[]
  onClose: () => void
}) {
  const typeColor = getLegacyTrainingTypeColor(record.type)
  const typeLabel = getLegacyTrainingTypeLabel(record.type)

  const attendeeWorkers = record.attendeeIds
    .map(id => workers.find(w => w.id === id))
    .filter(Boolean) as Worker[]

  return (
    <Sheet
      open={true}
      onClose={onClose}
      title="培训详情（老格式·只读）"
      footer={
        <Button variant="outline" className="flex-1" onClick={onClose}>关闭</Button>
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
