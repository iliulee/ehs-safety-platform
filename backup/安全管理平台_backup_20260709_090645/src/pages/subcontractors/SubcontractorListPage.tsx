import { useEffect, useState, useMemo } from 'react'
import { Search, ChevronRight, Building2, Phone, User as UserIcon, FileCheck } from 'lucide-react'
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
import { subcontractorService } from '@/services/subcontractorService'
import type { Subcontractor } from '@/types'

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  cooperating: { label: '合作中', color: 'bg-emerald-50 text-emerald-700' },
  suspended: { label: '已暂停', color: 'bg-amber-50 text-amber-700' },
  terminated: { label: '已终止', color: 'bg-gray-100 text-gray-600' },
}

export default function SubcontractorListPage() {
  const [list, setList] = useState<Subcontractor[]>([])
  const [loading, setLoading] = useState(true)
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'cooperating' | 'suspended' | 'terminated'>('all')
  const [addOpen, setAddOpen] = useState(false)
  const [editItem, setEditItem] = useState<Subcontractor | null>(null)

  const loadList = async () => {
    setLoading(true)
    const data = await subcontractorService.list()
    setList(data.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)))
    setLoading(false)
  }

  useEffect(() => { loadList() }, [])

  const filtered = useMemo(() => {
    let result = list
    if (statusFilter !== 'all') result = result.filter(i => i.status === statusFilter)
    if (searchText.trim()) {
      const q = searchText.toLowerCase()
      result = result.filter(i =>
        i.name.toLowerCase().includes(q) ||
        (i.contactPerson ?? '').toLowerCase().includes(q) ||
        (i.contactPhone ?? '').includes(q),
      )
    }
    return result
  }, [list, statusFilter, searchText])

  const activeCount = list.filter(i => i.status === 'cooperating').length

  return (
    <div className="pb-20">
      <div className="px-3 pt-3">
        <div className="bg-gradient-to-r from-violet-600 to-indigo-500 rounded-xl p-4 text-white mb-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs opacity-90">合作中分包</p>
              <p className="text-2xl font-bold">{activeCount}<span className="text-sm font-normal opacity-80 ml-1">家</span></p>
            </div>
            <div className="text-right">
              <p className="text-xs opacity-90">总登记</p>
              <p className="text-lg font-semibold">{list.length}<span className="text-xs opacity-80 ml-0.5">家</span></p>
            </div>
          </div>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="搜索单位名称/联系人/电话..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            className="pl-8 h-9"
          />
        </div>

        <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
          {[
            { key: 'all', label: '全部' },
            { key: 'cooperating', label: '合作中' },
            { key: 'suspended', label: '已暂停' },
            { key: 'terminated', label: '已终止' },
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
      </div>

      <div className="px-3 space-y-2">
        {loading ? (
          <div className="py-12 text-center text-sm text-gray-400">加载中...</div>
        ) : filtered.length === 0 ? (
          <Empty title="暂无分包单位" description="点击右下角 + 按钮添加分包单位" />
        ) : (
          filtered.map(item => {
            const st = STATUS_MAP[item.status] ?? STATUS_MAP.cooperating
            return (
              <Card key={item.id} className="cursor-pointer active:bg-gray-50" onClick={() => setEditItem(item)}>
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium text-gray-900 truncate">{item.name}</span>
                        <Badge className={`${st.color} border-0 text-xs flex-shrink-0`}>{st.label}</Badge>
                      </div>
                      <div className="space-y-0.5">
                        {item.scopeOfWork && (
                          <p className="text-xs text-gray-500 truncate">{item.scopeOfWork}</p>
                        )}
                        {item.contactPerson && (
                          <p className="text-xs text-gray-400 flex items-center gap-1">
                            <UserIcon className="w-3 h-3" />{item.contactPerson}
                            {item.contactPhone && <span className="ml-1 flex items-center gap-0.5"><Phone className="w-3 h-3" />{item.contactPhone}</span>}
                          </p>
                        )}
                        {item.qualificationExpiry && (
                          <p className="text-xs text-gray-400 flex items-center gap-1">
                            <FileCheck className="w-3 h-3" />资质到期：{item.qualificationExpiry}
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
  item?: Subcontractor | null
}) {
  const isEdit = !!item
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [qualifier, setQualifier] = useState('')
  const [contactPerson, setContactPerson] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [scopeOfWork, setScopeOfWork] = useState('')
  const [qualificationExpiry, setQualificationExpiry] = useState('')
  const [status, setStatus] = useState<'cooperating' | 'suspended' | 'terminated'>('cooperating')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      if (item) {
        setName(item.name); setCode(item.code ?? ''); setQualifier(item.qualifier ?? '')
        setContactPerson(item.contactPerson); setContactPhone(item.contactPhone)
        setScopeOfWork(item.scopeOfWork ?? ''); setQualificationExpiry(item.qualificationExpiry ?? '')
        setStatus(item.status)
      } else {
        setName(''); setCode(''); setQualifier('')
        setContactPerson(''); setContactPhone(''); setScopeOfWork('')
        setQualificationExpiry(''); setStatus('cooperating')
      }
    }
  }, [open, item])

  const handleSubmit = async () => {
    if (!name.trim() || !contactPerson.trim() || !contactPhone.trim()) return
    setSubmitting(true)
    try {
      const data = {
        name: name.trim(),
        code: code.trim() || undefined,
        qualifier: qualifier.trim() || undefined,
        contactPerson: contactPerson.trim(),
        contactPhone: contactPhone.trim(),
        scopeOfWork: scopeOfWork.trim() || undefined,
        qualificationExpiry: qualificationExpiry || undefined,
        status,
        projectId: getCurrentProjectId(),
      }
      if (isEdit && item?.id) {
        await subcontractorService.update(item.id, data)
      } else {
        await subcontractorService.create(data)
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
      title={isEdit ? '编辑分包单位' : '新增分包单位'}
      footer={
        <>
          <Button variant="outline" className="flex-1" onClick={onClose}>取消</Button>
          <Button className="flex-1" onClick={handleSubmit} disabled={!name.trim() || !contactPerson.trim() || !contactPhone.trim() || submitting}>
            {submitting ? '提交中...' : '保存'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <FormField label="单位名称" required>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="请输入单位全称" />
        </FormField>
        <div className="grid grid-cols-2 gap-2">
          <FormField label="统一社会信用代码">
            <Input value={code} onChange={e => setCode(e.target.value)} placeholder="18位代码" />
          </FormField>
          <FormField label="资质等级">
            <Input value={qualifier} onChange={e => setQualifier(e.target.value)} placeholder="如：施工总承包一级" />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <FormField label="联系人" required>
            <Input value={contactPerson} onChange={e => setContactPerson(e.target.value)} placeholder="负责人姓名" />
          </FormField>
          <FormField label="联系电话" required>
            <Input value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="手机号码" />
          </FormField>
        </div>
        <FormField label="承包范围">
          <Input value={scopeOfWork} onChange={e => setScopeOfWork(e.target.value)} placeholder="如：主体结构工程" />
        </FormField>
        <FormField label="资质到期日">
          <Input type="date" value={qualificationExpiry} onChange={e => setQualificationExpiry(e.target.value)} />
        </FormField>
        {isEdit && (
          <FormField label="状态">
            <Select value={status} onChange={e => setStatus(e.target.value as any)}>
              <option value="cooperating">合作中</option>
              <option value="suspended">已暂停</option>
              <option value="terminated">已终止</option>
            </Select>
          </FormField>
        )}
      </div>
    </Sheet>
  )
}

function DetailSheet({ item, onClose, onUpdated }: {
  item: Subcontractor
  onClose: () => void
  onUpdated: () => void
}) {
  const [editOpen, setEditOpen] = useState(false)

  const handleDelete = async () => {
    if (!item.id || !confirm('确定删除该分包单位？此操作不可恢复。')) return
    await subcontractorService.remove(item.id)
    onUpdated()
  }

  return (
    <>
      <Sheet
        open={true}
        onClose={onClose}
        title="分包单位详情"
        footer={
          <>
            <Button variant="outline" className="flex-1" onClick={onClose}>关闭</Button>
            <Button className="flex-1" onClick={() => setEditOpen(true)}>编辑</Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
            <div className="w-14 h-14 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
              <Building2 className="w-7 h-7" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-lg font-semibold text-gray-900 truncate">{item.name}</h4>
              <p className="text-sm text-gray-500 flex items-center gap-2">
                {item.qualifier || '未设置资质'}
                <Badge className={`${STATUS_MAP[item.status]?.color ?? 'bg-gray-100 text-gray-600'} border-0 text-xs`}>
                  {STATUS_MAP[item.status]?.label ?? '合作中'}
                </Badge>
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <InfoRow label="信用代码" value={item.code ?? '-'} />
            <InfoRow label="联系人" value={item.contactPerson} />
            <InfoRow label="联系电话" value={item.contactPhone} />
            <InfoRow label="承包范围" value={item.scopeOfWork ?? '-'} />
            <InfoRow label="资质等级" value={item.qualifier ?? '-'} />
            <InfoRow label="资质到期" value={item.qualificationExpiry ?? '-'} />
          </div>

          <button
            onClick={handleDelete}
            className="w-full py-2 text-xs text-red-500 hover:bg-red-50 rounded"
          >
            删除该分包单位
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
