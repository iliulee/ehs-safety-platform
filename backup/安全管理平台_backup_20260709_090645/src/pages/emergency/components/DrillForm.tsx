import { useEffect, useState } from 'react'
import { getCurrentProjectId } from '@/store'
import { emergencyDrillService } from '@/services/emergency.service'
import type { EmergencyDrill } from '@/types'

const TYPES = ['消防演练', '防汛演练', '坍塌救援', '触电救援', '其他']

interface Props {
  item: EmergencyDrill | null
  onClose: () => void
  onSaved: () => void
}

export function DrillForm({ item, onClose, onSaved }: Props) {
  const [title, setTitle] = useState('')
  const [drillType, setDrillType] = useState('消防演练')
  const [date, setDate] = useState('')
  const [location, setLocation] = useState('')
  const [organizer, setOrganizer] = useState('')
  const [participants, setParticipants] = useState('')
  const [content, setContent] = useState('')
  const [evaluation, setEvaluation] = useState('')
  const [issues, setIssues] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (item) {
      setTitle(item.title)
      setDrillType(item.drillType)
      setDate(item.date)
      setLocation(item.location ?? '')
      setOrganizer(item.organizer ?? '')
      setParticipants(item.participantCount != null ? String(item.participantCount) : '')
      setContent(item.content ?? '')
      setEvaluation(item.evaluation ?? '')
      setIssues(item.issues ?? '')
    } else {
      setTitle('')
      setDrillType('消防演练')
      setDate('')
      setLocation('')
      setOrganizer('')
      setParticipants('')
      setContent('')
      setEvaluation('')
      setIssues('')
    }
  }, [item])

  const handleSubmit = async () => {
    if (!title.trim() || !date) return
    setSubmitting(true)
    try {
      const data = {
        title: title.trim(),
        drillType,
        date,
        location: location.trim() || undefined,
        organizer: organizer.trim() || undefined,
        participantCount: participants ? Number(participants) : undefined,
        content: content.trim() || undefined,
        evaluation: evaluation.trim() || undefined,
        issues: issues.trim() || undefined,
        projectId: getCurrentProjectId(),
      }
      if (item?.id) {
        await emergencyDrillService.update(item.id, data)
      } else {
        await emergencyDrillService.create(data as Parameters<typeof emergencyDrillService.create>[0])
      }
      onSaved()
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!item?.id) return
    await emergencyDrillService.remove(item.id)
    onSaved()
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label className="block text-xs text-slate-500 mb-1">演练标题 <span className="text-red-400">*</span></label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="如：2024年消防应急演练" className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">演练类型</label>
        <select value={drillType} onChange={(e) => setDrillType(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500">
          {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">演练日期 <span className="text-red-400">*</span></label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">演练地点</label>
        <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="如：工地东侧空地" className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">组织者</label>
        <input value={organizer} onChange={(e) => setOrganizer(e.target.value)} placeholder="姓名" className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">参与人数</label>
        <input type="number" value={participants} onChange={(e) => setParticipants(e.target.value)} placeholder="0" className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
      </div>
      <div className="md:col-span-3">
        <label className="block text-xs text-slate-500 mb-1">演练内容</label>
        <textarea rows={2} value={content} onChange={(e) => setContent(e.target.value)} placeholder="简要描述演练内容" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none" />
      </div>
      <div className="md:col-span-3">
        <label className="block text-xs text-slate-500 mb-1">演练评估</label>
        <textarea rows={2} value={evaluation} onChange={(e) => setEvaluation(e.target.value)} placeholder="评估演练效果" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none" />
      </div>
      <div className="md:col-span-3">
        <label className="block text-xs text-slate-500 mb-1">存在问题</label>
        <textarea rows={2} value={issues} onChange={(e) => setIssues(e.target.value)} placeholder="演练中发现的问题" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none" />
      </div>
      <div className="md:col-span-3 flex justify-end gap-2">
        {item?.id && (
          <button onClick={handleDelete} className="px-4 py-2 text-sm text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50">
            删除
          </button>
        )}
        <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">取消</button>
        <button onClick={handleSubmit} disabled={submitting} className="px-4 py-2 text-sm text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed">
          {submitting ? '保存中...' : '保存'}
        </button>
      </div>
    </div>
  )
}
