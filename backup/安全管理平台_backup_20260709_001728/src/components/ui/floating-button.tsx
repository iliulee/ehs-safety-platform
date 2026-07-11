import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FloatingButtonProps {
  onClick: () => void
  className?: string
}

export function FloatingButton({ onClick, className }: FloatingButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'absolute bottom-5 right-4 w-12 h-12 rounded-full bg-primary text-white shadow-lg',
        'flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-all z-40',
        className,
      )}
    >
      <Plus className="w-6 h-6" />
    </button>
  )
}
