import { useEffect, useState } from 'react'
import { getCurrentProjectId } from '@/store'
import { emergencyPlanService } from '@/services/emergency.service'
import type { EmergencyPlan } from '@/types'

const CATEGORIES = ['综合预案', '专项预案', '现场处置方案']

interface Props {
  item: EmergencyPlan | null
  onClose: () => void
  onSaved: () => void
}

export function PlanForm({ item, onClose, onSaved }: Props) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState('综合预案')
  const [scope, setScope] = useState('')
  const [version, setVersion] = useState('')
  const [issueDate, setIssueDate] = useState('')
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (item) {
      setName(item.name)
      setCategory(item.category)
      setScope(item.applicableScope ?? '')
      setVersion(item.version ?? '')
      setIssueDate(item.issueDate ?? '')
      setContent(item.content ?? '')
    } else {
      setName('')
      setCategory('综合预案')
      setScope('')
      setVersion('')
      setIssueDate('')
      setContent('')
    }
  }, [item])

  const handleSubmit = async () => {
    if (!name.trim()) return
    setSubmitting(true)
    try {
      const data = {
        name: name.trim(),
        category,
        applicableScope: scope.trim() || undefined,
        version: version.trim() || undefined,
        issueDate: issueDate || undefined,
        content: content.trim() || undefined,
        projectId: getCurrentProjectId(),
      }
      if (item?.id) {
        await emergencyPlanService.update(item.id, data)
      } else {
        await emergencyPlanService.create(data as Parameters<typeof emergencyPlanService.create>[0])
      }
      onSaved()
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!item?.id) return
    await emergencyPlanService.remove(item.id)
    onSaved()
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label className="block text-xs text-slate-500 mb-1">预案名称 <span className="text-red-400">*</span></label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="如：防汛应急预案" className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">类别</label>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500">
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">版本号</label>
        <input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="如：V2.0" className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">发布日期</label>
        <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
      </div>
      <div className="md:col-span-2">
        <label className="block text-xs text-slate-500 mb-1">适用范围</label>
        <input value={scope} onChange={(e) => setScope(e.target.value)} placeholder="如：适用于本项目施工现场" className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
      </div>
      <div className="md:col-span-3">
        <label className="block text-xs text-slate-500 mb-1">预案内容</label>
        <textarea rows={3} value={content} onChange={(e) => setContent(e.target.value)} placeholder="简要描述预案内容" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none" />
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
