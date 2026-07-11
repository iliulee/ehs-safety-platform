import { useEffect, useState, useMemo } from 'react'
import { Search, ChevronRight, AlertTriangle, MapPin } from 'lucide-react'
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
import { hazardSourceService } from '@/services/hazardSourceService'
import type { HazardSource } from '@/types'
import { LEVEL_LABELS } from '@/types/enums'

const RISK_COLORS: Record<number, { bg: string; text: string; border: string }> = {
  1: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  2: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  3: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  4: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  controlled: { label: '已管控', color: 'bg-emerald-50 text-emerald-700' },
  monitoring: { label: '监控中', color: 'bg-blue-50 text-blue-700' },
  uncontrolled: { label: '未管控', color: 'bg-red-50 text-red-700' },
}

export default function HazardIdentificationPage() {
  const [list, setList] = useState<HazardSource[]>([])
  const [loading, setLoading] = useState(true)
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'controlled' | 'monitoring' | 'uncontrolled'>('all')
  const [levelFilter, setLevelFilter] = useState<'all' | 1 | 2 | 3 | 4>('all')
  const [addOpen, setAddOpen] = useState(false)
  const [editItem, setEditItem] = useState<HazardSource | null>(null)

  const loadList = async () => {
    setLoading(true)
    const data = await hazardSourceService.list()
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
        (i.location ?? '').toLowerCase().includes(q),
      )
    }
    return result
  }, [list, statusFilter, levelFilter, searchText])

  const stats = useMemo(() => ({
    total: list.length,
    uncontrolled: list.filter(i => i.status === 'uncontrolled').length,
    level1: list.filter(i => i.level === 1).length,
    level2: list.filter(i => i.level === 2).length,
  }), [list])

  return (
    <div className="pb-20">
      <div className="px-3 pt-3">
        <div className="bg-gradient-to-r from-amber-600 to-orange-500 rounded-xl p-4 text-white mb-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs opacity-90">危险源总数</p>
              <p className="text-2xl font-bold">{stats.total}<span className="text-sm font-normal opacity-80 ml-1">项</span></p>
            </div>
            <div className="text-right space-y-0.5">
              <p className="text-xs opacity-90">重大风险 <span className="font-semibold text-red-200">{stats.level1}</span></p>
              <p className="text-xs opacity-90">较大风险 <span className="font-semibold text-orange-200">{stats.level2}</span></p>
              <p className="text-xs opacity-90">未管控 <span className="font-semibold text-yellow-200">{stats.uncontrolled}</span></p>
            </div>
          </div>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="搜索危险源名称/部位/类别..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            className="pl-8 h-9"
          />
        </div>

        <div className="flex gap-1.5 mb-2 overflow-x-auto pb-1">
          {[
            { key: 'all', label: '全部' },
            { key: 'controlled', label: '已管控' },
            { key: 'monitoring', label: '监控中' },
            { key: 'uncontrolled', label: '未管控' },
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
            { key: 'all', label: '所有风险' },
            { key: 1, label: '一级' },
            { key: 2, label: '二级' },
            { key: 3, label: '三级' },
            { key: 4, label: '四级' },
          ].map(tab => (
            <button
              key={String(tab.key)}
              onClick={() => setLevelFilter(tab.key as any)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                levelFilter === tab.key ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600'
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
          <Empty title="暂无危险源记录" description="点击右下角 + 按钮登记危险源" />
        ) : (
          filtered.map(item => {
            const st = STATUS_MAP[item.status] ?? STATUS_MAP.monitoring
            const rc = RISK_COLORS[item.level] ?? RISK_COLORS[4]
            return (
              <Card key={item.id} className="cursor-pointer active:bg-gray-50" onClick={() => setEditItem(item)}>
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg ${rc.bg} flex items-center justify-center flex-shrink-0`}>
                      <AlertTriangle className={`w-5 h-5 ${rc.text}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium text-gray-900 truncate">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <Badge className={`${rc.bg} ${rc.text} ${rc.border} border text-[10px] px-1.5 py-0`}>
                          {LEVEL_LABELS[item.level]}
                        </Badge>
                        <Badge className={`${st.color} border-0 text-[10px] px-1.5 py-0`}>{st.label}</Badge>
                      </div>
                      <div className="space-y-0.5">
                        {item.location && (
                          <p className="text-xs text-gray-400 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />{item.location}
                          </p>
                        )}
                        {item.riskFactor && (
                          <p className="text-xs text-gray-500 truncate">风险因素：{item.riskFactor}</p>
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
  item?: HazardSource | null
}) {
  const isEdit = !!item
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [level, setLevel] = useState<1 | 2 | 3 | 4>(3)
  const [riskFactor, setRiskFactor] = useState('')
  const [controlMeasures, setControlMeasures] = useState('')
  const [location, setLocation] = useState('')
  const [responsiblePersonId, setResponsiblePersonId] = useState('')
  const [reviewCycle, setReviewCycle] = useState('每月')
  const [status, setStatus] = useState<'controlled' | 'monitoring' | 'uncontrolled'>('uncontrolled')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      if (item) {
        setName(item.name); setCategory(item.category ?? '')
        setLevel(item.level); setRiskFactor(item.riskFactor ?? '')
        setControlMeasures(item.controlMeasures ?? ''); setLocation(item.location ?? '')
        setResponsiblePersonId(item.responsiblePersonId ?? '')
        setReviewCycle(item.reviewCycle ?? '每月'); setStatus(item.status)
      } else {
        setName(''); setCategory(''); setLevel(3); setRiskFactor('')
        setControlMeasures(''); setLocation(''); setResponsiblePersonId('')
        setReviewCycle('每月'); setStatus('uncontrolled')
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
        riskFactor: riskFactor.trim() || undefined,
        controlMeasures: controlMeasures.trim() || undefined,
        location: location.trim() || undefined,
        responsiblePersonId: responsiblePersonId.trim() || undefined,
        reviewCycle: reviewCycle.trim() || undefined,
        status,
        projectId: getCurrentProjectId(),
      }
      if (isEdit && item?.id) {
        await hazardSourceService.update(item.id, data)
      } else {
        await hazardSourceService.create(data)
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
      title={isEdit ? '编辑危险源' : '登记危险源'}
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
        <FormField label="危险源名称" required>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="如：高处坠落、触电、物体打击" />
        </FormField>
        <div className="grid grid-cols-2 gap-2">
          <FormField label="风险等级" required>
            <Select value={String(level)} onChange={e => setLevel(Number(e.target.value) as 1 | 2 | 3 | 4)}>
              <option value="1">一级（重大风险）</option>
              <option value="2">二级（较大风险）</option>
              <option value="3">三级（一般风险）</option>
              <option value="4">四级（低风险）</option>
            </Select>
          </FormField>
          <FormField label="管控状态">
            <Select value={status} onChange={e => setStatus(e.target.value as any)}>
              <option value="uncontrolled">未管控</option>
              <option value="monitoring">监控中</option>
              <option value="controlled">已管控</option>
            </Select>
          </FormField>
        </div>
        <FormField label="危险源类别">
          <Input value={category} onChange={e => setCategory(e.target.value)} placeholder="如：高处作业、临时用电" />
        </FormField>
        <FormField label="存在部位/地点">
          <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="如：3号楼5层临边" />
        </FormField>
        <FormField label="风险因素/可能导致事故">
          <Input value={riskFactor} onChange={e => setRiskFactor(e.target.value)} placeholder="描述风险因素和可能后果" />
        </FormField>
        <FormField label="管控措施">
          <textarea
            value={controlMeasures}
            onChange={e => setControlMeasures(e.target.value)}
            placeholder="描述具体的管控措施..."
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-h-[72px] resize-none"
          />
        </FormField>
        <div className="grid grid-cols-2 gap-2">
          <FormField label="责任人">
            <Input value={responsiblePersonId} onChange={e => setResponsiblePersonId(e.target.value)} placeholder="负责人姓名" />
          </FormField>
          <FormField label="排查周期">
            <Select value={reviewCycle} onChange={e => setReviewCycle(e.target.value)}>
              <option value="每日">每日</option>
              <option value="每周">每周</option>
              <option value="每半月">每半月</option>
              <option value="每月">每月</option>
            </Select>
          </FormField>
        </div>
      </div>
    </Sheet>
  )
}

function DetailSheet({ item, onClose, onUpdated }: {
  item: HazardSource
  onClose: () => void
  onUpdated: () => void
}) {
  const [editOpen, setEditOpen] = useState(false)
  const rc = RISK_COLORS[item.level] ?? RISK_COLORS[4]
  const st = STATUS_MAP[item.status] ?? STATUS_MAP.monitoring

  const handleDelete = async () => {
    if (!item.id || !confirm('确定删除该危险源？此操作不可恢复。')) return
    await hazardSourceService.remove(item.id)
    onUpdated()
  }

  return (
    <>
      <Sheet
        open={true}
        onClose={onClose}
        title="危险源详情"
        footer={
          <>
            <Button variant="outline" className="flex-1" onClick={onClose}>关闭</Button>
            <Button className="flex-1" onClick={() => setEditOpen(true)}>编辑</Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
            <div className={`w-14 h-14 rounded-lg ${rc.bg} flex items-center justify-center`}>
              <AlertTriangle className={`w-7 h-7 ${rc.text}`} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-lg font-semibold text-gray-900 truncate">{item.name}</h4>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <Badge className={`${rc.bg} ${rc.text} ${rc.border} border text-[10px]`}>
                  {LEVEL_LABELS[item.level]}
                </Badge>
                <Badge className={`${st.color} border-0 text-[10px]`}>{st.label}</Badge>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <InfoRow label="危险源类别" value={item.category ?? '-'} />
            <InfoRow label="存在部位" value={item.location ?? '-'} />
            <InfoRow label="责任人" value={item.responsiblePersonId ?? '-'} />
            <InfoRow label="排查周期" value={item.reviewCycle ?? '-'} />
            {item.riskFactor && (
              <div className="pt-2 border-t border-gray-50">
                <p className="text-xs text-gray-500 mb-1">风险因素</p>
                <p className="text-sm text-gray-800">{item.riskFactor}</p>
              </div>
            )}
            {item.controlMeasures && (
              <div className="pt-2 border-t border-gray-50">
                <p className="text-xs text-gray-500 mb-1">管控措施</p>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{item.controlMeasures}</p>
              </div>
            )}
          </div>

          <button
            onClick={handleDelete}
            className="w-full py-2 text-xs text-red-500 hover:bg-red-50 rounded"
          >
            删除该危险源
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
