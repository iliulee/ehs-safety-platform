import { useMemo } from 'react'
import type { AccidentRecord } from '@/types'

interface Props {
  items: AccidentRecord[]
}

export function AccidentStats({ items }: Props) {
  const stats = useMemo(() => ({
    total: items.length,
    nearMiss: items.filter((r) => r.severity === '未遂').length,
    injury: items.filter((r) => r.severity === '轻伤' || r.severity === '重伤').length,
    closed: items.filter((r) => r.status === '已结案').length,
  }), [items])

  const cards = [
    { label: '事故总数', value: stats.total, color: 'text-red-600' },
    { label: '未遂事件', value: stats.nearMiss, color: 'text-amber-600' },
    { label: '工伤记录', value: stats.injury, color: 'text-orange-600' },
    { label: '已结案', value: stats.closed, color: 'text-green-600' },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((stat) => (
        <div key={stat.label} className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs text-slate-500">{stat.label}</p>
          <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
        </div>
      ))}
    </div>
  )
}