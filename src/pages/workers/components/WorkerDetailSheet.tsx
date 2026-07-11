import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet } from '@/components/ui/sheet'
import { User as UserIcon, CreditCard, Phone, MapPin, Calendar, FileText, Image as ImageIcon, AlertCircle } from 'lucide-react'
import { workerService } from '@/services/workerService'
import { getDictLabel } from '@/store'
import { WorkerFormSheet } from './WorkerFormSheet'
import type { Worker, Subcontractor, Certificate } from '@/types'

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  active: { label: '在岗', color: 'bg-emerald-50 text-emerald-700' },
  left: { label: '离场', color: 'bg-gray-100 text-gray-600' },
  suspended: { label: '停工', color: 'bg-amber-50 text-amber-700' },
}

function maskIdCard(id?: string): string {
  if (!id) return '-'
  if (id.length <= 8) return id
  return id.slice(0, 4) + '********' + id.slice(-4)
}

interface WorkerDetailSheetProps {
  worker: Worker
  onClose: () => void
  onUpdated: () => void
  workTypeItems: { code: string; label: string }[]
  subcontractors: Subcontractor[]
}

export function WorkerDetailSheet({ worker, onClose, onUpdated, workTypeItems, subcontractors }: WorkerDetailSheetProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const st = STATUS_MAP[worker.status] ?? STATUS_MAP.active

  useEffect(() => {
    if (worker.id) {
      workerService.getCertificates(worker.id).then(setCertificates)
    }
  }, [worker.id])

  const getSubName = (id?: string) => {
    if (!id) return '-'
    return subcontractors.find(s => s.id === id)?.name ?? '-'
  }

  const handleLeave = async () => {
    if (!worker.id || !confirm('确定标记该工人为离场？')) return
    await workerService.update(worker.id, { status: 'left' })
    onUpdated()
  }

  const handleDelete = async () => {
    if (!worker.id || !confirm('确定删除该工人记录？此操作不可恢复。')) return
    await workerService.remove(worker.id)
    onUpdated()
  }

  return (
    <>
      <Sheet
        open={true}
        onClose={onClose}
        title="人员详情"
        footer={
          <>
            <Button variant="outline" className="flex-1" onClick={onClose}>关闭</Button>
            {worker.status === 'active' && (
              <Button variant="outline" className="flex-1" onClick={handleLeave}>标记离场</Button>
            )}
            <Button className="flex-1" onClick={() => setEditOpen(true)}>编辑</Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
            <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
              <UserIcon className="w-7 h-7" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-lg font-semibold text-gray-900 truncate">{worker.name}</h4>
              <p className="text-sm text-gray-500 truncate">
                {worker.workType ? getDictLabel('work_type', worker.workType) : '未设置工种'}
                <Badge className={`ml-2 ${st.color} border-0 text-xs`}>
                  {st.label}
                </Badge>
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <InfoRow icon={MapPin} label="所属分包" value={getSubName(worker.subcontractorId)} />
            <InfoRow icon={CreditCard} label="身份证号" value={maskIdCard(worker.idCard)} />
            <InfoRow icon={Phone} label="联系电话" value={worker.phone ?? '-'} />
            <InfoRow icon={UserIcon} label="性别" value={worker.gender === 'female' ? '女' : '男'} />
            <InfoRow icon={UserIcon} label="民族" value={worker.nation ?? '-'} />
            <InfoRow icon={Calendar} label="进场日期" value={worker.entryDate ?? '-'} />
            <InfoRow icon={MapPin} label="住址" value={worker.address ?? '-'} />
          </div>

          {certificates.length > 0 && (
            <div className="pt-3 border-t border-gray-100">
              <h5 className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
                <CreditCard className="w-3 h-3" /> 证件备案
              </h5>
              <div className="space-y-2">
                {certificates.map((cert) => (
                  <div key={cert.id} className="bg-gray-50 rounded-lg p-2.5 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-800">{cert.certType}</span>
                      <CertStatusBadge expiryDate={cert.expiryDate} />
                    </div>
                    {cert.certNumber && <p className="text-xs text-gray-500 mt-0.5">证号：{cert.certNumber}</p>}
                    {cert.expiryDate && <p className="text-xs text-gray-500">有效期至：{cert.expiryDate}</p>}
                    {cert.attachmentUrl && (
                      <a
                        href={cert.attachmentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 mt-1.5 text-xs text-primary hover:underline"
                      >
                        {cert.attachmentUrl.startsWith('data:application/pdf') ? <FileText className="w-3.5 h-3.5" /> : <ImageIcon className="w-3.5 h-3.5" />}
                        查看附件
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleDelete}
            className="w-full py-2 text-xs text-red-500 hover:bg-red-50 rounded"
          >
            删除该人员
          </button>
        </div>
      </Sheet>

      <WorkerFormSheet
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSuccess={() => { setEditOpen(false); onUpdated() }}
        workTypeItems={workTypeItems}
        subcontractors={subcontractors}
        worker={worker}
      />
    </>
  )
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm py-1">
      <span className="text-gray-500 text-xs flex items-center gap-1"><Icon className="w-3 h-3" />{label}</span>
      <span className="text-gray-900 text-right max-w-[60%] truncate">{value}</span>
    </div>
  )
}

function CertStatusBadge({ expiryDate }: { expiryDate?: string }) {
  if (!expiryDate) {
    return <Badge variant="secondary" className="text-[10px] h-5 font-normal">长期有效</Badge>
  }
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiry = new Date(expiryDate)
  expiry.setHours(0, 0, 0, 0)
  const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return <Badge className="text-[10px] h-5 font-normal bg-red-50 text-red-600 border-0"><AlertCircle className="w-3 h-3 mr-0.5" />已过期</Badge>
  }
  if (diffDays <= 30) {
    return <Badge className="text-[10px] h-5 font-normal bg-amber-50 text-amber-600 border-0"><AlertCircle className="w-3 h-3 mr-0.5" />{diffDays}天后过期</Badge>
  }
  return <Badge variant="secondary" className="text-[10px] h-5 font-normal">正常</Badge>
}
