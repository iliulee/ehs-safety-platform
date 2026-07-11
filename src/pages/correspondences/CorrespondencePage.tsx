import { useEffect, useState, useMemo } from 'react'
import { Search, ChevronRight, ArrowDownToLine, ArrowUpFromLine, FileText, Calendar, Building2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Sheet } from '@/components/ui/sheet'
import { FormField } from '@/components/ui/form-field'
import { Textarea } from '@/components/ui/textarea'
import { Empty } from '@/components/ui/empty'
import { FloatingButton } from '@/components/ui/floating-button'
import { getCurrentProjectId } from '@/store'
import { correspondenceService } from '@/services/correspondenceService'
import type { Correspondence, CorrespondenceDirection, CorrespondenceStatus } from '@/types'

const DIRECTION_MAP: Record<CorrespondenceDirection, { label: string; icon: typeof ArrowDownToLine; color: string; bgColor: string }> = {
  incoming: { label: '收文', icon: ArrowDownToLine, color: 'text-sky-600', bgColor: 'bg-sky-50' },
  outgoing: { label: '发文', icon: ArrowUpFromLine, color: 'text-violet-600', bgColor: 'bg-violet-50' },
}

const STATUS_MAP: Record<CorrespondenceStatus, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'bg-gray-100 text-gray-600' },
  sent: { label: '已发送', color: 'bg-blue-50 text-blue-700' },
  received: { label: '已接收', color: 'bg-emerald-50 text-emerald-700' },
  replied: { label: '已回复', color: 'bg-purple-50 text-purple-700' },
  archived: { label: '已归档', color: 'bg-gray-100 text-gray-500' },
}

const CORRESPONDENCE_TYPES = ['通知', '函件', '报告', '批复', '联系单', '整改单', '其他']

export default function CorrespondencePage() {
  const [list, setList] = useState<Correspondence[]>([])
  const [loading, setLoading] = useState(true)
  const [searchText, setSearchText] = useState('')
  const [directionFilter, setDirectionFilter] = useState<'all' | CorrespondenceDirection>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | CorrespondenceStatus>('all')
  const [addOpen, setAddOpen] = useState(false)
  const [editItem, setEditItem] = useState<Correspondence | null>(null)

  const loadList = async () => {
    setLoading(true)
    const data = await correspondenceService.list()
    setList(data.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)))
    setLoading(false)
  }

  useEffect(() => { loadList() }, [])

  const filtered = useMemo(() => {
    let result = list
    if (directionFilter !== 'all') result = result.filter(i => i.direction === directionFilter)
    if (statusFilter !== 'all') result = result.filter(i => i.status === statusFilter)
    if (searchText.trim()) {
      const q = searchText.toLowerCase()
      result = result.filter(i =>
        i.title.toLowerCase().includes(q) ||
        (i.docNumber ?? '').toLowerCase().includes(q) ||
        (i.from ?? '').toLowerCase().includes(q) ||
        (i.to ?? '').toLowerCase().includes(q),
      )
    }
    return result
  }, [list, directionFilter, statusFilter, searchText])

  const incomingCount = list.filter(i => i.direction === 'incoming').length
  const outgoingCount = list.filter(i => i.direction === 'outgoing').length

  return (
    <div className="pb-20">
      <div className="px-3 pt-3">
        <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl p-4 text-white mb-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs opacity-90">文件总数</p>
              <p className="text-2xl font-bold">{list.length}<span className="text-sm font-normal opacity-80 ml-1">份</span></p>
            </div>
            <div className="flex gap-4">
              <div className="text-right">
                <p className="text-xs opacity-90">收文</p>
                <p className="text-lg font-semibold">{incomingCount}<span className="text-xs opacity-80 ml-0.5">份</span></p>
              </div>
              <div className="text-right">
                <p className="text-xs opacity-90">发文</p>
                <p className="text-lg font-semibold">{outgoingCount}<span className="text-xs opacity-80 ml-0.5">份</span></p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="搜索标题/文号/单位..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            className="pl-8 h-9"
          />
        </div>

        <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
          {[
            { key: 'all', label: '全部' },
            { key: 'incoming', label: '收文' },
            { key: 'outgoing', label: '发文' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setDirectionFilter(tab.key as any)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                directionFilter === tab.key ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
          {[
            { key: 'all', label: '全部状态' },
            { key: 'draft', label: '草稿' },
            { key: 'sent', label: '已发送' },
            { key: 'received', label: '已接收' },
            { key: 'replied', label: '已回复' },
            { key: 'archived', label: '已归档' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key as any)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                statusFilter === tab.key ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-600'
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
          <Empty title="暂无收发文记录" description="点击右下角 + 按钮添加收发文" />
        ) : (
          filtered.map(item => {
            const dir = DIRECTION_MAP[item.direction]
            const st = STATUS_MAP[item.status]
            const DirIcon = dir.icon
            const unitLabel = item.direction === 'incoming' ? '来文单位' : '发往单位'
            const unitValue = item.direction === 'incoming' ? item.from : item.to
            return (
              <Card key={item.id} className="cursor-pointer active:bg-gray-50" onClick={() => setEditItem(item)}>
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg ${dir.bgColor} ${dir.color} flex items-center justify-center flex-shrink-0`}>
                      <DirIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium text-gray-900 truncate">{item.title}</span>
                        <Badge className={`${st.color} border-0 text-xs flex-shrink-0`}>{st.label}</Badge>
                      </div>
                      <div className="space-y-0.5">
                        {item.docNumber && (
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <FileText className="w-3 h-3" />{item.docNumber}
                            {item.type && <span className="ml-1">· {item.type}</span>}
                          </p>
                        )}
                        {unitValue && (
                          <p className="text-xs text-gray-400 flex items-center gap-1">
                            <Building2 className="w-3 h-3" />{unitLabel}：{unitValue}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />{item.date}
                        </p>
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
  item?: Correspondence | null
}) {
  const isEdit = !!item
  const [direction, setDirection] = useState<CorrespondenceDirection>('incoming')
  const [title, setTitle] = useState('')
  const [docNumber, setDocNumber] = useState('')
  const [type, setType] = useState('')
  const [date, setDate] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [content, setContent] = useState('')
  const [status, setStatus] = useState<CorrespondenceStatus>('draft')
  const [replyTo, setReplyTo] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      if (item) {
        setDirection(item.direction)
        setTitle(item.title)
        setDocNumber(item.docNumber ?? '')
        setType(item.type ?? '')
        setDate(item.date)
        setFrom(item.from ?? '')
        setTo(item.to ?? '')
        setContent(item.content ?? '')
        setStatus(item.status)
        setReplyTo(item.replyTo ?? '')
      } else {
        setDirection('incoming')
        setTitle('')
        setDocNumber('')
        setType('')
        setDate(new Date().toISOString().split('T')[0])
        setFrom('')
        setTo('')
        setContent('')
        setStatus('draft')
        setReplyTo('')
      }
    }
  }, [open, item])

  const handleSubmit = async () => {
    if (!title.trim() || !date) return
    setSubmitting(true)
    try {
      const data = {
        direction,
        title: title.trim(),
        docNumber: docNumber.trim() || undefined,
        type: type || undefined,
        date,
        from: from.trim() || undefined,
        to: to.trim() || undefined,
        content: content.trim() || undefined,
        status,
        replyTo: replyTo.trim() || undefined,
        projectId: getCurrentProjectId(),
      }
      if (isEdit && item?.id) {
        await correspondenceService.update(item.id, data)
      } else {
        await correspondenceService.create(data)
      }
      onSuccess()
    } finally {
      setSubmitting(false)
    }
  }

  const fromLabel = direction === 'incoming' ? '来文单位' : '发文单位'
  const toLabel = direction === 'incoming' ? '收文单位' : '接收单位'

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={isEdit ? '编辑收发文' : '新增收发文'}
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
        <FormField label="方向" required>
          <Select value={direction} onChange={e => setDirection(e.target.value as CorrespondenceDirection)}>
            <option value="incoming">收文</option>
            <option value="outgoing">发文</option>
          </Select>
        </FormField>
        <FormField label="文件标题" required>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="请输入文件标题" />
        </FormField>
        <div className="grid grid-cols-2 gap-2">
          <FormField label="文号">
            <Input value={docNumber} onChange={e => setDocNumber(e.target.value)} placeholder="如：XXX〔2026〕1号" />
          </FormField>
          <FormField label="文件类型">
            <Select value={type} onChange={e => setType(e.target.value)}>
              <option value="">请选择</option>
              {CORRESPONDENCE_TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>
          </FormField>
        </div>
        <FormField label="日期" required>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </FormField>
        <div className="grid grid-cols-2 gap-2">
          <FormField label={fromLabel}>
            <Input value={from} onChange={e => setFrom(e.target.value)} placeholder={direction === 'incoming' ? '来文单位名称' : '发文单位名称'} />
          </FormField>
          <FormField label={toLabel}>
            <Input value={to} onChange={e => setTo(e.target.value)} placeholder={direction === 'incoming' ? '收文单位名称' : '接收单位名称'} />
          </FormField>
        </div>
        <FormField label="内容摘要">
          <Textarea value={content} onChange={e => setContent(e.target.value)} placeholder="请输入文件内容摘要" rows={3} />
        </FormField>
        <FormField label="状态">
          <Select value={status} onChange={e => setStatus(e.target.value as CorrespondenceStatus)}>
            <option value="draft">草稿</option>
            <option value="sent">已发送</option>
            <option value="received">已接收</option>
            <option value="replied">已回复</option>
            <option value="archived">已归档</option>
          </Select>
        </FormField>
        {isEdit && (
          <FormField label="回复文号">
            <Input value={replyTo} onChange={e => setReplyTo(e.target.value)} placeholder="关联回复的文号" />
          </FormField>
        )}
      </div>
    </Sheet>
  )
}

function DetailSheet({ item, onClose, onUpdated }: {
  item: Correspondence
  onClose: () => void
  onUpdated: () => void
}) {
  const [editOpen, setEditOpen] = useState(false)

  const handleDelete = async () => {
    if (!item.id || !confirm('确定删除该收发文记录？此操作不可恢复。')) return
    await correspondenceService.remove(item.id)
    onUpdated()
  }

  const dir = DIRECTION_MAP[item.direction]
  const st = STATUS_MAP[item.status]
  const DirIcon = dir.icon
  const fromLabel = item.direction === 'incoming' ? '来文单位' : '发文单位'
  const toLabel = item.direction === 'incoming' ? '收文单位' : '接收单位'

  return (
    <>
      <Sheet
        open={true}
        onClose={onClose}
        title="收发文详情"
        footer={
          <>
            <Button variant="outline" className="flex-1" onClick={onClose}>关闭</Button>
            <Button className="flex-1" onClick={() => setEditOpen(true)}>编辑</Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
            <div className={`w-14 h-14 rounded-lg ${dir.bgColor} ${dir.color} flex items-center justify-center`}>
              <DirIcon className="w-7 h-7" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-lg font-semibold text-gray-900 truncate">{item.title}</h4>
              <p className="text-sm text-gray-500 flex items-center gap-2">
                {dir.label}
                <Badge className={`${st.color} border-0 text-xs`}>{st.label}</Badge>
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <InfoRow label="文号" value={item.docNumber ?? '-'} />
            <InfoRow label="文件类型" value={item.type ?? '-'} />
            <InfoRow label="日期" value={item.date} />
            <InfoRow label={fromLabel} value={item.from ?? '-'} />
            <InfoRow label={toLabel} value={item.to ?? '-'} />
            {item.replyTo && <InfoRow label="回复文号" value={item.replyTo} />}
          </div>

          {item.content && (
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-1.5">内容摘要</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{item.content}</p>
            </div>
          )}

          <button
            onClick={handleDelete}
            className="w-full py-2 text-xs text-red-500 hover:bg-red-50 rounded"
          >
            删除该记录
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
