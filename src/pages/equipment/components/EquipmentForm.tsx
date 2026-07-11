import { useEffect, useState } from 'react'
import { getCurrentProjectId } from '@/store'
import { equipmentService } from '@/services/equipment.service'
import type { Equipment } from '@/types'

const CATEGORIES = ['起重机械', '土方机械', '混凝土机械', '运输机械', '其他']
const STATUSES: Equipment['status'][] = ['在用', '停用', '已退场', '待检验']

interface Props {
  item: Equipment | null
  onClose: () => void
  onSaved: () => void
}

export function EquipmentForm({ item, onClose, onSaved }: Props) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState('起重机械')
  const [model, setModel] = useState('')
  const [serialNumber, setSerialNumber] = useState('')
  const [ownerUnit, setOwnerUnit] = useState('')
  const [entryDate, setEntryDate] = useState('')
  const [exitDate, setExitDate] = useState('')
  const [inspectionDate, setInspectionDate] = useState('')
  const [nextInspectionDate, setNextInspectionDate] = useState('')
  const [status, setStatus] = useState<Equipment['status']>('在用')
  const [remark, setRemark] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (item) {
      setName(item.name); setCategory(item.category); setModel(item.model ?? '')
      setSerialNumber(item.serialNumber ?? ''); setOwnerUnit(item.ownerUnit ?? '')
      setEntryDate(item.entryDate ?? ''); setExitDate(item.exitDate ?? '')
      setInspectionDate(item.inspectionDate ?? ''); setNextInspectionDate(item.nextInspectionDate ?? '')
      setStatus(item.status); setRemark(item.remark ?? '')
    } else {
      setName(''); setCategory('起重机械'); setModel(''); setSerialNumber('')
      setOwnerUnit(''); setEntryDate(''); setExitDate(''); setInspectionDate('')
      setNextInspectionDate(''); setStatus('在用'); setRemark('')
    }
  }, [item])

  const handleSubmit = async () => {
    if (!name.trim()) return
    setSubmitting(true)
    try {
      const data = {
        name: name.trim(), category, model: model.trim() || undefined,
        serialNumber: serialNumber.trim() || undefined, ownerUnit: ownerUnit.trim() || undefined,
        entryDate: entryDate || undefined, exitDate: exitDate || undefined,
        inspectionDate: inspectionDate || undefined, nextInspectionDate: nextInspectionDate || undefined,
        status, remark: remark.trim() || undefined, projectId: getCurrentProjectId(),
      }
      if (item?.id) await equipmentService.update(item.id, data)
      else await equipmentService.create(data as Parameters<typeof equipmentService.create>[0])
      onSaved()
    } finally { setSubmitting(false) }
  }

  const handleDelete = async () => {
    if (!item?.id) return
    await equipmentService.remove(item.id)
    onSaved()
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div><label className="block text-xs text-slate-500 mb-1">设备名称 <span className="text-red-400">*</span></label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="如：塔式起重机" className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" /></div>
      <div><label className="block text-xs text-slate-500 mb-1">类别</label><select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500">{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
      <div><label className="block text-xs text-slate-500 mb-1">型号</label><input value={model} onChange={(e) => setModel(e.target.value)} placeholder="如：QTZ80" className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" /></div>
      <div><label className="block text-xs text-slate-500 mb-1">出厂编号</label><input value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} placeholder="出厂编号" className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" /></div>
      <div><label className="block text-xs text-slate-500 mb-1">所属单位</label><input value={ownerUnit} onChange={(e) => setOwnerUnit(e.target.value)} placeholder="所属单位" className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" /></div>
      <div><label className="block text-xs text-slate-500 mb-1">状态</label><select value={status} onChange={(e) => setStatus(e.target.value as Equipment['status'])} className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500">{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
      <div><label className="block text-xs text-slate-500 mb-1">进场日期</label><input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" /></div>
      <div><label className="block text-xs text-slate-500 mb-1">退场日期</label><input type="date" value={exitDate} onChange={(e) => setExitDate(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" /></div>
      <div><label className="block text-xs text-slate-500 mb-1">上次检验日期</label><input type="date" value={inspectionDate} onChange={(e) => setInspectionDate(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" /></div>
      <div><label className="block text-xs text-slate-500 mb-1">下次检验日期</label><input type="date" value={nextInspectionDate} onChange={(e) => setNextInspectionDate(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" /></div>
      <div className="md:col-span-2"><label className="block text-xs text-slate-500 mb-1">备注</label><input value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="备注信息" className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" /></div>
      <div className="md:col-span-3 flex justify-end gap-2">
        {item?.id && <button onClick={handleDelete} className="px-4 py-2 text-sm text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50">删除</button>}
        <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">取消</button>
        <button onClick={handleSubmit} disabled={!name.trim() || submitting} className="px-4 py-2 text-sm text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed">{submitting ? '保存中...' : '保存'}</button>
      </div>
    </div>
  )
}