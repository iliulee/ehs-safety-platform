import { NavLink, useLocation } from 'react-router-dom'
import { filteredMenuGroups, type MenuItem } from '@/config/menu'
import { cn } from '@/lib/utils'
import { APP_NAME } from '@/core/constants'
import { Shield } from 'lucide-react'

export function Sidebar() {
  const location = useLocation()

  const isActive = (item: MenuItem) => {
    if (item.path === '/home') return location.pathname === '/home'
    return location.pathname.startsWith(item.path)
  }

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[240px] bg-slate-900 flex flex-col z-30 select-none">
      {/* Logo */}
      <div className="h-14 flex items-center gap-3 px-4 border-b border-slate-700/50 flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center flex-shrink-0">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white truncate leading-tight">{APP_NAME}</p>
          <p className="text-[10px] text-slate-400 leading-tight">安全管理 · 台账报表</p>
        </div>
      </div>

      {/* Menu Groups */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {filteredMenuGroups.map((group) => (
          <div key={group.id}>
            {/* Group Header */}
            <p className="px-3 mb-1 text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              {group.label}
            </p>
            {/* Group Items */}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item)
                return (
                  <NavLink
                    key={item.id}
                    to={item.path}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all duration-150 group',
                      active
                        ? 'bg-teal-600/15 text-teal-400 font-medium'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-slate-100'
                    )}
                  >
                    <item.icon
                      className={cn(
                        'w-4 h-4 flex-shrink-0',
                        active ? 'text-teal-400' : 'text-slate-400 group-hover:text-slate-300'
                      )}
                      strokeWidth={active ? 2.5 : 2}
                    />
                    <span className="truncate flex-1">{item.label}</span>
                    {item.badge && (
                      <span
                        className={cn(
                          'text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 leading-none',
                          item.badge.variant === 'new'
                            ? 'bg-teal-600/20 text-teal-400'
                            : item.badge.variant === 'danger'
                            ? 'bg-red-600/20 text-red-400'
                            : 'bg-amber-600/20 text-amber-400'
                        )}
                      >
                        {item.badge.text}
                      </span>
                    )}
                  </NavLink>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-slate-700/50 flex-shrink-0">
        <p className="text-[10px] text-slate-600 text-center">
          大理机场改扩建项目 · v2.0
        </p>
      </div>
    </aside>
  )
}