import { useEffect, useState, useMemo } from 'react'
import { Search, ChevronRight, HardHat, CalendarRange, User as UserIcon, FileText, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
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
import { dangerousProjectService } from '@/services/dangerousProjectService'
import type { DangerousProject } from '@/types'

const LEVEL_MAP: Record<string, { label: string; color: string }> = {
  normal: { label: '危大工程', color: 'bg-orange-50 text-orange-700' },
  over_scale: { label: '超危大工程', color: 'bg-red-50 text-red-700' },
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
  planned: { label: '计划中', color: 'bg-gray-100 text-gray-600', icon: Clock },
  ongoing: { label: '施工中', color: 'bg-blue-50 text-blue-700', icon: AlertCircle },
  completed: { label: '已完成', color: 'bg-emerald-50 text-emerald-700', icon: CheckCircle2 },
}

export default function HazardEnginePage() {
  const [list, setList] = useState<DangerousProject[]>([])
  const [loading, setLoading] = useState(true)
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'planned' | 'ongoing' | 'completed'>('all')
  const [levelFilter, setLevelFilter] = useState<'all' | 'normal' | 'over_scale'>('all')
  const [addOpen, setAddOpen] = useState(false)
  const [editItem, setEditItem] = useState<DangerousProject | null>(null)

  const loadList = async () => {
    setLoading(true)
    const data = await dangerousProjectService.list()
    setList(data.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)))
    setLoading(false)
  }

  useEffect(() => { loadList() }, [])

  const filtered = useMemo(() => {
    let result = list
    if (statusFilter !== 'all') result = result.filter(i => i.status === statusFilter)
    if (levelFilter !== 'all') result = result.filter(i => i.level === levelFilter)
    if (searchText.trim()) {
      const q = searchText.toLowerCase()
      result = result.filter(i =>
        i.name.toLowerCase().includes(q) ||
        (i.category ?? '').toLowerCase().includes(q) ||
        (i.plan ?? '').toLowerCase().includes(q),
      )
    }
    return result
  }, [list, statusFilter, levelFilter, searchText])

  const stats = useMemo(() => ({
    total: list.length,
    ongoing: list.filter(i => i.status === 'ongoing').length,
    overScale: list.filter(i => i.level === 'over_scale').length,
    needExpert: list.filter(i => i.level === 'over_scale' && !i.expertReview).length,
  }), [list])

  return (
    <div className="pb-20">
      <div className="px-3 pt-3">
        <div className="bg-gradient-to-r from-red-600 to-rose-500 rounded-xl p-4 text-white mb-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs opacity-90">危大工程</p>
              <p className="text-2xl font-bold">{stats.total}<span className="text-sm font-normal opacity-80 ml-1">项</span></p>
            </div>
            <div className="text-right space-y-0.5">
              <p className="text-xs opacity-90">施工中 <span className="font-semibold">{stats.ongoing}</span></p>
              <p className="text-xs opacity-90">超危大 <span className="font-semibold text-red-200">{stats.overScale}</span></p>
              <p className="text-xs opacity-90">待专家论证 <span className="font-semibold text-yellow-200">{stats.needExpert}</span></p>
            </div>
          </div>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="搜索工程名称/类别..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            className="pl-8 h-9"
          />
        </div>

        <div className="flex gap-1.5 mb-2 overflow-x-auto pb-1">
          {[
            { key: 'all', label: '全部' },
            { key: 'planned', label: '计划中' },
            { key: 'ongoing', label: '施工中' },
            { key: 'completed', label: '已完成' },
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
          {[
            { key: 'all', label: '全部级别' },
            { key: 'normal', label: '危大工程' },
            { key: 'over_scale', label: '超危大工程' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setLevelFilter(tab.key as any)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                levelFilter === tab.key ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600'
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
        ) : filtered.length === 0 ? (
          <Empty title="暂无危大工程" description="点击右下角 + 按钮登记危大工程" />
        ) : (
          filtered.map(item => {
            const st = STATUS_MAP[item.status] ?? STATUS_MAP.planned
            const lv = LEVEL_MAP[item.level] ?? LEVEL_MAP.normal
            const StatusIcon = st.icon
            return (
              <Card key={item.id} className="cursor-pointer active:bg-gray-50" onClick={() => setEditItem(item)}>
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0">
                      <HardHat className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium text-gray-900 truncate">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <Badge className={`${lv.color} border-0 text-[10px] px-1.5 py-0`}>{lv.label}</Badge>
                        <Badge className={`${st.color} border-0 text-[10px] px-1.5 py-0 flex items-center gap-0.5`}>
                          <StatusIcon className="w-2.5 h-2.5" />{st.label}
                        </Badge>
                        {item.level === 'over_scale' && (
                          <Badge className={`${item.expertReview ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'} border-0 text-[10px] px-1.5 py-0`}>
                            {item.expertReview ? '已论证' : '待论证'}
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-0.5">
                        {item.category && (
                          <p className="text-xs text-gray-500">{item.category}</p>
                        )}
                        {(item.startDate || item.endDate) && (
                          <p className="text-xs text-gray-400 flex items-center gap-1">
                            <CalendarRange className="w-3 h-3" />
                            {item.startDate || '?'} ~ {item.endDate || '?'}
                          </p>
                        )}
                        {item.responsiblePersonId && (
                          <p className="text-xs text-gray-400 flex items-center gap-1">
                            <UserIcon className="w-3 h-3" />{item.responsiblePersonId}
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
  item?: DangerousProject | null
}) {
  const isEdit = !!item
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [level, setLevel] = useState<'normal' | 'over_scale'>('normal')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [plan, setPlan] = useState('')
  const [expertReview, setExpertReview] = useState(false)
  const [expertReviewDate, setExpertReviewDate] = useState('')
  const [responsiblePersonId, setResponsiblePersonId] = useState('')
  const [status, setStatus] = useState<'planned' | 'ongoing' | 'completed'>('planned')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      if (item) {
        setName(item.name); setCategory(item.category ?? '')
        setLevel(item.level); setStartDate(item.startDate ?? ''); setEndDate(item.endDate ?? '')
        setPlan(item.plan ?? ''); setExpertReview(item.expertReview ?? false)
        setExpertReviewDate(item.expertReviewDate ?? '')
        setResponsiblePersonId(item.responsiblePersonId ?? '')
        setStatus(item.status)
      } else {
        setName(''); setCategory(''); setLevel('normal'); setStartDate(''); setEndDate('')
        setPlan(''); setExpertReview(false); setExpertReviewDate('')
        setResponsiblePersonId(''); setStatus('planned')
      }
    }
  }, [open, item])

  const handleSubmit = async () => {
    if (!name.trim()) return
    setSubmitting(true)
    try {
      const data = {
        name: name.trim(),
        category: category.trim() || undefined,
        level,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        plan: plan.trim() || undefined,
        expertReview,
        expertReviewDate: expertReview && expertReviewDate ? expertReviewDate : undefined,
        responsiblePersonId: responsiblePersonId.trim() || undefined,
        status,
        projectId: getCurrentProjectId(),
      }
      if (isEdit && item?.id) {
        await dangerousProjectService.update(item.id, data)
      } else {
        await dangerousProjectService.create(data)
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
      title={isEdit ? '编辑危大工程' : '登记危大工程'}
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
        <FormField label="工程名称" required>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="如：深基坑支护工程" />
        </FormField>
        <div className="grid grid-cols-2 gap-2">
          <FormField label="工程级别" required>
            <Select value={level} onChange={e => setLevel(e.target.value as any)}>
              <option value="normal">危大工程</option>
              <option value="over_scale">超危大工程</option>
            </Select>
          </FormField>
          <FormField label="工程状态">
            <Select value={status} onChange={e => setStatus(e.target.value as any)}>
              <option value="planned">计划中</option>
              <option value="ongoing">施工中</option>
              <option value="completed">已完成</option>
            </Select>
          </FormField>
        </div>
        <FormField label="工程类别">
          <Select value={category} onChange={e => setCategory(e.target.value)}>
            <option value="">请选择</option>
            <option value="深基坑工程">深基坑工程</option>
            <option value="模板工程及支撑体系">模板工程及支撑体系</option>
            <option value="起重吊装及安装拆卸工程">起重吊装及安装拆卸工程</option>
            <option value="脚手架工程">脚手架工程</option>
            <option value="拆除爆破工程">拆除爆破工程</option>
            <option value="暗挖工程">暗挖工程</option>
            <option value="其他">其他</option>
          </Select>
        </FormField>
        <div className="grid grid-cols-2 gap-2">
          <FormField label="计划开始日期">
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </FormField>
          <FormField label="计划结束日期">
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </FormField>
        </div>
        <FormField label="专项方案">
          <Input value={plan} onChange={e => setPlan(e.target.value)} placeholder="方案名称或简要描述" />
        </FormField>
        <FormField label="责任人">
          <Input value={responsiblePersonId} onChange={e => setResponsiblePersonId(e.target.value)} placeholder="项目负责人" />
        </FormField>
        {level === 'over_scale' && (
          <div className="space-y-2 p-2.5 bg-red-50 rounded-lg border border-red-100">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={expertReview}
                onChange={e => setExpertReview(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              已通过专家论证
            </label>
            {expertReview && (
              <FormField label="论证日期">
                <Input type="date" value={expertReviewDate} onChange={e => setExpertReviewDate(e.target.value)} />
              </FormField>
            )}
          </div>
        )}
      </div>
    </Sheet>
  )
}

function DetailSheet({ item, onClose, onUpdated }: {
  item: DangerousProject
  onClose: () => void
  onUpdated: () => void
}) {
  const [editOpen, setEditOpen] = useState(false)
  const lv = LEVEL_MAP[item.level] ?? LEVEL_MAP.normal
  const st = STATUS_MAP[item.status] ?? STATUS_MAP.planned

  const handleDelete = async () => {
    if (!item.id || !confirm('确定删除该危大工程？此操作不可恢复。')) return
    await dangerousProjectService.remove(item.id)
    onUpdated()
  }

  return (
    <>
      <Sheet
        open={true}
        onClose={onClose}
        title="危大工程详情"
        footer={
          <>
            <Button variant="outline" className="flex-1" onClick={onClose}>关闭</Button>
            <Button className="flex-1" onClick={() => setEditOpen(true)}>编辑</Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
            <div className="w-14 h-14 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
              <HardHat className="w-7 h-7" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-lg font-semibold text-gray-900 truncate">{item.name}</h4>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <Badge className={`${lv.color} border-0 text-[10px]`}>{lv.label}</Badge>
                <Badge className={`${st.color} border-0 text-[10px]`}>{st.label}</Badge>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <InfoRow label="工程类别" value={item.category ?? '-'} />
            <InfoRow label="计划工期" value={(item.startDate && item.endDate) ? `${item.startDate} ~ ${item.endDate}` : '-'} />
            <InfoRow label="责任人" value={item.responsiblePersonId ?? '-'} />
            {item.level === 'over_scale' && (
              <InfoRow
                label="专家论证"
                value={item.expertReview ? `已论证（${item.expertReviewDate ?? ''}）` : '待论证'}
              />
            )}
            {item.plan && (
              <div className="pt-2 border-t border-gray-50">
                <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                  <FileText className="w-3 h-3" />专项方案
                </p>
                <p className="text-sm text-gray-800">{item.plan}</p>
              </div>
            )}
          </div>

          <button
            onClick={handleDelete}
            className="w-full py-2 text-xs text-red-500 hover:bg-red-50 rounded"
          >
            删除该危大工程
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
