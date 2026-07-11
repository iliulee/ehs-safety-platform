import { useState, useMemo } from 'react'
import {
  FileText, FileSpreadsheet, Download,
  AlertTriangle, Users, GraduationCap, FileBadge,
  BookOpen, ChevronRight,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { hazardService } from '@/services/hazardService'
import { workerService } from '@/services/workerService'
import { educationService } from '@/services/educationService'
import { trainingService } from '@/services/trainingService'
import { dailyLogService } from '@/services/dailyLogService'
import { useAppStore, getDictLabel } from '@/store'
import type { Hazard, Worker, EducationRecord, TrainingRecord, DailyLog } from '@/types'

interface ReportTemplate {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  color: string
  category: string
}

const REPORT_TEMPLATES: ReportTemplate[] = [
  { id: 'hazard-ledger', name: '隐患排查整改台账', description: '所有隐患记录及整改情况', icon: <AlertTriangle className="w-4 h-4" />, color: 'bg-red-50 text-red-600', category: '安全检查' },
  { id: 'worker-ledger', name: '人员花名册', description: '在场工人登记信息', icon: <Users className="w-4 h-4" />, color: 'bg-blue-50 text-blue-600', category: '人员管理' },
  { id: 'education-ledger', name: '安全教育台账', description: '三级安全教育记录', icon: <GraduationCap className="w-4 h-4" />, color: 'bg-indigo-50 text-indigo-600', category: '教育培训' },
  { id: 'training-ledger', name: '安全培训台账', description: '安全技能培训记录', icon: <BookOpen className="w-4 h-4" />, color: 'bg-cyan-50 text-cyan-600', category: '教育培训' },
  { id: 'daily-log', name: '安全日志汇总', description: '每日安全日志记录', icon: <FileText className="w-4 h-4" />, color: 'bg-emerald-50 text-emerald-600', category: '日常管理' },
  { id: 'permit-ledger', name: '作业许可台账', description: '危险作业审批记录', icon: <FileBadge className="w-4 h-4" />, color: 'bg-amber-50 text-amber-600', category: '危险作业' },
]

const LEVEL_MAP: Record<string, string> = {
  general: '一般隐患',
  major: '较大隐患',
  serious: '重大隐患',
}

const STATUS_MAP: Record<string, string> = {
  pending: '待整改',
  rectifying: '整改中',
  reviewing: '复查中',
  closed: '已闭环',
}

export default function ReportCenterPage() {
  const [selectedReport, setSelectedReport] = useState<string | null>(null)
  const [hazards, setHazards] = useState<Hazard[]>([])
  const [workers, setWorkers] = useState<Worker[]>([])
  const [educations, setEducations] = useState<EducationRecord[]>([])
  const [trainings, setTrainings] = useState<TrainingRecord[]>([])
  const [logs, setLogs] = useState<DailyLog[]>([])
  const [loading, setLoading] = useState(false)
  const projectName = useAppStore(s => s.currentProject?.name ?? '溜哥的安全管理平台')

  const categories = useMemo(() => {
    const cats = new Set(REPORT_TEMPLATES.map(r => r.category))
    return Array.from(cats)
  }, [])

  const loadReportData = async (reportId: string) => {
    setLoading(true)
    setSelectedReport(reportId)
    try {
      const [h, w, e, t, l] = await Promise.all([
        hazardService.list(),
        workerService.list(),
        educationService.list(),
        trainingService.list(),
        dailyLogService.list(),
      ])
      setHazards(h)
      setWorkers(w)
      setEducations(e)
      setTrainings(t)
      setLogs(l)
    } finally {
      setLoading(false)
    }
  }

  const exportCSV = (rows: string[][], filename: string) => {
    const csv = rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportHazard = () => {
    const rows = [['序号', '隐患标题', '隐患等级', '隐患部位', '隐患描述', '责任人', '整改期限', '状态', '发现日期']]
    hazards.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)).forEach((h, i) => {
      rows.push([
        String(i + 1),
        h.title,
        LEVEL_MAP[h.level] ?? h.level,
        h.location ?? '',
        h.description ?? '',
        h.rectifyPersonId ?? '',
        h.rectifyDeadline ?? '',
        STATUS_MAP[h.status] ?? h.status,
        h.createdAt ? new Date(h.createdAt).toISOString().slice(0, 10) : '',
      ])
    })
    exportCSV(rows, `隐患排查整改台账_${new Date().toISOString().slice(0, 10)}.csv`)
  }

  const handleExportWorker = () => {
    const rows = [['序号', '姓名', '性别', '工种', '身份证号', '联系电话', '所属分包', '进场日期', '状态']]
    workers.forEach((w, i) => {
      rows.push([
        String(i + 1),
        w.name,
        w.gender === 'female' ? '女' : '男',
        w.workType ? getDictLabel('work_type', w.workType) : '',
        w.idCard ?? '',
        w.phone ?? '',
        w.subcontractorId ?? '',
        w.entryDate ?? '',
        w.status === 'active' ? '在岗' : w.status === 'left' ? '离场' : '停工',
      ])
    })
    exportCSV(rows, `人员花名册_${new Date().toISOString().slice(0, 10)}.csv`)
  }

  const handleExport = () => {
    if (selectedReport === 'hazard-ledger') handleExportHazard()
    else if (selectedReport === 'worker-ledger') handleExportWorker()
  }

  const renderReportPreview = () => {
    if (!selectedReport) return null
    if (loading) return <div className="py-8 text-center text-sm text-gray-400">加载中...</div>

    const template = REPORT_TEMPLATES.find(r => r.id === selectedReport)
    if (!template) return null

    let previewData: { headers: string[]; rows: (string | number)[][] } = { headers: [], rows: [] }

    switch (selectedReport) {
      case 'hazard-ledger':
        previewData = {
          headers: ['标题', '等级', '状态', '责任人'],
          rows: hazards.slice(0, 5).map(h => [h.title, LEVEL_MAP[h.level] ?? h.level, STATUS_MAP[h.status] ?? h.status, h.rectifyPersonId ?? '-']),
        }
        break
      case 'worker-ledger':
        previewData = {
          headers: ['姓名', '工种', '电话', '状态'],
          rows: workers.slice(0, 5).map(w => [w.name, w.workType ? getDictLabel('work_type', w.workType) : '-', w.phone ?? '-', w.status === 'active' ? '在岗' : '离场']),
        }
        break
      case 'education-ledger':
        previewData = {
          headers: ['教育主题', '日期', '教育人', '人数'],
          rows: educations.slice(0, 5).map(e => [e.title, e.date ?? '-', e.educator ?? '-', e.attendeeIds?.length ?? 0]),
        }
        break
      case 'training-ledger':
        previewData = {
          headers: ['培训主题', '日期', '讲师', '人数'],
          rows: trainings.slice(0, 5).map(t => [t.title, t.date ?? '-', t.trainer ?? '-', t.attendeeIds?.length ?? 0]),
        }
        break
      case 'daily-log':
        previewData = {
          headers: ['日期', '天气', '记录人', '施工内容'],
          rows: logs.slice(0, 5).map(l => [l.date ?? '-', l.weather ?? '-', l.recorder ?? '-', l.workContent?.slice(0, 20) ?? '-']),
        }
        break
      default:
        return <div className="py-8 text-center text-sm text-gray-400">该报表暂不支持预览，请直接导出</div>
    }

    return (
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-700">{template.name}（预览前5条）</p>
            <Button size="sm" onClick={handleExport} className="h-7 text-xs">
              <Download className="w-3 h-3 mr-1" />导出CSV
            </Button>
          </div>
          {previewData.rows.length === 0 ? (
            <p className="py-4 text-center text-xs text-gray-400">暂无数据</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b border-gray-100">
                    {previewData.headers.map(h => (
                      <th key={h} className="py-1.5 px-1 text-left text-gray-500 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.rows.map((row, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      {row.map((cell, j) => (
                        <td key={j} className="py-1.5 px-1 text-gray-700 truncate max-w-[70px]">{String(cell)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="pb-6">
      <div className="px-3 pt-3">
        <div className="bg-gradient-to-r from-rose-500 to-pink-500 rounded-xl p-4 text-white mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold">报表中心</h2>
              <p className="text-xs opacity-80">{projectName}</p>
            </div>
          </div>
        </div>

        {selectedReport ? (
          <>
            <button
              onClick={() => setSelectedReport(null)}
              className="text-xs text-primary mb-2 flex items-center gap-1"
            >
              ← 返回报表列表
            </button>
            {renderReportPreview()}
          </>
        ) : (
          categories.map(cat => (
            <div key={cat} className="mb-3">
              <h3 className="text-xs font-medium text-gray-500 mb-2 px-1">{cat}</h3>
              <div className="space-y-2">
                {REPORT_TEMPLATES.filter(r => r.category === cat).map(r => (
                  <Card key={r.id} className="cursor-pointer active:bg-gray-50" onClick={() => loadReportData(r.id)}>
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg ${r.color} flex items-center justify-center flex-shrink-0`}>
                        {r.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800">{r.name}</p>
                        <p className="text-xs text-gray-500 truncate">{r.description}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
