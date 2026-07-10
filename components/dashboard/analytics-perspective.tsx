interface AnalyticsPerspectiveProps {
  title: string
  description: string
  metrics: Array<{
    label: string
    value: string | number
  }>
  color: string
}

export function AnalyticsPerspective({
  title,
  description,
  metrics,
  color,
}: AnalyticsPerspectiveProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      {/* Header */}
      <div className="mb-4">
        <div className={`${color} h-1 w-12 rounded-full mb-3`} />
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground italic">{description}</p>
      </div>

      {/* Metrics */}
      <div className="space-y-3">
        {metrics.map((metric, index) => (
          <div key={index} className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{metric.label}</span>
            <span className="font-semibold text-foreground">{metric.value}</span>
          </div>
        ))}
      </div>

      {/* Learn More Button */}
      <button className="mt-4 w-full rounded-lg border border-border py-2 text-sm font-medium text-primary hover:bg-primary/5 transition-colors">
        View Details
      </button>
    </div>
  )
}
