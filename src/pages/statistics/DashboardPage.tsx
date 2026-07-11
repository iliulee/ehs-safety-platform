import { useEffect, useState, useMemo } from 'react'
import {
  AlertTriangle, Users, FileCheck, Calendar,
  TrendingUp, CheckCircle2, Clock, Shield, GraduationCap, Activity,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { useAppStore } from '@/store'
import { hazardService } from '@/services/hazardService'
import { workerService } from '@/services/workerService'
import { subcontractorService } from '@/services/subcontractorService'
import { educationService } from '@/services/educationService'
import { trainingService } from '@/services/trainingService'
import { dailyLogService } from '@/services/dailyLogService'
import { acceptanceService } from '@/services/acceptanceService'
import { meetingService } from '@/services/meetingService'
import type { Hazard, Worker, Subcontractor, EducationRecord, TrainingRecord, DailyLog, Acceptance, Meeting } from '@/types'

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [hazards, setHazards] = useState<Hazard[]>([])
  const [workers, setWorkers] = useState<Worker[]>([])
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([])
  const [educations, setEducations] = useState<EducationRecord[]>([])
  const [trainings, setTrainings] = useState<TrainingRecord[]>([])
  const [logs, setLogs] = useState<DailyLog[]>([])
  const [acceptances, setAcceptances] = useState<Acceptance[]>([])
  const [meetings, setMeetings] = useState<Meeting[]>([])

  const projectName = useAppStore(s => s.currentProject?.name ?? '溜哥的安全管理平台')

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true)
      const [h, w, s, e, t, l, a, m] = await Promise.all([
        hazardService.list(),
        workerService.list(),
        subcontractorService.list(),
        educationService.list(),
        trainingService.list(),
        dailyLogService.list(),
        acceptanceService.list(),
        meetingService.list(),
      ])
      setHazards(h)
      setWorkers(w)
      setSubcontractors(s)
      setEducations(e)
      setTrainings(t)
      setLogs(l)
      setAcceptances(a)
      setMeetings(m)
      setLoading(false)
    }
    loadAll()
  }, [])

  const stats = useMemo(() => {
    const activeWorkers = workers.filter(w => w.status === 'active').length
    const activeSubs = subcontractors.filter(s => s.status === 'cooperating').length

    const pendingHazards = hazards.filter(h => h.status === 'pending').length
    const rectifyingHazards = hazards.filter(h => h.status === 'rectifying').length
    const reviewingHazards = hazards.filter(h => h.status === 'reviewing').length
    const closedHazards = hazards.filter(h => h.status === 'closed').length
    const totalHazards = hazards.length
    const rectifyRate = totalHazards > 0 ? Math.round((closedHazards / totalHazards) * 100) : 0

    const today = new Date().toISOString().slice(0, 10)
    const todayLogs = logs.filter(l => l.date === today).length

    const passAcceptances = acceptances.filter(a => a.result === 'pass').length

    const workerByType: Record<string, number> = {}
    workers.forEach(w => {
      if (w.workType) workerByType[w.workType] = (workerByType[w.workType] ?? 0) + 1
    })
    const topWorkTypes = Object.entries(workerByType)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)

    return {
      activeWorkers,
      totalWorkers: workers.length,
      activeSubs,
      totalSubs: subcontractors.length,
      pendingHazards,
      rectifyingHazards,
      reviewingHazards,
      closedHazards,
      totalHazards,
      rectifyRate,
      totalEducation: educations.length,
      totalTraining: trainings.length,
      totalLogs: logs.length,
      todayLogs,
      totalAcceptance: acceptances.length,
      passAcceptances,
      totalMeetings: meetings.length,
      topWorkTypes,
    }
  }, [hazards, workers, subcontractors, educations, trainings, logs, acceptances, meetings])

  const workTypeLabels: Record<string, string> = {
    common_worker: '普工',
    reinforcement: '钢筋工',
    formwork_worker: '木工',
    concrete: '混凝土工',
    scaffolder: '架子工',
    electrician: '电工',
    welder: '焊工',
    tower_crane: '塔吊司机',
    signal_man: '信号工',
    lifting_worker: '起重工',
    machinery_operator: '机械操作工',
    plumber: '管道工',
  }

  if (loading) {
    return <div className="p-3"><div className="py-12 text-center text-sm text-gray-400">加载中...</div></div>
  }

  return (
    <div className="pb-6">
      <div className="px-3 pt-3">
        <div className="bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-500 rounded-xl p-4 text-white mb-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs opacity-90">安全数据看板</p>
              <h2 className="text-base font-semibold truncate max-w-[200px]">{projectName}</h2>
            </div>
            <Activity className="w-8 h-8 opacity-50" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white/15 rounded-lg p-2 text-center">
              <p className="text-xl font-bold">{stats.totalHazards}</p>
              <p className="text-[10px] opacity-80">隐患总数</p>
            </div>
            <div className="bg-white/15 rounded-lg p-2 text-center">
              <p className="text-xl font-bold">{stats.rectifyRate}%</p>
              <p className="text-[10px] opacity-80">整改率</p>
            </div>
            <div className="bg-white/15 rounded-lg p-2 text-center">
              <p className="text-xl font-bold">{stats.activeWorkers}</p>
              <p className="text-[10px] opacity-80">在场人员</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-3 mb-3">
        <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4 text-amber-500" />隐患排查
        </h3>
        <div className="grid grid-cols-4 gap-2">
          <StatCard icon={<Clock className="w-4 h-4" />} label="待整改" value={stats.pendingHazards} color="bg-red-50 text-red-600" />
          <StatCard icon={<TrendingUp className="w-4 h-4" />} label="整改中" value={stats.rectifyingHazards} color="bg-amber-50 text-amber-600" />
          <StatCard icon={<CheckCircle2 className="w-4 h-4" />} label="复查中" value={stats.reviewingHazards} color="bg-blue-50 text-blue-600" />
          <StatCard icon={<CheckCircle2 className="w-4 h-4" />} label="已闭环" value={stats.closedHazards} color="bg-emerald-50 text-emerald-600" />
        </div>
      </div>

      <div className="px-3 mb-3">
        <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
          <Users className="w-4 h-4 text-blue-500" />人员管理
        </h3>
        <div className="grid grid-cols-3 gap-2">
          <StatCard icon={<Users className="w-4 h-4" />} label="在场工人" value={stats.activeWorkers} color="bg-blue-50 text-blue-600" />
          <StatCard icon={<Shield className="w-4 h-4" />} label="合作分包" value={stats.activeSubs} color="bg-purple-50 text-purple-600" />
          <StatCard icon={<GraduationCap className="w-4 h-4" />} label="培训次数" value={stats.totalTraining} color="bg-cyan-50 text-cyan-600" />
        </div>
      </div>

      {stats.topWorkTypes.length > 0 && (
        <div className="px-3 mb-3">
          <h3 className="text-sm font-medium text-gray-700 mb-2">工种分布</h3>
          <Card>
            <CardContent className="p-3">
              <div className="space-y-2">
                {stats.topWorkTypes.map(([type, count]) => {
                  const maxCount = Math.max(...stats.topWorkTypes.map(([, c]) => c))
                  const pct = maxCount > 0 ? (count / maxCount) * 100 : 0
                  return (
                    <div key={type}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-600">{workTypeLabels[type] ?? type}</span>
                        <span className="text-gray-500 font-medium">{count}人</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="px-3 mb-3">
        <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
          <FileCheck className="w-4 h-4 text-emerald-500" />日常管理
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <StatCard icon={<Calendar className="w-4 h-4" />} label="安全日志" value={`${stats.todayLogs}/${stats.totalLogs}`} sub="今日/累计" color="bg-emerald-50 text-emerald-600" />
          <StatCard icon={<FileCheck className="w-4 h-4" />} label="安全验收" value={`${stats.passAcceptances}/${stats.totalAcceptance}`} sub="合格/总数" color="bg-teal-50 text-teal-600" />
          <StatCard icon={<GraduationCap className="w-4 h-4" />} label="安全教育" value={stats.totalEducation} color="bg-indigo-50 text-indigo-600" />
          <StatCard icon={<Calendar className="w-4 h-4" />} label="安全会议" value={stats.totalMeetings} color="bg-violet-50 text-violet-600" />
        </div>
      </div>

      <div className="px-3">
        <Card className="bg-amber-50/50 border-amber-100">
          <CardContent className="p-3">
            <div className="flex items-start gap-2">
              <Shield className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-amber-800 mb-1">安全提示</p>
                <p className="text-xs text-amber-700 leading-relaxed">
                  安全生产，人人有责。请及时排查隐患、落实整改，做好每日安全日志和班前安全教育记录。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode
  label: string
  value: number | string
  sub?: string
  color: string
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-2.5">
        <div className={`w-7 h-7 rounded-lg ${color} flex items-center justify-center mb-1.5`}>
          {icon}
        </div>
        <p className="text-lg font-bold text-gray-900 leading-tight">{value}</p>
        <p className="text-[10px] text-gray-500">{label}</p>
        {sub && <p className="text-[9px] text-gray-400">{sub}</p>}
      </CardContent>
    </Card>
  )
}
