import type { SafetyCostStats } from '../hooks/useSafetyCost'

interface Props {
  stats: SafetyCostStats
}

export function SafetyCostStats({ stats }: Props) {
  const cards = [
    { label: '年度预算', value: `¥ ${stats.annualBudget.toLocaleString()}`, color: 'text-slate-700' },
    { label: '已支出', value: `¥ ${stats.yearSpent.toLocaleString()}`, color: 'text-teal-600' },
    { label: '执行率', value: `${stats.rate}%`, color: stats.rate > 80 ? 'text-red-600' : 'text-amber-600' },
    { label: '剩余预算', value: `¥ ${stats.remaining.toLocaleString()}`, color: stats.remaining < 0 ? 'text-red-600' : 'text-slate-700' },
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
