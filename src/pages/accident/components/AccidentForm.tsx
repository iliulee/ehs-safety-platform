import { useEffect, useState } from 'react'
import { getCurrentProjectId } from '@/store'
import { accidentService } from '@/services/accident.service'
import type { AccidentRecord } from '@/types'

const ACCIDENT_TYPES = ['高处坠落', '物体打击', '机械伤害', '触电', '坍塌', '火灾', '中毒', '其他']
const SEVERITIES: AccidentRecord['severity'][] = ['轻伤', '重伤', '死亡', '未遂']
const STATUSES: AccidentRecord['status'][] = ['调查中', '已结案', '已上报']

interface Props {
  item: AccidentRecord | null
  onClose: () => void
  onSaved: () => void
}

export function AccidentForm({ item, onClose, onSaved }: Props) {
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

  useEffect(() => {
    if (item) {
      setTitle(item.title); setAccidentType(item.accidentType); setSeverity(item.severity)
      setOccurrenceDate(item.occurrenceDate); setOccurrenceLocation(item.occurrenceLocation ?? '')
      setVictimName(item.victimName ?? ''); setDescription(item.description ?? '')
      setCause(item.cause ?? ''); setTreatment(item.treatment ?? '')
      setCorrectiveActions(item.correctiveActions ?? ''); setStatus(item.status)
    } else {
      setTitle(''); setAccidentType('高处坠落'); setSeverity('轻伤')
      setOccurrenceDate(''); setOccurrenceLocation(''); setVictimName('')
      setDescription(''); setCause(''); setTreatment('')
      setCorrectiveActions(''); setStatus('调查中')
    }
  }, [item])

  const handleSubmit = async () => {
    if (!title.trim() || !occurrenceDate) return
    setSubmitting(true)
    try {
      const data = {
        title: title.trim(), accidentType, severity, occurrenceDate,
        occurrenceLocation: occurrenceLocation.trim() || undefined,
        victimName: victimName.trim() || undefined,
        description: description.trim() || undefined,
        cause: cause.trim() || undefined,
        treatment: treatment.trim() || undefined,
        correctiveActions: correctiveActions.trim() || undefined,
        status, projectId: getCurrentProjectId(),
      }
      if (item?.id) await accidentService.update(item.id, data)
      else await accidentService.create(data as Parameters<typeof accidentService.create>[0])
      onSaved()
    } finally { setSubmitting(false) }
  }

  const handleDelete = async () => {
    if (!item?.id) return
    await accidentService.remove(item.id)
    onSaved()
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div><label className="block text-xs text-slate-500 mb-1">事故标题 <span className="text-red-400">*</span></label><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="如：3#塔吊高处坠落事故" className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500" /></div>
      <div><label className="block text-xs text-slate-500 mb-1">事故类型</label><select value={accidentType} onChange={(e) => setAccidentType(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500">{ACCIDENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
      <div><label className="block text-xs text-slate-500 mb-1">严重程度</label><select value={severity} onChange={(e) => setSeverity(e.target.value as AccidentRecord['severity'])} className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500">{SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
      <div><label className="block text-xs text-slate-500 mb-1">发生日期 <span className="text-red-400">*</span></label><input type="date" value={occurrenceDate} onChange={(e) => setOccurrenceDate(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500" /></div>
      <div><label className="block text-xs text-slate-500 mb-1">发生地点</label><input value={occurrenceLocation} onChange={(e) => setOccurrenceLocation(e.target.value)} placeholder="如：3#楼施工现场" className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500" /></div>
      <div><label className="block text-xs text-slate-500 mb-1">受害人姓名</label><input value={victimName} onChange={(e) => setVictimName(e.target.value)} placeholder="受害人姓名" className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500" /></div>
      <div><label className="block text-xs text-slate-500 mb-1">状态</label><select value={status} onChange={(e) => setStatus(e.target.value as AccidentRecord['status'])} className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500">{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
      <div className="md:col-span-3"><label className="block text-xs text-slate-500 mb-1">事故经过</label><textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="详细描述事故经过" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-none" /></div>
      <div className="md:col-span-3"><label className="block text-xs text-slate-500 mb-1">原因分析</label><textarea rows={2} value={cause} onChange={(e) => setCause(e.target.value)} placeholder="事故原因分析" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-none" /></div>
      <div className="md:col-span-3"><label className="block text-xs text-slate-500 mb-1">处理措施</label><textarea rows={2} value={treatment} onChange={(e) => setTreatment(e.target.value)} placeholder="已采取的处理措施" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-none" /></div>
      <div className="md:col-span-3"><label className="block text-xs text-slate-500 mb-1">整改措施</label><textarea rows={2} value={correctiveActions} onChange={(e) => setCorrectiveActions(e.target.value)} placeholder="后续整改与预防措施" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-none" /></div>
      <div className="md:col-span-3 flex justify-end gap-2">
        {item?.id && <button onClick={handleDelete} className="px-4 py-2 text-sm text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50">删除</button>}
        <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">取消</button>
        <button onClick={handleSubmit} disabled={!title.trim() || !occurrenceDate || submitting} className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed">{submitting ? '保存中...' : '保存'}</button>
      </div>
    </div>
  )
}