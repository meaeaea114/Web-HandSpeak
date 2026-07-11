'use client'

import { AnalyticsChart } from '@/components/dashboard/analytics-chart'
import { AnalyticsPerspective } from '@/components/dashboard/analytics-perspective'
import { mockAnalyticsData, mockStudents, mockDashboardStats } from '@/lib/mock-data'

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Learning Analytics</h1>
        <p className="mt-2 text-muted-foreground">
          Comprehensive analysis of student learning patterns and performance
        </p>
      </div>

      {/* Main Analytics Chart */}
      <AnalyticsChart data={mockAnalyticsData} />

      {/* Analytics Perspectives */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <AnalyticsPerspective
          title="Descriptive Analytics"
          description="What happened?"
          metrics={[
            { label: 'Completion Rate', value: `${mockDashboardStats.completionRate}%` },
            { label: 'Avg Accuracy', value: `${mockDashboardStats.averageAccuracy}%` },
            { label: 'Active Students', value: mockDashboardStats.activeUsers },
          ]}
          color="bg-blue-500"
        />

        <AnalyticsPerspective
          title="Diagnostic Analytics"
          description="Why did it happen?"
          metrics={[
            { label: 'Most Failed Signs', value: '5' },
            { label: 'Weak Modules', value: '3' },
            { label: 'Common Mistakes', value: '12 patterns' },
          ]}
          color="bg-purple-500"
        />

        <AnalyticsPerspective
          title="Predictive Analytics"
          description="What will happen?"
          metrics={[
            { label: 'At-Risk Students', value: mockDashboardStats.atRiskStudents },
            { label: 'Forecast Mastery', value: '85% by week 8' },
            { label: 'Completion Timeline', value: '6-8 weeks' },
          ]}
          color="bg-orange-500"
        />

        <AnalyticsPerspective
          title="Prescriptive Analytics"
          description="What should happen?"
          metrics={[
            { label: 'Recommended Lessons', value: '24' },
            { label: 'Suggested Interventions', value: '12' },
            { label: 'Personalized Paths', value: '156 active' },
          ]}
          color="bg-green-500"
        />
      </div>

      {/* Top Performing Students */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Top Performing Students</h3>
        <div className="space-y-3">
          {mockStudents
            .sort((a, b) => b.masteryScore - a.masteryScore)
            .slice(0, 5)
            .map((student, index) => (
              <div key={student.id} className="flex items-center justify-between py-3 border-b border-border last:border-b-0">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-medium text-foreground">{student.name}</p>
                    <p className="text-xs text-muted-foreground">{student.section}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-foreground">{student.masteryScore}%</p>
                  <p className="text-xs text-muted-foreground">Mastery Score</p>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* At-Risk Students Alert */}
      <div className="rounded-2xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-6">
        <h3 className="font-semibold text-red-900 dark:text-red-400 mb-3">Students Needing Intervention</h3>
        <div className="space-y-2">
          {mockStudents
            .filter(s => s.riskLevel === 'High' || s.riskLevel === 'Medium')
            .slice(0, 3)
            .map((student) => (
              <div key={student.id} className="flex items-center justify-between text-sm">
                <span className="text-red-800 dark:text-red-300">{student.name}</span>
                <span className="text-red-600 dark:text-red-400 font-medium">
                  {student.riskLevel} Risk - {student.masteryScore}%
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
