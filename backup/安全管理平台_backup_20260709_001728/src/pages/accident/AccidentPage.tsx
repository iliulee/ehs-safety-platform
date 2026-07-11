import { useEffect, useState, useMemo } from 'react'
import { AlertOctagon, Plus, Search, Edit3, Trash2, X } from 'lucide-react'
import { accidentService } from '@/services/accident.service'
import { getCurrentProjectId } from '@/store'
import type { AccidentRecord } from '@/types'

const ACCIDENT_TYPES = ['高处坠落', '物体打击', '机械伤害', '触电', '坍塌', '火灾', '中毒', '其他']
const SEVERITIES: AccidentRecord['severity'][] = ['轻伤', '重伤', '死亡', '未遂']
const STATUSES: AccidentRecord['status'][] = ['调查中', '已结案', '已上报']

function statusBadge(status: AccidentRecord['status']) {
  const map: Record<string, string> = {
    '调查中': 'bg-amber-50 text-amber-700',
    '已结案': 'bg-emerald-50 text-emerald-700',
    '已上报': 'bg-blue-50 text-blue-700',
  }
  return <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${map[status]}`}>{status}</span>
}

function severityBadge(severity: AccidentRecord['severity']) {
  const map: Record<string, string> = {
    '轻伤': 'bg-amber-50 text-amber-700',
    '重伤': 'bg-orange-50 text-orange-700',
    '死亡': 'bg-red-50 text-red-700',
    '未遂': 'bg-slate-100 text-slate-500',
  }
  return <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${map[severity]}`}>{severity}</span>
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-'
  return dateStr.slice(0, 10)
}

export default function AccidentPage() {
  const [records, setRecords] = useState<AccidentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchText, setSearchText] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<AccidentRecord | null>(null)

  const [title, setTitle] = useState('')
  const [accidentType, setAccidentType] = useState('高处坠落')
  const [severity, setSeverity] = useState<AccidentRecord['severity']>('轻伤')
  const [occurrenceDate, setOccurrenceDate] = useState('')
  const [occurrenceLocation, setOccurrenceLocation] = useState('')
  const [victimName, setVictimName] = useState('')
  const [description, setDescription] = useState('')
  const [cause, setCause] = useState('')
  const [treatment, setTreatment] = useState('')
  const [correctiveActions, setCorrectiveActions] = useState('')
  const [status, setStatus] = useState<AccidentRecord['status']>('调查中')
  const [submitting, setSubmitting] = useState(false)

  const loadData = async () => {
    setLoading(true)
    const list = await accidentService.list()
    setRecords(list.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)))
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const filteredRecords = useMemo(() => {
    if (!searchText.trim()) return records
    const q = searchText.toLowerCase()
    return records.filter(r =>
      r.title.toLowerCase().includes(q) ||
      (r.accidentType ?? '').toLowerCase().includes(q) ||
      (r.victimName ?? '').toLowerCase().includes(q) ||
      (r.occurrenceLocation ?? '').toLowerCase().includes(q)
    )
  }, [records, searchText])

  const stats = useMemo(() => {
    return {
      total: records.length,
      nearMiss: records.filter(r => r.severity === '未遂').length,
      injury: records.filter(r => r.severity === '轻伤' || r.severity === '重伤').length,
      closed: records.filter(r => r.status === '已结案').length,
    }
  }, [records])

  const resetForm = () => {
    setTitle(''); setAccidentType('高处坠落'); setSeverity('轻伤')
    setOccurrenceDate(''); setOccurrenceLocation(''); setVictimName('')
    setDescription(''); setCause(''); setTreatment('')
    setCorrectiveActions(''); setStatus('调查中')
  }

  const openAdd = () => {
    resetForm()
    setEditingItem(null)
    setShowForm(true)
  }

  const openEdit = (item: AccidentRecord) => {
    setTitle(item.title); setAccidentType(item.accidentType)
    setSeverity(item.severity); setOccurrenceDate(item.occurrenceDate)
    setOccurrenceLocation(item.occurrenceLocation ?? '')
    setVictimName(item.victimName ?? '')
    setDescription(item.description ?? ''); setCause(item.cause ?? '')
    setTreatment(item.treatment ?? ''); setCorrectiveActions(item.correctiveActions ?? '')
    setStatus(item.status)
    setEditingItem(item)
    setShowForm(true)
  }

  const handleSubmit = async () => {
    if (!title.trim() || !occurrenceDate) return
    setSubmitting(true)
    try {
      const data = {
        title: title.trim(), accidentType, severity,
        occurrenceDate, occurrenceLocation: occurrenceLocation.trim() || undefined,
        victimName: victimName.trim() || undefined,
        description: description.trim() || undefined,
        cause: cause.trim() || undefined,
        treatment: treatment.trim() || undefined,
        correctiveActions: correctiveActions.trim() || undefined,
        status, projectId: getCurrentProjectId(),
      }
      if (editingItem?.id) {
        await accidentService.update(editingItem.id, data)
      } else {
        await accidentService.create(data as Parameters<typeof accidentService.create>[0])
      }
      setShowForm(false)
      loadData()
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (item: AccidentRecord) => {
    if (!item.id || !confirm(`确定删除"${item.title}"？`)) return
    await accidentService.remove(item.id)
    loadData()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">事故管理</h1>
          <p className="text-sm text-slate-500 mt-1">记录和跟踪安全事故、未遂事件、工伤处理</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium">
          <Plus className="w-4 h-4" />
          上报事故
        </button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: '事故总数', value: stats.total, color: 'text-red-600' },
          { label: '未遂事件', value: stats.nearMiss, color: 'text-amber-600' },
          { label: '工伤记录', value: stats.injury, color: 'text-orange-600' },
          { label: '已结案', value: stats.closed, color: 'text-green-600' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-xs text-slate-500">{stat.label}</p>
            <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-800">{editingItem ? '编辑事故' : '上报事故'}</h3>
            <button onClick={() => setShowForm(false)} className="p-1 hover:bg-slate-100 rounded"><X className="w-4 h-4 text-slate-400" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1">事故标题 <span className="text-red-400">*</span></label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="如：3#塔吊高处坠落事故" className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">事故类型</label>
              <select value={accidentType} onChange={e => setAccidentType(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500">
                {ACCIDENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">严重程度</label>
              <select value={severity} onChange={e => setSeverity(e.target.value as AccidentRecord['severity'])} className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500">
                {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">发生日期 <span className="text-red-400">*</span></label>
              <input type="date" value={occurrenceDate} onChange={e => setOccurrenceDate(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">发生地点</label>
              <input value={occurrenceLocation} onChange={e => setOccurrenceLocation(e.target.value)} placeholder="如：3#楼施工现场" className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">受害人姓名</label>
              <input value={victimName} onChange={e => setVictimName(e.target.value)} placeholder="受害人姓名" className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">状态</label>
              <select value={status} onChange={e => setStatus(e.target.value as AccidentRecord['status'])} className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500">
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs text-slate-500 mb-1">事故经过</label>
              <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="详细描述事故经过" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-none" />
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs text-slate-500 mb-1">原因分析</label>
              <textarea rows={2} value={cause} onChange={e => setCause(e.target.value)} placeholder="事故原因分析" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-none" />
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs text-slate-500 mb-1">处理措施</label>
              <textarea rows={2} value={treatment} onChange={e => setTreatment(e.target.value)} placeholder="已采取的处理措施" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-none" />
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs text-slate-500 mb-1">整改措施</label>
              <textarea rows={2} value={correctiveActions} onChange={e => setCorrectiveActions(e.target.value)} placeholder="后续整改与预防措施" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-none" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">取消</button>
            <button onClick={handleSubmit} disabled={!title.trim() || !occurrenceDate || submitting} className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed">
              {submitting ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="搜索事故标题、类型、受害人..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">事故标题</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">事故类型</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">发生日期</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">受害人</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">严重程度</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">状态</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-slate-500">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-sm text-slate-400">加载中...</td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
                      <AlertOctagon className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="text-sm text-slate-400">暂无事故记录</p>
                    <p className="text-xs text-slate-300 mt-1">安全第一，预防为主</p>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((item) => (
                  <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-3 font-medium text-slate-800">{item.title}</td>
                    <td className="px-6 py-3 text-slate-600">{item.accidentType}</td>
                    <td className="px-6 py-3 text-slate-600">{formatDate(item.occurrenceDate)}</td>
                    <td className="px-6 py-3 text-slate-600">{item.victimName || '-'}</td>
                    <td className="px-6 py-3">{severityBadge(item.severity)}</td>
                    <td className="px-6 py-3">{statusBadge(item.status)}</td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(item)} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-teal-600"><Edit3 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(item)} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}