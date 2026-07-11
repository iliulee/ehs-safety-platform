import { Bell } from 'lucide-react'
import { useAppStore } from '@/store'

export function Header() {
  const projectName = useAppStore(s => s.currentProject?.name)

  return (
    <header className="absolute left-[60px] right-0 top-0 h-12 bg-white border-b border-gray-200 flex items-center justify-between px-3 z-20">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="text-sm font-medium text-gray-800 truncate">
          {projectName ?? '溜哥的安全管理平台'}
        </span>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        <button className="relative w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors text-gray-500">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-danger rounded-full" />
        </button>
      </div>
    </header>
  )
}
