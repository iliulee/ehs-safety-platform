import { useEffect, useMemo, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ChevronDown, Minus, X } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAppStore } from '@/store'
import { cn } from '@/lib/utils'
import { projectService } from '@/services/projectService'
import { Sidebar } from './Sidebar'
import type { Project } from '@/types'

export function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { currentProject, setCurrentProject } = useAppStore()
  const [projects, setProjects] = useState<Project[]>([])

  useEffect(() => {
    projectService.list().then(setProjects).catch(() => setProjects([]))
  }, [currentProject?.id])

  const handleSwitchProject = (id: string) => {
    setCurrentProject(id)
  }

  // 面包屑 — 根据当前路径生成
  const breadcrumb = useMemo(() => {
    const path = location.pathname
    if (path === '/home') return '工作台'
    const parts = path.split('/').filter(Boolean)
    const map: Record<string, string> = {
      projects: '项目管理',
      subcontractors: '分包管理',
      workers: '人员管理',
      equipment: '机械设备',
      education: '安全教育',
      training: '安全培训',
      dailylog: '安全日志',
      inspection: '隐患排查',
      'hazard-identification': '危险源辨识',
      'hazard-project': '危大工程',
      permits: '作业许可',
      acceptance: '安全验收',
      ppe: '劳保用品',
      emergency: '应急管理',
      'safety-cost': '安全费用',
      accidents: '事故管理',
      meetings: '安全会议',
      correspondences: '收发文',
      templates: '模板库',
      generate: '台账生成',
      reports: '报表中心',
      statistics: '数据看板',
      ai: 'AI 助手',
      knowledge: '知识库',
      editor: '文档编辑器',
      settings: '设置',
    }
    return parts.map(p => map[p] || p).join(' / ')
  }, [location.pathname])

  return (
    <div className="fixed inset-0 flex bg-slate-100 overflow-hidden">
      {/* 左侧边栏 */}
      <Sidebar />

      {/* 右侧内容区 */}
      <div className="flex-1 flex flex-col ml-[240px] min-w-0">
        {/* 顶部标题栏 */}
        <header className="h-12 flex items-center justify-between px-4 bg-white border-b border-slate-200 flex-shrink-0">
          {/* 左侧：面包屑 */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs text-slate-400">{breadcrumb}</span>
          </div>

          {/* 右侧：项目选择 + 窗口控制 */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 h-7 px-2.5 rounded-md hover:bg-slate-100 transition-colors text-xs text-slate-600 max-w-[180px] border border-transparent hover:border-slate-200">
                  <span className="truncate">{currentProject?.name ?? '选择项目'}</span>
                  <ChevronDown className="w-3 h-3 flex-shrink-0 text-slate-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                {projects.length === 0 ? (
                  <DropdownMenuItem disabled>暂无项目，请先创建</DropdownMenuItem>
                ) : (
                  projects.map(p => (
                    <DropdownMenuItem
                      key={p.id}
                      onClick={() => p.id && handleSwitchProject(p.id)}
                    >
                      <span className={cn(
                        'truncate',
                        currentProject?.id === p.id && 'font-medium text-teal-600'
                      )}>
                        {p.name}
                      </span>
                    </DropdownMenuItem>
                  ))
                )}
                <DropdownMenuItem onClick={() => navigate('/projects')}>
                  <span className="text-teal-600">管理项目...</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* 窗口控制按钮（Electron 环境下可对接 IPC） */}
            <div className="flex items-center gap-0.5 ml-2 pl-2 border-l border-slate-200">
              <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                <Minus className="w-3.5 h-3.5" />
              </button>
              <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </header>

        {/* 主内容区 */}
        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}