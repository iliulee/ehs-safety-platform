import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building2,
  FolderOpen,
  Sparkles,
  FileDown,
  Settings,
  BookOpen,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  CalendarCheck,
} from 'lucide-react'
import { useAppStore } from '@/store'
import { projectService } from '@/services/projectService'
import { templateService } from '@/services/templateService'
import { variableSettingsService } from '@/services/variable-settings.service'
import { workerService } from '@/services/workerService'
import type { Project, Certificate, Worker } from '@/types'

export default function HomePage() {
  const navigate = useNavigate()
  const { currentProject, currentProjectId } = useAppStore()
  const [project, setProject] = useState<Project | null>(currentProject)
  const [templateCount, setTemplateCount] = useState(0)
  const [variableCount, setVariableCount] = useState(0)
  const [pendingTips, setPendingTips] = useState<Array<{ text: string; action?: () => void; actionLabel?: string }>>([])

  useEffect(() => {
    const load = async () => {
      const [p, templates, variables, workers] = await Promise.all([
        currentProjectId ? projectService.getById(currentProjectId) : projectService.getCurrent(),
        templateService.list(),
        variableSettingsService.list(),
        workerService.listByProject(currentProjectId ?? undefined),
      ])
      setProject(p ?? null)
      setTemplateCount(templates.length)
      setVariableCount(variables.length)

      const customVariables = variables.filter(v => !v.isBuiltIn).length
      const tips: Array<{ text: string; action?: () => void; actionLabel?: string }> = []
      if (!p) tips.push({ text: '尚未创建项目，请先建立项目并填写基础信息' })
      else if (!p.name || p.name === '') tips.push({ text: '当前项目名称为空，请完善项目信息' })
      if (templates.length === 0) tips.push({ text: '模板库为空，请导入或扫描本地模板文件夹' })
      if (customVariables === 0) tips.push({ text: '尚未添加自定义全局变量，建议先配置项目常用字段' })

      // 证件过期提醒
      const certTips = await buildCertificateTips(workers)
      tips.push(...certTips)

      setPendingTips(tips.length > 0 ? tips : [{ text: '工作台就绪，可以开始生成安全资料' }])
    }
    load().catch(console.error)
  }, [currentProjectId, navigate])

  const projectName = project?.name ?? '未选择项目'

  const quickActions = [
    {
      label: '填写今日日报',
      desc: '结构化表单快速生成日报 Word',
      icon: <CalendarCheck className="w-4 h-4" />,
      onClick: () => navigate('/report/daily'),
      primary: true,
    },
    {
      label: '批量生成资料',
      desc: '选择模板并一键生成',
      icon: <FileDown className="w-4 h-4" />,
      onClick: () => navigate('/templates'),
      primary: false,
    },
    {
      label: 'AI 辅助写作',
      desc: '基于知识库生成方案',
      icon: <Sparkles className="w-4 h-4" />,
      onClick: () => navigate('/ai'),
      primary: false,
    },
    {
      label: '管理模板库',
      desc: `${templateCount} 个模板`,
      icon: <FolderOpen className="w-4 h-4" />,
      onClick: () => navigate('/templates'),
      primary: false,
    },
  ]

  const menuItems = [
    { label: '项目信息', icon: Building2, path: '/projects', desc: projectName },
    { label: '知识库', icon: BookOpen, path: '/knowledge', desc: '规范、标准、方案' },
    { label: '全局变量', icon: Settings, path: '/settings/variables', desc: `${variableCount} 个变量` },
  ]

  return (
    <div className="p-3 space-y-3">
      {/* 项目概览 */}
      <section>
        <button
          onClick={() => navigate('/projects')}
          className="w-full flex items-center justify-between px-3 py-2.5 bg-white border border-border rounded-lg hover:border-primary/40 transition-colors text-left"
        >
          <div className="min-w-0">
            <p className="text-xs text-text-tertiary">当前项目</p>
            <p className="text-sm font-medium text-text truncate">{projectName}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-text-tertiary flex-shrink-0" />
        </button>
      </section>

      {/* 快速开始 */}
      <section className="space-y-2">
        <h3 className="text-xs font-medium text-text-secondary px-0.5">快速开始</h3>
        <div className="grid grid-cols-1 gap-2">
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={action.onClick}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors
                ${action.primary
                  ? 'bg-primary text-white border-primary hover:bg-primary-700'
                  : 'bg-white border-border hover:border-primary/40 text-text'
                }
              `}
            >
              <div className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${action.primary ? 'bg-white/15' : 'bg-surface-secondary text-primary'}`}>
                {action.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium ${action.primary ? 'text-white' : 'text-text'}`}>{action.label}</p>
                <p className={`text-xs truncate ${action.primary ? 'text-white/80' : 'text-text-secondary'}`}>{action.desc}</p>
              </div>
              <ChevronRight className={`w-4 h-4 flex-shrink-0 ${action.primary ? 'text-white/70' : 'text-text-tertiary'}`} />
            </button>
          ))}
        </div>
      </section>

      {/* 状态提示 */}
      <section className="space-y-2">
        <h3 className="text-xs font-medium text-text-secondary px-0.5">待处理</h3>
        <div className="bg-white border border-border rounded-lg divide-y divide-border">
          {pendingTips.map((tip, idx) => (
            <div key={idx} className="flex items-start gap-2 px-3 py-2.5">
              {idx === 0 && pendingTips.length === 1 && tip.text.includes('就绪')
                ? <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                : <AlertCircle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
              }
              <div className="flex-1 min-w-0">
                <p className="text-xs text-text-secondary leading-relaxed">{tip.text}</p>
                {tip.action && (
                  <button
                    onClick={tip.action}
                    className="text-xs text-primary hover:underline mt-1"
                  >
                    {tip.actionLabel ?? '去处理'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 常用入口 */}
      <section className="space-y-2">
        <h3 className="text-xs font-medium text-text-secondary px-0.5">常用入口</h3>
        <div className="bg-white border border-border rounded-lg divide-y divide-border">
          {menuItems.map((item) => (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-surface-secondary transition-colors text-left"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <item.icon className="w-4 h-4 text-text-tertiary flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-text">{item.label}</p>
                  <p className="text-xs text-text-secondary truncate">{item.desc}</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-text-tertiary flex-shrink-0" />
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}

async function buildCertificateTips(workers: Worker[]): Promise<Array<{ text: string; action?: () => void; actionLabel?: string }>> {
  const tips: Array<{ text: string; action?: () => void; actionLabel?: string }> = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const threshold = new Date(today)
  threshold.setDate(threshold.getDate() + 30)

  const expiredCerts: { worker: Worker; cert: Certificate }[] = []
  const nearExpiryCerts: { worker: Worker; cert: Certificate; days: number }[] = []

  for (const worker of workers) {
    if (worker.status !== 'active' || !worker.id) continue
    const certs = await workerService.getCertificates(worker.id)
    for (const cert of certs) {
      if (!cert.expiryDate) continue
      const expiry = new Date(cert.expiryDate)
      expiry.setHours(0, 0, 0, 0)
      if (expiry < today) {
        expiredCerts.push({ worker, cert })
      } else if (expiry <= threshold) {
        const days = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        nearExpiryCerts.push({ worker, cert, days })
      }
    }
  }

  if (expiredCerts.length > 0) {
    const grouped = groupByWorker(expiredCerts)
    for (const [workerName, list] of Object.entries(grouped)) {
      tips.push({
        text: `${workerName} 的 ${list.map(c => c.cert.certType).join('、')} 已过期，请尽快更新`,
        action: () => window.location.href = '#/workers',
        actionLabel: '查看人员',
      })
    }
  }

  if (nearExpiryCerts.length > 0) {
    const grouped = groupByWorker(nearExpiryCerts)
    for (const [workerName, list] of Object.entries(grouped)) {
      const items = list.map(c => `${c.cert.certType}（${c.days}天内）`).join('、')
      tips.push({
        text: `${workerName} 的 ${items} 即将过期，请提前准备`,
        action: () => window.location.href = '#/workers',
        actionLabel: '查看人员',
      })
    }
  }

  return tips
}

function groupByWorker<T extends { worker: Worker }>(items: T[]): Record<string, T[]> {
  return items.reduce((acc, item) => {
    const name = item.worker.name || '未知人员'
    if (!acc[name]) acc[name] = []
    acc[name].push(item)
    return acc
  }, {} as Record<string, T[]>)
}
