import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  description?: string
  right?: React.ReactNode
  className?: string
}

export function PageHeader({ title, description, right, className }: PageHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between mb-3 px-3 pt-3', className)}>
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      {right}
    </div>
  )
}
