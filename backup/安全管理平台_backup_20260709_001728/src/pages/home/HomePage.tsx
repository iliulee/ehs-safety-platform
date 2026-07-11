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
} from 'lucide-react'
import { useAppStore } from '@/store'
import { projectService } from '@/services/projectService'
import { templateService } from '@/services/templateService'
import { variableSettingsService } from '@/services/variable-settings.service'
import type { Project } from '@/types'

export default function HomePage() {
  const navigate = useNavigate()
  const { currentProject, currentProjectId } = useAppStore()
  const [project, setProject] = useState<Project | null>(currentProject)
  const [templateCount, setTemplateCount] = useState(0)
  const [variableCount, setVariableCount] = useState(0)
  const [pendingTips, setPendingTips] = useState<string[]>([])

  useEffect(() => {
    const load = async () => {
      const [p, templates, variables] = await Promise.all([
        currentProjectId ? projectService.getById(currentProjectId) : projectService.getCurrent(),
        templateService.list(),
        variableSettingsService.list(),
      ])
      setProject(p ?? null)
      setTemplateCount(templates.length)
      setVariableCount(variables.length)

      const customVariables = variables.filter(v => !v.isBuiltIn).length
      const tips: string[] = []
      if (!p) tips.push('尚未创建项目，请先建立项目并填写基础信息')
      else if (!p.name || p.name === '') tips.push('当前项目名称为空，请完善项目信息')
      if (templates.length === 0) tips.push('模板库为空，请导入或扫描本地模板文件夹')
      if (customVariables === 0) tips.push('尚未添加自定义全局变量，建议先配置项目常用字段')
      setPendingTips(tips.length > 0 ? tips : ['工作台就绪，可以开始生成安全资料'])
    }
    load().catch(console.error)
  }, [currentProjectId])

  const projectName = project?.name ?? '未选择项目'

  const quickActions = [
    {
      label: '批量生成资料',
      desc: '选择模板并一键生成',
      icon: <FileDown className="w-4 h-4" />,
      onClick: () => navigate('/templates'),
      primary: true,
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
              {idx === 0 && pendingTips.length === 1 && tip.includes('就绪')
                ? <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                : <AlertCircle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
              }
              <p className="text-xs text-text-secondary leading-relaxed">{tip}</p>
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
