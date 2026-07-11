import { useEffect, useState, useMemo } from 'react'
import { Search, ChevronRight, FileCheck, Clock, CheckCircle2, XCircle, MapPin, User as UserIcon, CalendarDays, ShieldAlert, Flame, Wind, Zap, Anchor, Mountain, Bomb } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Sheet } from '@/components/ui/sheet'
import { FormField } from '@/components/ui/form-field'
import { Empty } from '@/components/ui/empty'
import { FloatingButton } from '@/components/ui/floating-button'
import { getCurrentProjectId } from '@/store'
import { workPermitService } from '@/services/workPermitService'
import type { WorkPermit } from '@/types'

const PERMIT_TYPES: Record<string, { label: string; icon: any; color: string }> = {
  hot_work: { label: '动火作业', icon: Flame, color: 'bg-red-50 text-red-600' },
  height_work: { label: '高处作业', icon: Wind, color: 'bg-orange-50 text-orange-600' },
  confined_space: { label: '有限空间', icon: ShieldAlert, color: 'bg-purple-50 text-purple-600' },
  temp_electric: { label: '临时用电', icon: Zap, color: 'bg-yellow-50 text-yellow-600' },
  lifting: { label: '起重吊装', icon: Anchor, color: 'bg-blue-50 text-blue-600' },
  excavation: { label: '土方开挖', icon: Mountain, color: 'bg-amber-50 text-amber-700' },
  blasting: { label: '爆破作业', icon: Bomb, color: 'bg-red-50 text-red-700' },
  other: { label: '其他作业', icon: FileCheck, color: 'bg-gray-50 text-gray-600' },
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
  draft: { label: '草稿', color: 'bg-gray-100 text-gray-600', icon: Clock },
  pending_approval: { label: '待审批', color: 'bg-amber-50 text-amber-700', icon: Clock },
  approved: { label: '已批准', color: 'bg-emerald-50 text-emerald-700', icon: CheckCircle2 },
  rejected: { label: '已驳回', color: 'bg-red-50 text-red-600', icon: XCircle },
  expired: { label: '已过期', color: 'bg-gray-100 text-gray-500', icon: Clock },
  closed: { label: '已关闭', color: 'bg-blue-50 text-blue-700', icon: CheckCircle2 },
}

export default function PermitListPage() {
  const [list, setList] = useState<WorkPermit[]>([])
  const [loading, setLoading] = useState(true)
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending_approval' | 'approved' | 'closed' | 'draft'>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [addOpen, setAddOpen] = useState(false)
  const [editItem, setEditItem] = useState<WorkPermit | null>(null)

  const loadList = async () => {
    setLoading(true)
    const data = await workPermitService.list()
    setList(data.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)))
    setLoading(false)
  }

  useEffect(() => { loadList() }, [])

  const filtered = useMemo(() => {
    let result = list
    if (statusFilter !== 'all') result = result.filter(i => i.status === statusFilter)
    if (typeFilter !== 'all') result = result.filter(i => i.type === typeFilter)
    if (searchText.trim()) {
      const q = searchText.toLowerCase()
      result = result.filter(i =>
        i.title.toLowerCase().includes(q) ||
        (i.location ?? '').toLowerCase().includes(q) ||
        (i.workContent ?? '').toLowerCase().includes(q),
      )
    }
    return result
  }, [list, statusFilter, typeFilter, searchText])

  const stats = useMemo(() => ({
    total: list.length,
    pending: list.filter(i => i.status === 'pending_approval').length,
    approved: list.filter(i => i.status === 'approved').length,
    todayActive: list.filter(i => i.status === 'approved').length,
  }), [list])

  return (
    <div className="pb-20">
      <div className="px-3 pt-3">
        <div className="bg-gradient-to-r from-sky-600 to-cyan-500 rounded-xl p-4 text-white mb-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs opacity-90">作业票总数</p>
              <p className="text-2xl font-bold">{stats.total}<span className="text-sm font-normal opacity-80 ml-1">张</span></p>
            </div>
            <div className="text-right space-y-0.5">
              <p className="text-xs opacity-90">待审批 <span className="font-semibold text-amber-200">{stats.pending}</span></p>
              <p className="text-xs opacity-90">已批准 <span className="font-semibold text-emerald-200">{stats.approved}</span></p>
            </div>
          </div>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="搜索作业票标题/地点/内容..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            className="pl-8 h-9"
          />
        </div>

        <div className="flex gap-1.5 mb-2 overflow-x-auto pb-1">
          {[
            { key: 'all', label: '全部' },
            { key: 'pending_approval', label: '待审批' },
            { key: 'approved', label: '已批准' },
            { key: 'closed', label: '已关闭' },
            { key: 'draft', label: '草稿' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key as any)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                statusFilter === tab.key ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              typeFilter === 'all' ? 'bg-sky-500 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            全部类型
          </button>
          {Object.entries(PERMIT_TYPES).map(([key, t]) => (
            <button
              key={key}
              onClick={() => setTypeFilter(key)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                typeFilter === key ? 'bg-sky-500 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-3 space-y-2">
        {loading ? (
          <div className="py-12 text-center text-sm text-gray-400">加载中...</div>
        ) : filtered.length === 0 ? (
          <Empty title="暂无作业票" description="点击右下角 + 按钮开具作业票" />
        ) : (
          filtered.map(item => {
            const st = STATUS_MAP[item.status] ?? STATUS_MAP.draft
            const pt = PERMIT_TYPES[item.type] ?? PERMIT_TYPES.other
            const TypeIcon = pt.icon
            const StatusIcon = st.icon
            return (
              <Card key={item.id} className="cursor-pointer active:bg-gray-50" onClick={() => setEditItem(item)}>
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg ${pt.color} flex items-center justify-center flex-shrink-0`}>
                      <TypeIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium text-gray-900 truncate">{item.title}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <Badge className="bg-sky-50 text-sky-700 border-0 text-[10px] px-1.5 py-0">{pt.label}</Badge>
                        <Badge className={`${st.color} border-0 text-[10px] px-1.5 py-0 flex items-center gap-0.5`}>
                          <StatusIcon className="w-2.5 h-2.5" />{st.label}
                        </Badge>
                      </div>
                      <div className="space-y-0.5">
                        {item.location && (
                          <p className="text-xs text-gray-400 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />{item.location}
                          </p>
                        )}
                        {(item.startTime || item.endTime) && (
                          <p className="text-xs text-gray-400 flex items-center gap-1">
                            <CalendarDays className="w-3 h-3" />
                            {item.startTime?.slice(0, 16) || '?'} ~ {item.endTime?.slice(0, 16) || '?'}
                          </p>
                        )}
                        {item.guardianId && (
                          <p className="text-xs text-gray-400 flex items-center gap-1">
                            <UserIcon className="w-3 h-3" />监护人：{item.guardianId}
                          </p>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0 mt-2" />
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      <FloatingButton onClick={() => setAddOpen(true)} />

      <FormSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={() => { setAddOpen(false); loadList() }}
      />

      {editItem && (
        <DetailSheet
          item={editItem}
          onClose={() => setEditItem(null)}
          onUpdated={() => { setEditItem(null); loadList() }}
        />
      )}
    </div>
  )
}

function FormSheet({ open, onClose, onSuccess, item }: {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  item?: WorkPermit | null
}) {
  const isEdit = !!item
  const [title, setTitle] = useState('')
  const [type, setType] = useState<string>('hot_work')
  const [location, setLocation] = useState('')
  const [workContent, setWorkContent] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [safetyMeasures, setSafetyMeasures] = useState('')
  const [guardianId, setGuardianId] = useState('')
  const [approverId, setApproverId] = useState('')
  const [fireWatcherId, setFireWatcherId] = useState('')
  const [gasTestResult, setGasTestResult] = useState('')
  const [status, setStatus] = useState<'draft' | 'pending_approval' | 'approved' | 'rejected' | 'expired' | 'closed'>('draft')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      if (item) {
        setTitle(item.title); setType(item.type); setLocation(item.location ?? '')
        setWorkContent(item.workContent ?? ''); setStartTime(item.startTime ?? '')
        setEndTime(item.endTime ?? ''); setSafetyMeasures(item.safetyMeasures ?? '')
        setGuardianId(item.guardianId ?? ''); setApproverId(item.approverId ?? '')
        setFireWatcherId(item.fireWatcherId ?? ''); setGasTestResult(item.gasTestResult ?? '')
        setStatus(item.status)
      } else {
        const now = new Date()
        const pad = (n: number) => String(n).padStart(2, '0')
        const defaultStart = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
        now.setHours(now.getHours() + 8)
        const defaultEnd = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
        setTitle(''); setType('hot_work'); setLocation(''); setWorkContent('')
        setStartTime(defaultStart); setEndTime(defaultEnd); setSafetyMeasures('')
        setGuardianId(''); setApproverId(''); setFireWatcherId(''); setGasTestResult('')
        setStatus('draft')
      }
    }
  }, [open, item])

  const handleSubmit = async () => {
    if (!title.trim() || !location.trim()) return
    setSubmitting(true)
    try {
      const data = {
        title: title.trim(),
        type: type as WorkPermit['type'],
        location: location.trim(),
        workContent: workContent.trim() || undefined,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        safetyMeasures: safetyMeasures.trim() || undefined,
        guardianId: guardianId.trim() || undefined,
        approverId: approverId.trim() || undefined,
        fireWatcherId: type === 'hot_work' ? fireWatcherId.trim() || undefined : undefined,
        gasTestResult: type === 'confined_space' || type === 'hot_work' ? gasTestResult.trim() || undefined : undefined,
        status,
        projectId: getCurrentProjectId(),
      }
      if (isEdit && item?.id) {
        await workPermitService.update(item.id, data)
      } else {
        await workPermitService.create(data)
      }
      onSuccess()
    } finally {
      setSubmitting(false)
    }
  }

  const needFireWatcher = type === 'hot_work'
  const needGasTest = type === 'hot_work' || type === 'confined_space'

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={isEdit ? '编辑作业票' : '开具作业票'}
      footer={
        <>
          <Button variant="outline" className="flex-1" onClick={onClose}>取消</Button>
          <Button className="flex-1" onClick={handleSubmit} disabled={!title.trim() || !location.trim() || submitting}>
            {submitting ? '提交中...' : '保存'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <FormField label="作业票标题" required>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="如：3层动火作业" />
        </FormField>
        <div className="grid grid-cols-2 gap-2">
          <FormField label="作业类型" required>
            <Select value={type} onChange={e => setType(e.target.value)}>
              {Object.entries(PERMIT_TYPES).map(([k, t]) => (
                <option key={k} value={k}>{t.label}</option>
              ))}
            </Select>
          </FormField>
          {isEdit && (
            <FormField label="状态">
              <Select value={status} onChange={e => setStatus(e.target.value as any)}>
                <option value="draft">草稿</option>
                <option value="pending_approval">提交审批</option>
                <option value="approved">批准</option>
                <option value="rejected">驳回</option>
                <option value="closed">关闭</option>
              </Select>
            </FormField>
          )}
        </div>
        <FormField label="作业地点" required>
          <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="如：3号楼5层东侧" />
        </FormField>
        <FormField label="作业内容">
          <textarea
            value={workContent}
            onChange={e => setWorkContent(e.target.value)}
            placeholder="描述具体作业内容..."
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-h-[60px] resize-none"
          />
        </FormField>
        <div className="grid grid-cols-2 gap-2">
          <FormField label="开始时间">
            <Input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} />
          </FormField>
          <FormField label="结束时间">
            <Input type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)} />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <FormField label="监护人">
            <Input value={guardianId} onChange={e => setGuardianId(e.target.value)} placeholder="现场监护人" />
          </FormField>
          <FormField label="审批人">
            <Input value={approverId} onChange={e => setApproverId(e.target.value)} placeholder="审批负责人" />
          </FormField>
        </div>
        {needFireWatcher && (
          <FormField label="看火人">
            <Input value={fireWatcherId} onChange={e => setFireWatcherId(e.target.value)} placeholder="动火看火人" />
          </FormField>
        )}
        {needGasTest && (
          <FormField label="气体检测结果">
            <Input value={gasTestResult} onChange={e => setGasTestResult(e.target.value)} placeholder="如：可燃气体0%LEL，氧气20.9%" />
          </FormField>
        )}
        <FormField label="安全措施">
          <textarea
            value={safetyMeasures}
            onChange={e => setSafetyMeasures(e.target.value)}
            placeholder="已落实的安全防护措施..."
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-h-[72px] resize-none"
          />
        </FormField>
        {!isEdit && (
          <button
            onClick={() => setStatus('pending_approval')}
            className="w-full py-2 text-xs text-sky-600 bg-sky-50 hover:bg-sky-100 rounded-lg"
          >
            保存并提交审批
          </button>
        )}
      </div>
    </Sheet>
  )
}

function DetailSheet({ item, onClose, onUpdated }: {
  item: WorkPermit
  onClose: () => void
  onUpdated: () => void
}) {
  const [editOpen, setEditOpen] = useState(false)
  const st = STATUS_MAP[item.status] ?? STATUS_MAP.draft
  const pt = PERMIT_TYPES[item.type] ?? PERMIT_TYPES.other

  const handleApprove = async () => {
    if (!item.id) return
    await workPermitService.update(item.id, { status: 'approved', approverComment: '批准' })
    onUpdated()
  }

  const handleReject = async () => {
    if (!item.id) return
    const reason = prompt('请输入驳回原因：')
    if (reason === null) return
    await workPermitService.update(item.id, { status: 'rejected', approverComment: reason })
    onUpdated()
  }

  const handleClose = async () => {
    if (!item.id || !confirm('确认关闭该作业票？')) return
    await workPermitService.update(item.id, { status: 'closed' })
    onUpdated()
  }

  const handleDelete = async () => {
    if (!item.id || !confirm('确定删除该作业票？此操作不可恢复。')) return
    await workPermitService.remove(item.id)
    onUpdated()
  }

  return (
    <>
      <Sheet
        open={true}
        onClose={onClose}
        title="作业票详情"
        footer={
          <>
            <Button variant="outline" className="flex-1" onClick={onClose}>关闭</Button>
            {item.status === 'pending_approval' && (
              <>
                <Button variant="outline" className="flex-1 text-red-600" onClick={handleReject}>驳回</Button>
                <Button className="flex-1" onClick={handleApprove}>批准</Button>
              </>
            )}
            {item.status === 'approved' && (
              <Button className="flex-1" onClick={handleClose}>关闭作业</Button>
            )}
            {(item.status === 'draft' || item.status === 'rejected') && (
              <Button className="flex-1" onClick={() => setEditOpen(true)}>编辑</Button>
            )}
          </>
        }
      >
        <div className="space-y-3">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
            <div className={`w-14 h-14 rounded-lg ${pt.color} flex items-center justify-center`}>
              <FileCheck className="w-7 h-7" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-lg font-semibold text-gray-900 truncate">{item.title}</h4>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <Badge className={`${pt.color} border-0 text-[10px]`}>{pt.label}</Badge>
                <Badge className={`${st.color} border-0 text-[10px]`}>{st.label}</Badge>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <InfoRow label="作业地点" value={item.location ?? '-'} />
            <InfoRow label="作业时间" value={(item.startTime && item.endTime) ? `${item.startTime?.slice(0, 16)} ~ ${item.endTime?.slice(0, 16)}` : '-'} />
            <InfoRow label="监护人" value={item.guardianId ?? '-'} />
            <InfoRow label="审批人" value={item.approverId ?? '-'} />
            {item.fireWatcherId && <InfoRow label="看火人" value={item.fireWatcherId} />}
            {item.gasTestResult && <InfoRow label="气体检测" value={item.gasTestResult} />}
            {item.approverComment && (
              <div className="pt-2 border-t border-gray-50">
                <p className="text-xs text-gray-500 mb-1">审批意见</p>
                <p className="text-sm text-gray-800">{item.approverComment}</p>
              </div>
            )}
            {item.workContent && (
              <div className="pt-2 border-t border-gray-50">
                <p className="text-xs text-gray-500 mb-1">作业内容</p>
                <p className="text-sm text-gray-800">{item.workContent}</p>
              </div>
            )}
            {item.safetyMeasures && (
              <div className="pt-2 border-t border-gray-50">
                <p className="text-xs text-gray-500 mb-1">安全措施</p>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{item.safetyMeasures}</p>
              </div>
            )}
          </div>

          <button
            onClick={handleDelete}
            className="w-full py-2 text-xs text-red-500 hover:bg-red-50 rounded"
          >
            删除该作业票
          </button>
        </div>
      </Sheet>

      <FormSheet
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSuccess={() => { setEditOpen(false); onUpdated() }}
        item={item}
      />
    </>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm py-1.5">
      <span className="text-gray-500 text-xs">{label}</span>
      <span className="text-gray-900 text-right max-w-[65%] truncate">{value}</span>
    </div>
  )
}
