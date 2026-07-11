import { useEffect, useState, useMemo } from 'react'
import { Search, ChevronRight, CheckCircle2, XCircle, AlertCircle, Calendar, User as UserIcon, FileCheck, ClipboardList } from 'lucide-react'
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
import { acceptanceService } from '@/services/acceptanceService'
import type { Acceptance, AcceptanceResult } from '@/types'

const ACCEPTANCE_TYPES: Record<string, { label: string; icon: any }> = {
  concealed: { label: '隐蔽工程', icon: FileCheck },
  subdivision: { label: '分部分项', icon: ClipboardList },
  formwork: { label: '模板支撑', icon: FileCheck },
  scaffold: { label: '脚手架', icon: FileCheck },
  edge_protection: { label: '临边防护', icon: FileCheck },
  temp_electric: { label: '临时用电', icon: FileCheck },
  fire_facility: { label: '消防设施', icon: FileCheck },
  machinery: { label: '机械设备', icon: FileCheck },
  other: { label: '其他', icon: FileCheck },
}

const RESULT_MAP: Record<AcceptanceResult, { label: string; bg: string; text: string; border: string; icon: any }> = {
  pass: { label: '合格', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: CheckCircle2 },
  fail: { label: '不合格', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: XCircle },
  conditional: { label: '附条件合格', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: AlertCircle },
}

type ResultFilter = 'all' | AcceptanceResult

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-'
  return dateStr.slice(0, 10)
}

export default function AcceptanceListPage() {
  const [list, setList] = useState<Acceptance[]>([])
  const [loading, setLoading] = useState(true)
  const [searchText, setSearchText] = useState('')
  const [resultFilter, setResultFilter] = useState<ResultFilter>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [addOpen, setAddOpen] = useState(false)
  const [editItem, setEditItem] = useState<Acceptance | null>(null)

  const loadList = async () => {
    setLoading(true)
    const data = await acceptanceService.list()
    setList(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()))
    setLoading(false)
  }

  useEffect(() => { loadList() }, [])

  const filtered = useMemo(() => {
    let result = list
    if (resultFilter !== 'all') result = result.filter(i => i.result === resultFilter)
    if (typeFilter !== 'all') result = result.filter(i => i.type === typeFilter)
    if (searchText.trim()) {
      const q = searchText.toLowerCase()
      result = result.filter(i =>
        (i.part ?? '').toLowerCase().includes(q) ||
        (i.content ?? '').toLowerCase().includes(q) ||
        (i.type ? ACCEPTANCE_TYPES[i.type]?.label ?? '' : '').toLowerCase().includes(q),
      )
    }
    return result
  }, [list, resultFilter, typeFilter, searchText])

  const stats = useMemo(() => ({
    total: list.length,
    pass: list.filter(i => i.result === 'pass').length,
    fail: list.filter(i => i.result === 'fail').length,
  }), [list])

  return (
    <div className="pb-20">
      <div className="px-3 pt-3">
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl p-4 text-white mb-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs opacity-90">验收总次数</p>
              <p className="text-2xl font-bold">{stats.total}<span className="text-sm font-normal opacity-80 ml-1">次</span></p>
            </div>
            <div className="text-right space-y-0.5">
              <p className="text-xs opacity-90">合格 <span className="font-semibold text-emerald-200">{stats.pass}</span></p>
              <p className="text-xs opacity-90">不合格待整改 <span className="font-semibold text-red-200">{stats.fail}</span></p>
            </div>
          </div>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="搜索验收部位/内容/类型..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            className="pl-8 h-9"
          />
        </div>

        <div className="flex gap-1.5 mb-2 overflow-x-auto pb-1">
          {[
            { key: 'all', label: '全部' },
            { key: 'pass', label: '合格' },
            { key: 'fail', label: '不合格' },
            { key: 'conditional', label: '附条件合格' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setResultFilter(tab.key as ResultFilter)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                resultFilter === tab.key ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'
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
              typeFilter === 'all' ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            全部类型
          </button>
          {Object.entries(ACCEPTANCE_TYPES).map(([key, t]) => (
            <button
              key={key}
              onClick={() => setTypeFilter(key)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                typeFilter === key ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600'
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
          <Empty title="暂无验收记录" description="点击右下角 + 按钮新增验收" />
        ) : (
          filtered.map(item => {
            const rt = RESULT_MAP[item.result]
            const typeInfo = item.type ? ACCEPTANCE_TYPES[item.type] : null
            const ResultIcon = rt.icon
            return (
              <Card key={item.id} className="cursor-pointer active:bg-gray-50" onClick={() => setEditItem(item)}>
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg ${rt.bg} ${rt.text} flex items-center justify-center flex-shrink-0`}>
                      <ResultIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {typeInfo?.label ?? '验收'}
                        </span>
                        <Badge className={`${rt.bg} ${rt.text} border-0 text-[10px] px-1.5 py-0`}>
                          {rt.label}
                        </Badge>
                      </div>
                      {item.part && (
                        <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                          <FileCheck className="w-3 h-3" />{item.part}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span className="flex items-center gap-0.5">
                          <Calendar className="w-3 h-3" />
                          {formatDate(item.date)}
                        </span>
                        {item.acceptorIds && item.acceptorIds.length > 0 && (
                          <span className="flex items-center gap-0.5">
                            <UserIcon className="w-3 h-3" />
                            {item.acceptorIds.join('、')}
                          </span>
                        )}
                      </div>
                      {item.issues && item.result === 'fail' && (
                        <p className="text-xs text-red-600 mt-1 line-clamp-2">
                          问题：{item.issues}
                        </p>
                      )}
                      {item.rectifyDeadline && item.result === 'fail' && (
                        <p className="text-xs text-red-500 mt-0.5 flex items-center gap-0.5">
                          <AlertCircle className="w-3 h-3" />
                          整改期限：{formatDate(item.rectifyDeadline)}
                        </p>
                      )}
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
  item?: Acceptance | null
}) {
  const isEdit = !!item
  const [type, setType] = useState<string>('concealed')
  const [part, setPart] = useState('')
  const [date, setDate] = useState('')
  const [content, setContent] = useState('')
  const [acceptors, setAcceptors] = useState('')
  const [result, setResult] = useState<AcceptanceResult>('pass')
  const [issues, setIssues] = useState('')
  const [rectifyDeadline, setRectifyDeadline] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      if (item) {
        setType(item.type ?? 'other')
        setPart(item.part ?? '')
        setDate(item.date?.slice(0, 10) ?? '')
        setContent(item.content ?? '')
        setAcceptors(item.acceptorIds?.join('、') ?? '')
        setResult(item.result)
        setIssues(item.issues ?? '')
        setRectifyDeadline(item.rectifyDeadline?.slice(0, 10) ?? '')
      } else {
        const today = new Date().toISOString().slice(0, 10)
        setType('concealed')
        setPart('')
        setDate(today)
        setContent('')
        setAcceptors('')
        setResult('pass')
        setIssues('')
        setRectifyDeadline('')
      }
    }
  }, [open, item])

  const handleSubmit = async () => {
    if (!part.trim() || !date) return
    setSubmitting(true)
    try {
      const acceptorIds = acceptors.trim() 
        ? acceptors.split(/[、,，\s]+/).filter(Boolean)
        : undefined
      const data = {
        type: type || undefined,
        part: part.trim(),
        date,
        content: content.trim() || undefined,
        acceptorIds,
        result,
        issues: result === 'fail' ? issues.trim() || undefined : undefined,
        rectifyDeadline: result === 'fail' ? rectifyDeadline || undefined : undefined,
        projectId: getCurrentProjectId(),
      }
      if (isEdit && item?.id) {
        await acceptanceService.update(item.id, data)
      } else {
        await acceptanceService.create(data)
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
      title={isEdit ? '编辑验收' : '新增验收'}
      footer={
        <>
          <Button variant="outline" className="flex-1" onClick={onClose}>取消</Button>
          <Button className="flex-1" onClick={handleSubmit} disabled={!part.trim() || !date || submitting}>
            {submitting ? '提交中...' : '保存'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <FormField label="验收类型" required>
          <Select value={type} onChange={e => setType(e.target.value)}>
            {Object.entries(ACCEPTANCE_TYPES).map(([k, t]) => (
              <option key={k} value={k}>{t.label}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="验收部位" required>
          <Input value={part} onChange={e => setPart(e.target.value)} placeholder="如：3号楼5层梁板" />
        </FormField>
        <FormField label="验收日期" required>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </FormField>
        <FormField label="验收人员">
          <Input value={acceptors} onChange={e => setAcceptors(e.target.value)} placeholder="多人用顿号、逗号或空格分隔" />
        </FormField>
        <FormField label="验收内容">
          <Textarea rows={3} value={content} onChange={e => setContent(e.target.value)} placeholder="验收内容详情" />
        </FormField>
        <FormField label="验收结果" required>
          <div className="flex gap-3">
            {(['pass', 'fail', 'conditional'] as AcceptanceResult[]).map(r => {
              const rt = RESULT_MAP[r]
              const RIcon = rt.icon
              return (
                <label
                  key={r}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border-2 cursor-pointer transition-colors ${
                    result === r
                      ? `${rt.border} ${rt.bg} ${rt.text}`
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="result"
                    value={r}
                    checked={result === r}
                    onChange={() => setResult(r)}
                    className="sr-only"
                  />
                  <RIcon className="w-4 h-4" />
                  <span className="text-xs font-medium">{rt.label}</span>
                </label>
              )
            })}
          </div>
        </FormField>
        {result === 'fail' && (
          <>
            <FormField label="存在问题">
              <Textarea rows={3} value={issues} onChange={e => setIssues(e.target.value)} placeholder="描述验收中发现的问题" />
            </FormField>
            <FormField label="整改期限">
              <Input type="date" value={rectifyDeadline} onChange={e => setRectifyDeadline(e.target.value)} />
            </FormField>
          </>
        )}
      </div>
    </Sheet>
  )
}

function DetailSheet({ item, onClose, onUpdated }: {
  item: Acceptance
  onClose: () => void
  onUpdated: () => void
}) {
  const [editOpen, setEditOpen] = useState(false)
  const rt = RESULT_MAP[item.result]
  const typeInfo = item.type ? ACCEPTANCE_TYPES[item.type] : null
  const ResultIcon = rt.icon

  const handleDelete = async () => {
    if (!item.id || !confirm('确定删除该验收记录？此操作不可恢复。')) return
    await acceptanceService.remove(item.id)
    onUpdated()
  }

  return (
    <>
      <Sheet
        open={true}
        onClose={onClose}
        title="验收详情"
        footer={
          <>
            <Button variant="outline" className="flex-1" onClick={onClose}>关闭</Button>
            <Button variant="outline" className="flex-1 text-red-600" onClick={handleDelete}>删除</Button>
            <Button className="flex-1" onClick={() => setEditOpen(true)}>编辑</Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
            <div className={`w-14 h-14 rounded-lg ${rt.bg} ${rt.text} flex items-center justify-center`}>
              <ResultIcon className="w-7 h-7" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-lg font-semibold text-gray-900 truncate">
                {typeInfo?.label ?? '验收记录'}
              </h4>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <Badge className={`${rt.bg} ${rt.text} border-0 text-[10px]`}>{rt.label}</Badge>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <InfoRow label="验收部位" value={item.part ?? '-'} />
            <InfoRow label="验收日期" value={formatDate(item.date)} />
            <InfoRow label="验收人员" value={item.acceptorIds?.join('、') ?? '-'} />
            {item.content && (
              <div className="pt-2 border-t border-gray-50">
                <p className="text-xs text-gray-500 mb-1">验收内容</p>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{item.content}</p>
              </div>
            )}
            {item.issues && (
              <div className="pt-2 border-t border-gray-50 bg-red-50 rounded-lg p-3 -mx-1">
                <p className="text-xs text-red-600 mb-1 font-medium">存在问题</p>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{item.issues}</p>
              </div>
            )}
            {item.rectifyDeadline && (
              <div className="pt-2 border-t border-gray-50">
                <p className="text-xs text-gray-500 mb-1">整改期限</p>
                <p className="text-sm text-red-600 font-medium">{formatDate(item.rectifyDeadline)}</p>
              </div>
            )}
          </div>
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
