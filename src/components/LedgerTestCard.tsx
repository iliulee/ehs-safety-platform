import { useState } from 'react'
import { FileSpreadsheet, Loader2, CheckCircle2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/store'
import { LedgerExportService } from '@/services/ledger-export.service'
import { downloadBlob } from '@/core/constants'
import { hazardService } from '@/services/hazardService'
import { workerService } from '@/services/workerService'
import { subcontractorService } from '@/services/subcontractorService'
import { educationService } from '@/services/educationService'
import { db } from '@/db'
import { toast } from 'sonner'

type LedgerType = 'education' | 'hazard' | 'worker'

const workTypeLabels: Record<string, string> = {
  common_worker: '普工', reinforcement: '钢筋工', formwork_worker: '木工', concrete: '混凝土工',
  scaffolder: '架子工', electrician: '电工', welder: '焊工', tower_crane: '塔吊司机',
  signal_man: '信号工', lifting_worker: '起重工', machinery_operator: '机械操作工', plumber: '管道工',
}

function fmtDate(ts?: number | string): Date | '' {
  if (!ts) return ''
  if (typeof ts === 'number') return new Date(ts)
  return new Date(ts)
}

export default function LedgerTestCard() {
  const projectName = useAppStore(s => s.currentProject?.name ?? '溜哥的安全管理平台')
  const [exporting, setExporting] = useState<LedgerType | null>(null)

  const handleExport = async (type: LedgerType) => {
    setExporting(type)
    try {
      const today = new Date()
      const dateStr = today.toISOString().slice(0, 10)

      if (type === 'education') {
        const [edus, wrks, subs] = await Promise.all([
          educationService.list(),
          workerService.list(),
          subcontractorService.list(),
        ])
        const subMap = new Map(subs.map(s => [s.id!, s.name]))
        const workerMap = new Map(wrks.map(w => [w.id!, w]))
        if (edus.length === 0) toast.info('暂无教育记录，将导出空表模板')
        // 三级教育花名册：展开每次教育的 attendeeIds，每人一行
        const rows: (string | number | Date)[][] = []
        let idx = 1
        for (const e of edus) {
          const eduType = e.type ?? '安全教育'
          for (const wid of e.attendeeIds) {
            const w = workerMap.get(wid)
            rows.push([
              idx++,
              w?.name ?? '',
              w?.gender === 'female' ? '女' : '男',
              w?.idCard ?? '',
              w?.workType ? (workTypeLabels[w.workType] ?? w.workType) : '',
              (w?.subcontractorId ? subMap.get(w.subcontractorId) : '') ?? '',
              fmtDate(w?.entryDate),
              eduType.includes('公司') ? fmtDate(e.date) : '',
              eduType.includes('项目') ? fmtDate(e.date) : '',
              eduType.includes('班组') ? fmtDate(e.date) : '',
              e.educator ?? '',
              '',
              '',
            ])
          }
        }
        const blob = await LedgerExportService.generateExcelLedger({
          templateFile: 'ledger_education.xlsx',
          dataRows: rows,
          startRow: 5,
          headerReplacements: { D2: projectName, J2: dateStr },
        })
        await downloadBlob(blob, `三级安全教育花名册_${dateStr}.xlsx`)
      } else if (type === 'hazard') {
        const [hz, workers] = await Promise.all([
          hazardService.list(),
          workerService.list(),
        ])
        const workerMap = new Map(workers.map(w => [w.id!, w]))
        const statusMap: Record<string, string> = { pending: '待整改', rectifying: '整改中', reviewing: '复查中', closed: '已闭环' }
        const levelMap: Record<string, string> = { general: '一般', major: '较大', serious: '重大' }
        if (hz.length === 0) toast.info('暂无隐患记录，将导出空表模板')
        const dataRows: (string | number | Date)[][] = hz.map((h, i) => [
          i + 1,
          fmtDate(h.createdAt),
          h.location ?? '',
          `${h.title}${h.description ? '：' + h.description : ''}`,
          h.category ?? '',
          h.level ? (levelMap[h.level] ?? h.level) : '',
          (h.rectifyPersonId ? workerMap.get(h.rectifyPersonId)?.name : '') ?? '',
          '', // Hazard 实体无 subcontractorId，暂时留空
          fmtDate(h.rectifyDeadline),
          fmtDate(h.rectifyDate),
          (h.reviewPersonId ? workerMap.get(h.reviewPersonId)?.name : '') ?? '',
          h.status ? (statusMap[h.status] ?? h.status) : '',
          h.reviewComment ?? '',
        ])
        const blob = await LedgerExportService.generateExcelLedger({
          templateFile: 'ledger_hazard.xlsx',
          dataRows,
          startRow: 4,
          headerReplacements: { D2: projectName, J2: dateStr },
        })
        await downloadBlob(blob, `隐患排查治理动态台账_${dateStr}.xlsx`)
      } else {
        const [wrks, subs, certs] = await Promise.all([
          workerService.list(),
          subcontractorService.list(),
          db.certificates.toArray(),
        ])
        const subMap = new Map(subs.map(s => [s.id!, s.name]))
        const certMap = new Map<string, string>()
        certs.forEach(c => { if (c.workerId && c.certNumber) certMap.set(c.workerId, c.certNumber) })
        const statusMap: Record<string, string> = { active: '在场', left: '退场', leave: '请假' }
        if (wrks.length === 0) toast.info('暂无人员记录，将导出空表模板')
        const dataRows: (string | number | Date)[][] = wrks.map((w, i) => {
          let age: string | number = ''
          if (w.idCard && w.idCard.length === 18) {
            const by = parseInt(w.idCard.slice(6, 10), 10)
            if (!isNaN(by)) age = new Date().getFullYear() - by
          }
          return [
            i + 1, w.name ?? '', w.gender === 'female' ? '女' : '男', age, w.idCard ?? '',
            w.workType ? (workTypeLabels[w.workType] ?? w.workType) : '',
            certMap.get(w.id!) ?? '',
            (w.subcontractorId ? subMap.get(w.subcontractorId) : '') ?? '',
            fmtDate(w.entryDate),
            fmtDate(w.exitDate),
            w.status ? (statusMap[w.status] ?? w.status) : '',
            w.phone ?? '',
            w.remark ?? '',
          ]
        })
        const blob = await LedgerExportService.generateExcelLedger({
          templateFile: 'ledger_worker.xlsx',
          dataRows,
          startRow: 4,
          headerReplacements: { D2: projectName, J2: dateStr },
        })
        await downloadBlob(blob, `作业人员花名册_${dateStr}.xlsx`)
      }
      toast.success('✅ 台账生成成功，开始下载')
    } catch (err) {
      console.error(err)
      toast.error('❌ 导出失败：' + (err instanceof Error ? err.message : '未知错误'))
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="px-3 mb-3">
      <Card className="border-2 border-dashed border-violet-200 bg-violet-50/30">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-violet-500 text-white flex items-center justify-center flex-shrink-0">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-violet-900 flex items-center gap-1.5">
                SSOT 合规台账引擎（测试）
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              </p>
              <p className="text-[11px] text-violet-600 mt-0.5">实时数据库 → ExcelJS 动态插行 → 样式克隆 → 导出</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <Button size="sm" variant="outline" className="h-8 text-[11px] bg-white"
              disabled={exporting !== null} onClick={() => handleExport('education')}>
              {exporting === 'education' && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
              三级教育
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-[11px] bg-white"
              disabled={exporting !== null} onClick={() => handleExport('hazard')}>
              {exporting === 'hazard' && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
              隐患台账
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-[11px] bg-white"
              disabled={exporting !== null} onClick={() => handleExport('worker')}>
              {exporting === 'worker' && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
              人员花名册
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
