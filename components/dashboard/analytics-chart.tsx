'use client'

import { AnalyticsData } from '@/lib/mock-data'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface AnalyticsChartProps {
  data: AnalyticsData[]
}

export function AnalyticsChart({ data }: AnalyticsChartProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground">Learning Analytics</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Track student progress and engagement over time
        </p>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis
            dataKey="date"
            stroke="var(--color-muted-foreground)"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke="var(--color-muted-foreground)"
            style={{ fontSize: '12px' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--color-card)',
              border: `1px solid var(--color-border)`,
              borderRadius: '8px',
            }}
            labelStyle={{ color: 'var(--color-foreground)' }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="completionRate"
            stroke="var(--color-primary)"
            strokeWidth={2}
            dot={false}
            name="Completion Rate"
          />
          <Line
            type="monotone"
            dataKey="avgAccuracy"
            stroke="var(--color-secondary)"
            strokeWidth={2}
            dot={false}
            name="Avg Accuracy"
          />
          <Line
            type="monotone"
            dataKey="activeStudents"
            stroke="var(--color-accent)"
            strokeWidth={2}
            dot={false}
            name="Active Students"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
