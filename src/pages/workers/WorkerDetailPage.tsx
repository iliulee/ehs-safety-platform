import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Edit, Loader2, Award, BookOpen, AlertTriangle, FileText, ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { workerService } from '@/services/workerService'
import { trainingService, type WorkerHistoryItem, type ExpiringAttachment } from '@/services/training.service'
import {
  TRAINING_TYPE_LABELS,
  TRAINING_SCENE_LABELS,
  ATTACHMENT_CATEGORY_LABELS,
} from '@/types'
import type { Worker, Certificate } from '@/types'
import { toast } from 'sonner'

/**
 * 工人详情页（v5.0.1）
 *
 * 三段式布局：
 *   顶部：基本信息 + 证件缩略图
 *   中部：教育/培训历史时间线（按时间倒序）
 *   底部：证书列表（带过期预警）
 */
export default function WorkerDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const [worker, setWorker] = useState<Worker | null>(null)
  const [certs, setCerts] = useState<Certificate[]>([])
  const [history, setHistory] = useState<WorkerHistoryItem[]>([])
  const [expiringCerts, setExpiringCerts] = useState<ExpiringAttachment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    ;(async () => {
      try {
        const w = await workerService.getById(id)
        if (!w) {
          toast.error('未找到该工人')
          navigate('/workers', { replace: true })
          return
        }
        setWorker(w)
        const [cs, hist] = await Promise.all([
          workerService.getCertificates(id),
          trainingService.getWorkerHistory(id),
        ])
        setCerts(cs)
        setHistory(hist)

        // 查与该工人相关的过期附件
        const allExpiring = await trainingService.getExpiringCerts(30)
        setExpiringCerts(allExpiring.filter((e) => e.attachment.entityType === 'worker' && e.attachment.entityId === id))
      } catch (err) {
        toast.error('加载失败：' + (err instanceof Error ? err.message : '未知错误'))
        navigate('/workers', { replace: true })
      } finally {
        setLoading(false)
      }
    })()
  }, [id, navigate])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    )
  }

  if (!worker) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 pt-6 flex flex-col gap-6">
        {/* 顶部 header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/workers')}
            className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" />
            返回工人列表
          </button>
          <div className="flex-1" />
          <h1 className="text-lg font-semibold text-slate-900">工人详情</h1>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/workers/${id}/edit`)}
          >
            <Edit className="w-4 h-4 mr-1" />编辑
          </Button>
        </div>

        {/* 顶部：基本信息 */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">基本信息</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <InfoItem label="姓名" value={worker.name} />
            <InfoItem label="工种" value={worker.workType} />
            <InfoItem label="状态" value={worker.status === 'active' ? '在场' : worker.status === 'left' ? '已退场' : '已暂停'} />
            <InfoItem label="身份证号" value={worker.idCard} />
            <InfoItem label="电话" value={worker.phone} />
            <InfoItem label="民族" value={worker.nation} />
            <InfoItem label="进场日期" value={worker.entryDate} />
            <InfoItem label="退场日期" value={worker.exitDate} />
            <InfoItem label="紧急联系人" value={worker.emergencyContact} />
            <InfoItem label="紧急电话" value={worker.emergencyPhone} />
            <InfoItem label="住址" value={worker.address} colSpan={3} />
            <InfoItem label="备注" value={worker.remark} colSpan={3} />
          </div>
        </div>

        {/* 顶部：证件缩略图 */}
        {certs.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              证件（{certs.length}）
            </h3>
            <div className="grid grid-cols-3 gap-4">
              {certs.map((c) => (
                <div key={c.id} className="border border-slate-200 rounded-lg p-3 text-xs">
                  <div className="font-semibold text-slate-800">{c.certType}</div>
                  {c.certNumber && <div className="text-slate-600 mt-1">编号：{c.certNumber}</div>}
                  {c.issueDate && <div className="text-slate-500">发证：{c.issueDate}</div>}
                  {c.expiryDate && (
                    <div className={isExpiringSoon(c.expiryDate) ? 'text-red-600 font-semibold' : 'text-slate-500'}>
                      到期：{c.expiryDate}
                    </div>
                  )}
                  {c.issueAuthority && <div className="text-slate-500">{c.issueAuthority}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 中部：教育/培训历史时间线 */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-teal-500" />
            教育/培训历史（{history.length}）
          </h3>
          {history.length === 0 ? (
            <div className="text-center py-8 text-sm text-slate-400">
              暂无教育/培训记录
            </div>
          ) : (
            <div className="space-y-3">
              {history.map(({ enrollment, session }) => (
                <div key={enrollment.id} className="border-l-2 border-teal-300 pl-4 py-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-medium text-slate-900">{session.title}</div>
                      <div className="text-xs text-slate-500 mt-1">
                        {session.date} · {TRAINING_TYPE_LABELS[session.type]} · {TRAINING_SCENE_LABELS[session.scene]}
                        {session.educator && ` · 主讲：${session.educator}`}
                        {session.duration && ` · ${session.duration} 分钟`}
                      </div>
                      {session.content && (
                        <div className="text-xs text-slate-600 mt-1 line-clamp-2">{session.content}</div>
                      )}
                    </div>
                    <div className="ml-4 flex flex-col items-end gap-1">
                      {enrollment.signedAt ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-green-50 text-green-700 text-xs">
                          已完成
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-700 text-xs">
                          未签字
                        </span>
                      )}
                      {enrollment.examResult && enrollment.examResult !== 'pending' && (
                        <span className={`text-xs ${
                          enrollment.examResult === 'pass' ? 'text-green-600' :
                          enrollment.examResult === 'fail' ? 'text-red-600' : 'text-slate-500'
                        }`}>
                          {enrollment.examResult === 'pass' ? '考试通过' :
                           enrollment.examResult === 'fail' ? '考试不通过' : '免考'}
                          {enrollment.examScore !== undefined && ` · ${enrollment.examScore} 分`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 底部：证书列表（带过期预警） */}
        {expiringCerts.length > 0 && (
          <div className="bg-white rounded-xl border border-red-200 p-5">
            <h3 className="text-sm font-semibold text-red-700 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              30 天内过期附件（{expiringCerts.length}）
            </h3>
            <div className="space-y-2">
              {expiringCerts.map(({ attachment, daysUntilExpiry }) => (
                <div key={attachment.id} className="flex items-center gap-3 p-3 bg-red-50 rounded-lg text-sm">
                  {attachment.category === 'physicalExamReport' ? <FileText className="w-4 h-4 text-red-500" /> : <ImageIcon className="w-4 h-4 text-red-500" />}
                  <div className="flex-1">
                    <div className="font-medium text-slate-800">{attachment.filename}</div>
                    <div className="text-xs text-slate-500">
                      {ATTACHMENT_CATEGORY_LABELS[attachment.category]} · 到期：{attachment.expiryDate}
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    daysUntilExpiry <= 7 ? 'bg-red-600 text-white' : 'bg-red-100 text-red-700'
                  }`}>
                    {daysUntilExpiry <= 0 ? '已过期' : `${daysUntilExpiry} 天后过期`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function InfoItem({ label, value, colSpan = 1 }: { label: string; value?: string; colSpan?: 1 | 2 | 3 }) {
  return (
    <div className={colSpan === 2 ? 'col-span-2' : colSpan === 3 ? 'col-span-3' : ''}>
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className="text-sm text-slate-900">{value || '—'}</div>
    </div>
  )
}

function isExpiringSoon(expiryDate: string): boolean {
  const d = new Date(expiryDate)
  if (Number.isNaN(d.getTime())) return false
  const diff = d.getTime() - Date.now()
  return diff < 30 * 24 * 60 * 60 * 1000
}
