import { LucideIcon, ArrowUp, ArrowDown } from 'lucide-react'

interface StatsCardProps {
  icon: LucideIcon
  label: string
  value: string | number
  change: string
  trend?: 'up' | 'down' | 'neutral'
}

export function StatsCard({
  icon: Icon,
  label,
  value,
  change,
  trend = 'neutral',
}: StatsCardProps) {
  const trendColor = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-muted-foreground',
  }[trend]

  const trendIcon = {
    up: <ArrowUp className="h-4 w-4" />,
    down: <ArrowDown className="h-4 w-4" />,
    neutral: null,
  }[trend]

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
          <div className={`mt-3 flex items-center gap-1 text-xs font-medium ${trendColor}`}>
            {trendIcon}
            <span>{change}</span>
          </div>
        </div>
        <div className="rounded-xl bg-primary/10 p-3">
          <Icon className="h-6 w-6 text-primary" />
        </div>
      </div>
    </div>
  )
}
