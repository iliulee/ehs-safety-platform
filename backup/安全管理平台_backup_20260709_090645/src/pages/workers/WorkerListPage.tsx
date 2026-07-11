import { useEffect, useState, useMemo } from 'react'
import { Search, ChevronRight, User as UserIcon, Phone, CreditCard } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Sheet } from '@/components/ui/sheet'
import { FormField } from '@/components/ui/form-field'
import { Empty } from '@/components/ui/empty'
import { FloatingButton } from '@/components/ui/floating-button'
import { useAppStore, getDictLabel, getCurrentProjectId } from '@/store'
import { workerService } from '@/services/workerService'
import { subcontractorService } from '@/services/subcontractorService'
import type { Worker, Subcontractor } from '@/types'

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  active: { label: '在岗', color: 'bg-emerald-50 text-emerald-700' },
  left: { label: '离场', color: 'bg-gray-100 text-gray-600' },
  suspended: { label: '停工', color: 'bg-amber-50 text-amber-700' },
}

function maskIdCard(id?: string): string {
  if (!id) return '-'
  if (id.length <= 8) return id
  return id.slice(0, 4) + '********' + id.slice(-4)
}

export default function WorkerListPage() {
  const [workers, setWorkers] = useState<Worker[]>([])
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([])
  const [loading, setLoading] = useState(true)
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'left'>('all')
  const [addOpen, setAddOpen] = useState(false)
  const [editWorker, setEditWorker] = useState<Worker | null>(null)

  const { getDictItems } = useAppStore()
  const workTypeItems = getDictItems('work_type')

  const getSubcontractorName = (id?: string) => {
    if (!id) return '-'
    return subcontractors.find(s => s.id === id)?.name ?? '-'
  }

  const loadData = async () => {
    setLoading(true)
    const [wList, sList] = await Promise.all([
      workerService.list(),
      subcontractorService.list(),
    ])
    setWorkers(wList.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)))
    setSubcontractors(sList)
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const filteredWorkers = useMemo(() => {
    let list = workers
    if (statusFilter !== 'all') list = list.filter(w => w.status === statusFilter)
    if (searchText.trim()) {
      const q = searchText.toLowerCase()
      list = list.filter(w =>
        w.name.toLowerCase().includes(q) ||
        (w.idCard ?? '').includes(q) ||
        (w.phone ?? '').includes(q),
      )
    }
    return list
  }, [workers, statusFilter, searchText])

  const activeCount = workers.filter(w => w.status === 'active').length

  return (
    <div className="pb-20">
      <div className="px-3 pt-3">
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl p-4 text-white mb-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs opacity-90">在场工人</p>
              <p className="text-2xl font-bold">{activeCount}<span className="text-sm font-normal opacity-80 ml-1">人</span></p>
            </div>
            <div className="text-right">
              <p className="text-xs opacity-90">总登记</p>
              <p className="text-lg font-semibold">{workers.length}<span className="text-xs opacity-80 ml-0.5">人</span></p>
            </div>
          </div>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="搜索姓名/身份证/电话..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            className="pl-8 h-9"
          />
        </div>

        <div className="flex gap-1.5 mb-3">
          {[
            { key: 'all', label: '全部' },
            { key: 'active', label: '在岗' },
            { key: 'left', label: '离场' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key as 'all' | 'active' | 'left')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                statusFilter === tab.key ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'
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
        ) : filteredWorkers.length === 0 ? (
          <Empty title="暂无人员记录" description="点击右下角 + 按钮添加工人" />
        ) : (
          filteredWorkers.map(w => {
            const st = STATUS_MAP[w.status] ?? STATUS_MAP.active
            return (
              <Card key={w.id} className="cursor-pointer active:bg-gray-50" onClick={() => setEditWorker(w)}>
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                      <UserIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium text-gray-900">{w.name}</span>
                        <Badge className={`${st.color} border-0 text-xs`}>{st.label}</Badge>
                      </div>
                      <div className="space-y-0.5">
                        {w.workType && (
                          <p className="text-xs text-gray-500">{getDictLabel('work_type', w.workType)}</p>
                        )}
                        {w.subcontractorId && getSubcontractorName(w.subcontractorId) !== '-' && (
                          <p className="text-xs text-gray-500">{getSubcontractorName(w.subcontractorId)}</p>
                        )}
                        {w.idCard && (
                          <p className="text-xs text-gray-400 flex items-center gap-1">
                            <CreditCard className="w-3 h-3" />{maskIdCard(w.idCard)}
                          </p>
                        )}
                        {w.phone && (
                          <p className="text-xs text-gray-400 flex items-center gap-1">
                            <Phone className="w-3 h-3" />{w.phone}
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

      <WorkerFormSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={() => { setAddOpen(false); loadData() }}
        workTypeItems={workTypeItems}
        subcontractors={subcontractors}
      />

      {editWorker && (
        <WorkerDetailSheet
          worker={editWorker}
          onClose={() => setEditWorker(null)}
          onUpdated={() => { setEditWorker(null); loadData() }}
          workTypeItems={workTypeItems}
          subcontractors={subcontractors}
        />
      )}
    </div>
  )
}

function WorkerFormSheet({ open, onClose, onSuccess, workTypeItems, subcontractors, worker }: {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  workTypeItems: { code: string; label: string }[]
  subcontractors: Subcontractor[]
  worker?: Worker | null
}) {
  const isEdit = !!worker
  const [name, setName] = useState('')
  const [idCard, setIdCard] = useState('')
  const [phone, setPhone] = useState('')
  const [workType, setWorkType] = useState('')
  const [gender, setGender] = useState<'male' | 'female'>('male')
  const [nation, setNation] = useState('汉族')
  const [address, setAddress] = useState('')
  const [entryDate, setEntryDate] = useState('')
  const [subcontractor, setSubcontractor] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      if (worker) {
        setName(worker.name); setIdCard(worker.idCard ?? ''); setPhone(worker.phone ?? '')
        setWorkType(worker.workType ?? ''); setGender((worker.gender as 'male' | 'female') ?? 'male')
        setNation(worker.nation ?? '汉族'); setAddress(worker.address ?? '')
        setEntryDate(worker.entryDate ?? ''); setSubcontractor(worker.subcontractorId ?? '')
      } else {
        setName(''); setIdCard(''); setPhone(''); setWorkType('')
        setGender('male'); setNation('汉族'); setAddress(''); setEntryDate(new Date().toISOString().slice(0, 10)); setSubcontractor('')
      }
    }
  }, [open, worker])

  const handleSubmit = async () => {
    if (!name.trim()) return
    setSubmitting(true)
    try {
      const data = {
        name: name.trim(),
        idCard: idCard.trim() || undefined,
        phone: phone.trim() || undefined,
        workType: workType || undefined,
        gender,
        nation: nation.trim() || undefined,
        address: address.trim() || undefined,
        entryDate: entryDate || undefined,
        subcontractorId: subcontractor.trim() || undefined,
        status: 'active' as const,
        projectId: getCurrentProjectId(),
      }
      if (isEdit && worker?.id) {
        await workerService.update(worker.id, data)
      } else {
        await workerService.create(data)
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
      title={isEdit ? '编辑人员' : '新增人员'}
      footer={
        <>
          <Button variant="outline" className="flex-1" onClick={onClose}>取消</Button>
          <Button className="flex-1" onClick={handleSubmit} disabled={!name.trim() || submitting}>
            {submitting ? '提交中...' : '保存'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <FormField label="姓名" required>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="请输入姓名" />
        </FormField>
        <div className="grid grid-cols-2 gap-2">
          <FormField label="性别">
            <Select value={gender} onChange={e => setGender(e.target.value as 'male' | 'female')}>
              <option value="male">男</option>
              <option value="female">女</option>
            </Select>
          </FormField>
          <FormField label="民族">
            <Input value={nation} onChange={e => setNation(e.target.value)} placeholder="汉族" />
          </FormField>
        </div>
        <FormField label="身份证号">
          <Input value={idCard} onChange={e => setIdCard(e.target.value)} placeholder="18位身份证号" maxLength={18} />
        </FormField>
        <FormField label="联系电话">
          <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="手机号码" />
        </FormField>
        <FormField label="工种">
          <Select value={workType} onChange={e => setWorkType(e.target.value)}>
            <option value="">请选择</option>
            {workTypeItems.map(w => (
              <option key={w.code} value={w.code}>{w.label}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="进场日期">
          <Input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} />
        </FormField>
        <FormField label="所属分包">
          <Select value={subcontractor} onChange={e => setSubcontractor(e.target.value)}>
            <option value="">请选择分包单位</option>
            {subcontractors.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="住址">
          <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="户籍地址" />
        </FormField>
      </div>
    </Sheet>
  )
}

function WorkerDetailSheet({ worker, onClose, onUpdated, workTypeItems, subcontractors }: {
  worker: Worker
  onClose: () => void
  onUpdated: () => void
  workTypeItems: { code: string; label: string }[]
  subcontractors: Subcontractor[]
}) {
  const [editOpen, setEditOpen] = useState(false)

  const getSubName = (id?: string) => {
    if (!id) return '-'
    return subcontractors.find(s => s.id === id)?.name ?? '-'
  }

  const handleLeave = async () => {
    if (!worker.id || !confirm('确定标记该工人为离场？')) return
    await workerService.update(worker.id, { status: 'left' })
    onUpdated()
  }

  const handleDelete = async () => {
    if (!worker.id || !confirm('确定删除该工人记录？此操作不可恢复。')) return
    await workerService.remove(worker.id)
    onUpdated()
  }

  return (
    <>
      <Sheet
        open={true}
        onClose={onClose}
        title="人员详情"
        footer={
          <>
            <Button variant="outline" className="flex-1" onClick={onClose}>关闭</Button>
            {worker.status === 'active' && (
              <Button variant="outline" className="flex-1" onClick={handleLeave}>标记离场</Button>
            )}
            <Button className="flex-1" onClick={() => setEditOpen(true)}>编辑</Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
            <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
              <UserIcon className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-lg font-semibold text-gray-900">{worker.name}</h4>
              <p className="text-sm text-gray-500">
                {worker.workType ? getDictLabel('work_type', worker.workType) : '未设置工种'}
                <Badge className={`ml-2 ${STATUS_MAP[worker.status]?.color ?? 'bg-gray-100 text-gray-600'} border-0 text-xs`}>
                  {STATUS_MAP[worker.status]?.label ?? '在岗'}
                </Badge>
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <InfoRow label="所属分包" value={getSubName(worker.subcontractorId)} />
            <InfoRow label="身份证号" value={maskIdCard(worker.idCard)} />
            <InfoRow label="联系电话" value={worker.phone ?? '-'} />
            <InfoRow label="性别" value={worker.gender === 'female' ? '女' : '男'} />
            <InfoRow label="民族" value={worker.nation ?? '-'} />
            <InfoRow label="进场日期" value={worker.entryDate ?? '-'} />
            <InfoRow label="住址" value={worker.address ?? '-'} />
          </div>

          <button
            onClick={handleDelete}
            className="w-full py-2 text-xs text-red-500 hover:bg-red-50 rounded"
          >
            删除该人员
          </button>
        </div>
      </Sheet>

      <WorkerFormSheet
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSuccess={() => { setEditOpen(false); onUpdated() }}
        workTypeItems={workTypeItems}
        subcontractors={subcontractors}
        worker={worker}
      />
    </>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm py-1.5">
      <span className="text-gray-500 text-xs">{label}</span>
      <span className="text-gray-900 text-right max-w-[60%] truncate">{value}</span>
    </div>
  )
}
