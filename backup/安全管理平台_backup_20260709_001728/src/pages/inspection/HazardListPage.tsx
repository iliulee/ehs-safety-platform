import { useEffect, useState, useMemo } from 'react'
import { Clock, CheckCircle2, Search, ChevronRight, Calendar, MapPin } from 'lucide-react'
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
import { useAppStore, getDictLabel, getCurrentProjectId } from '@/store'
import { hazardService } from '@/services/hazardService'
import type { Hazard } from '@/types'

type StatusFilter = 'all' | 'pending' | 'rectifying' | 'reviewing' | 'closed'

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待整改' },
  { key: 'rectifying', label: '整改中' },
  { key: 'reviewing', label: '复查中' },
  { key: 'closed', label: '已闭环' },
]

const LEVEL_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  general: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: '一般隐患' },
  major: { bg: 'bg-amber-50', text: 'text-amber-700', label: '较大隐患' },
  serious: { bg: 'bg-red-50', text: 'text-red-700', label: '重大隐患' },
}

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-red-50', text: 'text-red-700', label: '待整改' },
  rectifying: { bg: 'bg-amber-50', text: 'text-amber-700', label: '整改中' },
  reviewing: { bg: 'bg-blue-50', text: 'text-blue-700', label: '复查中' },
  closed: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: '已闭环' },
  overdue: { bg: 'bg-red-100', text: 'text-red-800', label: '已逾期' },
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-'
  return dateStr.slice(0, 10)
}

function isOverdue(h: Hazard): boolean {
  if (h.status === 'closed') return false
  if (!h.rectifyDeadline) return false
  return new Date(h.rectifyDeadline) < new Date(new Date().toISOString().slice(0, 10))
}

export default function HazardListPage() {
  const [hazards, setHazards] = useState<Hazard[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [searchText, setSearchText] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [detailHazard, setDetailHazard] = useState<Hazard | null>(null)
  const [rectifyHazard, setRectifyHazard] = useState<Hazard | null>(null)
  const [reviewHazard, setReviewHazard] = useState<Hazard | null>(null)

  const { getDictItems } = useAppStore()
  const categoryItems = getDictItems('hazard_category')

  const loadHazards = async () => {
    setLoading(true)
    const list = await hazardService.list()
    setHazards(list.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)))
    setLoading(false)
  }

  useEffect(() => { loadHazards() }, [])

  const filteredHazards = useMemo(() => {
    let list = hazards
    if (statusFilter !== 'all') {
      list = list.filter(h => {
        if (statusFilter === 'pending' && isOverdue(h)) return true
        return h.status === statusFilter
      })
    }
    if (searchText.trim()) {
      const q = searchText.toLowerCase()
      list = list.filter(h =>
        h.title.toLowerCase().includes(q) ||
        (h.location ?? '').toLowerCase().includes(q) ||
        (h.description ?? '').toLowerCase().includes(q),
      )
    }
    return list
  }, [hazards, statusFilter, searchText])

  const counts = useMemo(() => ({
    all: hazards.length,
    pending: hazards.filter(h => h.status === 'pending' || isOverdue(h)).length,
    rectifying: hazards.filter(h => h.status === 'rectifying').length,
    reviewing: hazards.filter(h => h.status === 'reviewing').length,
    closed: hazards.filter(h => h.status === 'closed').length,
  }), [hazards])

  return (
    <div className="pb-20">
      <div className="px-3 pt-3">
        <div className="relative mb-3">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="搜索隐患标题/部位..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            className="pl-8 h-9"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 mb-3 -mx-0.5 px-0.5 scrollbar-hide">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                statusFilter === tab.key
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label}
              {counts[tab.key] > 0 && (
                <span className={`ml-1 ${statusFilter === tab.key ? 'text-white/80' : 'text-gray-400'}`}>
                  {counts[tab.key]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="px-3 space-y-2">
        {loading ? (
          <div className="py-12 text-center text-sm text-gray-400">加载中...</div>
        ) : filteredHazards.length === 0 ? (
          <Empty
            title={statusFilter === 'all' ? '暂无隐患记录' : '该状态下暂无隐患'}
            description="点击右下角 + 按钮新增隐患"
          />
        ) : (
          filteredHazards.map(h => {
            const effectiveStatus = isOverdue(h) ? 'overdue' : h.status
            const statusStyle = STATUS_COLORS[effectiveStatus]
            const levelStyle = LEVEL_COLORS[h.level] ?? LEVEL_COLORS.general
            return (
              <Card key={h.id} className="cursor-pointer active:bg-gray-50" onClick={() => setDetailHazard(h)}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h4 className="text-sm font-medium text-gray-900 flex-1 line-clamp-1">{h.title}</h4>
                    <Badge className={`${levelStyle.bg} ${levelStyle.text} border-0 text-xs flex-shrink-0`}>
                      {levelStyle.label}
                    </Badge>
                  </div>
                  {h.location && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate">{h.location}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                    <div className="flex items-center gap-2">
                      <Badge className={`${statusStyle.bg} ${statusStyle.text} border-0 text-xs`}>
                        {statusStyle.label}
                      </Badge>
                      {h.rectifyDeadline && (
                        <span className="flex items-center gap-0.5 text-xs text-gray-400">
                          <Calendar className="w-3 h-3" />
                          {formatDate(h.rectifyDeadline)}
                        </span>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      <FloatingButton onClick={() => setAddOpen(true)} />

      <AddHazardSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={() => { setAddOpen(false); loadHazards() }}
        categoryItems={categoryItems}
      />

      {detailHazard && (
        <HazardDetailSheet
          hazard={detailHazard}
          onClose={() => setDetailHazard(null)}
          onRectify={() => { setRectifyHazard(detailHazard); setDetailHazard(null) }}
          onReview={() => { setReviewHazard(detailHazard); setDetailHazard(null) }}
          onDeleted={() => { setDetailHazard(null); loadHazards() }}
        />
      )}

      {rectifyHazard && (
        <RectifySheet
          hazard={rectifyHazard}
          onClose={() => setRectifyHazard(null)}
          onSuccess={() => { setRectifyHazard(null); loadHazards() }}
        />
      )}

      {reviewHazard && (
        <ReviewSheet
          hazard={reviewHazard}
          onClose={() => setReviewHazard(null)}
          onSuccess={() => { setReviewHazard(null); loadHazards() }}
        />
      )}
    </div>
  )
}

function AddHazardSheet({ open, onClose, onSuccess, categoryItems }: {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  categoryItems: { code: string; label: string }[]
}) {
  const [title, setTitle] = useState('')
  const [level, setLevel] = useState<'general' | 'major' | 'serious'>('general')
  const [category, setCategory] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [deadline, setDeadline] = useState('')
  const [rectifyPerson, setRectifyPerson] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setTitle(''); setLevel('general'); setCategory(''); setLocation('')
      setDescription(''); setDeadline(''); setRectifyPerson('')
    }
  }, [open])

  const handleSubmit = async () => {
    if (!title.trim()) return
    setSubmitting(true)
    try {
      await hazardService.create({
        title: title.trim(),
        level,
        category: category || undefined,
        location: location.trim() || undefined,
        description: description.trim() || undefined,
        status: 'pending',
        projectId: getCurrentProjectId(),
        rectifyDeadline: deadline || undefined,
        rectifyPersonId: rectifyPerson.trim() || undefined,
        source: 'manual',
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
      title="新增隐患"
      footer={
        <>
          <Button variant="outline" className="flex-1" onClick={onClose}>取消</Button>
          <Button className="flex-1" onClick={handleSubmit} disabled={!title.trim() || submitting}>
            {submitting ? '提交中...' : '提交'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <FormField label="隐患标题" required>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="简要描述隐患内容" />
        </FormField>
        <FormField label="隐患级别" required>
          <Select value={level} onChange={e => setLevel(e.target.value as 'general' | 'major' | 'serious')}>
            <option value="general">一般隐患</option>
            <option value="major">较大隐患</option>
            <option value="serious">重大隐患</option>
          </Select>
        </FormField>
        <FormField label="隐患分类">
          <Select value={category} onChange={e => setCategory(e.target.value)}>
            <option value="">请选择</option>
            {categoryItems.map(c => (
              <option key={c.code} value={c.code}>{c.label}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="隐患部位">
          <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="如：3号楼东侧脚手架" />
        </FormField>
        <FormField label="整改期限">
          <Input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
        </FormField>
        <FormField label="整改责任人">
          <Input value={rectifyPerson} onChange={e => setRectifyPerson(e.target.value)} placeholder="责任人姓名" />
        </FormField>
        <FormField label="隐患描述">
          <Textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="详细描述隐患情况" />
        </FormField>
      </div>
    </Sheet>
  )
}

function HazardDetailSheet({ hazard, onClose, onRectify, onReview, onDeleted }: {
  hazard: Hazard
  onClose: () => void
  onRectify: () => void
  onReview: () => void
  onDeleted: () => void
}) {
  const effectiveStatus = isOverdue(hazard) ? 'overdue' : hazard.status
  const statusStyle = STATUS_COLORS[effectiveStatus]
  const levelStyle = LEVEL_COLORS[hazard.level] ?? LEVEL_COLORS.general

  const handleDelete = async () => {
    if (!confirm('确定删除该隐患记录？')) return
    if (hazard.id) await hazardService.remove(hazard.id)
    onDeleted()
  }

  return (
    <Sheet
      open={true}
      onClose={onClose}
      title="隐患详情"
      footer={
        <>
          {(hazard.status === 'pending' || isOverdue(hazard)) && (
            <Button className="flex-1 bg-amber-600 hover:bg-amber-700" onClick={onRectify}>
              <Clock className="w-4 h-4 mr-1" /> 整改
            </Button>
          )}
          {hazard.status === 'rectifying' && (
            <Button className="flex-1" onClick={onReview}>
              <CheckCircle2 className="w-4 h-4 mr-1" /> 复查
            </Button>
          )}
          {hazard.status === 'closed' && (
            <Button variant="outline" className="flex-1" onClick={handleDelete}>删除</Button>
          )}
          <Button variant="outline" className="flex-1" onClick={onClose}>关闭</Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge className={`${levelStyle.bg} ${levelStyle.text} border-0`}>{levelStyle.label}</Badge>
          <Badge className={`${statusStyle.bg} ${statusStyle.text} border-0`}>{statusStyle.label}</Badge>
        </div>
        <div>
          <h4 className="text-base font-semibold text-gray-900 mb-1">{hazard.title}</h4>
          {hazard.location && <p className="text-xs text-gray-500 flex items-center gap-1"><MapPin className="w-3 h-3" />{hazard.location}</p>}
        </div>

        {hazard.description && (
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">隐患描述</p>
            <p className="text-sm text-gray-800">{hazard.description}</p>
          </div>
        )}

        {hazard.category && (
          <InfoRow label="隐患分类" value={getDictLabel('hazard_category', hazard.category)} />
        )}
        {hazard.rectifyDeadline && (
          <InfoRow label="整改期限" value={formatDate(hazard.rectifyDeadline)} />
        )}
        {hazard.rectifyPersonId && (
          <InfoRow label="整改责任人" value={hazard.rectifyPersonId} />
        )}

        {hazard.rectifyMeasure && (
          <div className="bg-amber-50 rounded-lg p-3">
            <p className="text-xs text-amber-700 mb-1 font-medium">整改措施（{formatDate(hazard.rectifyDate)}）</p>
            <p className="text-sm text-gray-800">{hazard.rectifyMeasure}</p>
          </div>
        )}

        {hazard.reviewComment && (
          <div className="bg-emerald-50 rounded-lg p-3">
            <p className="text-xs text-emerald-700 mb-1 font-medium">复查意见（{formatDate(hazard.reviewDate)}）</p>
            <p className="text-sm text-gray-800">{hazard.reviewComment}</p>
          </div>
        )}

        <p className="text-xs text-gray-400">记录时间：{formatDate(new Date(hazard.createdAt ?? Date.now()).toISOString())}</p>
      </div>
    </Sheet>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500 text-xs">{label}</span>
      <span className="text-gray-900">{value}</span>
    </div>
  )
}

function RectifySheet({ hazard, onClose, onSuccess }: {
  hazard: Hazard
  onClose: () => void
  onSuccess: () => void
}) {
  const [measure, setMeasure] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (hazard) setMeasure(hazard.rectifyMeasure ?? '')
  }, [hazard])

  const handleSubmit = async () => {
    if (!measure.trim() || !hazard.id) return
    setSubmitting(true)
    try {
      await hazardService.update(hazard.id, {
        rectifyMeasure: measure.trim(),
        rectifyDate: new Date().toISOString().slice(0, 10),
        status: 'reviewing',
      })
      onSuccess()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Sheet
      open={true}
      onClose={onClose}
      title="整改反馈"
      footer={
        <>
          <Button variant="outline" className="flex-1" onClick={onClose}>取消</Button>
          <Button className="flex-1" onClick={handleSubmit} disabled={!measure.trim() || submitting}>
            {submitting ? '提交中...' : '提交整改'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="bg-amber-50 rounded-lg p-3">
          <p className="text-xs text-amber-600 mb-1">隐患内容</p>
          <p className="text-sm text-gray-800">{hazard.title}</p>
        </div>
        <FormField label="整改措施" required>
          <Textarea rows={4} value={measure} onChange={e => setMeasure(e.target.value)} placeholder="描述整改措施和完成情况" />
        </FormField>
      </div>
    </Sheet>
  )
}

function ReviewSheet({ hazard, onClose, onSuccess }: {
  hazard: Hazard
  onClose: () => void
  onSuccess: () => void
}) {
  const [comment, setComment] = useState('')
  const [result, setResult] = useState<'pass' | 'fail'>('pass')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!hazard.id) return
    setSubmitting(true)
    try {
      await hazardService.update(hazard.id, {
        reviewComment: comment.trim() || (result === 'pass' ? '复查合格，同意闭环' : '复查不合格，需重新整改'),
        reviewDate: new Date().toISOString().slice(0, 10),
        status: result === 'pass' ? 'closed' : 'rectifying',
      })
      onSuccess()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Sheet
      open={true}
      onClose={onClose}
      title="复查验收"
      footer={
        <>
          <Button variant="outline" className="flex-1" onClick={onClose}>取消</Button>
          <Button className={result === 'pass' ? 'flex-1 bg-emerald-600 hover:bg-emerald-700' : 'flex-1 bg-amber-600 hover:bg-amber-700'} onClick={handleSubmit} disabled={submitting}>
            {submitting ? '提交中...' : result === 'pass' ? '复查通过' : '复查不通过'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="bg-blue-50 rounded-lg p-3">
          <p className="text-xs text-blue-600 mb-1">整改措施</p>
          <p className="text-sm text-gray-800">{hazard.rectifyMeasure ?? '无'}</p>
        </div>
        <FormField label="复查结果" required>
          <Select value={result} onChange={e => setResult(e.target.value as 'pass' | 'fail')}>
            <option value="pass">复查合格，同意闭环</option>
            <option value="fail">复查不合格，需重新整改</option>
          </Select>
        </FormField>
        <FormField label="复查意见">
          <Textarea rows={3} value={comment} onChange={e => setComment(e.target.value)} placeholder="填写复查意见（可选）" />
        </FormField>
      </div>
    </Sheet>
  )
}
