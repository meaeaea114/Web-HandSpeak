'use client'

import { mockDashboardStats, mockActivityLogs, mockAnalyticsData } from '@/lib/mock-data'
import { StatsCard } from '@/components/dashboard/stats-card'
import { ActivityFeed } from '@/components/dashboard/activity-feed'
import { AnalyticsChart } from '@/components/dashboard/analytics-chart'
import { TrendingUp, Users, Brain, Target, AlertCircle, Clock, BookOpen, Zap } from 'lucide-react'

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Welcome Back!</h1>
        <p className="mt-2 text-muted-foreground">
          Here&apos;s an overview of your HandSpeak platform activity
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          icon={Users}
          label="Total Students"
          value={mockDashboardStats.totalStudents}
          change="+12 this month"
          trend="up"
        />
        <StatsCard
          icon={TrendingUp}
          label="Active Users"
          value={mockDashboardStats.activeUsers}
          change="+5 today"
          trend="up"
        />
        <StatsCard
          icon={Brain}
          label="Avg Accuracy"
          value={`${mockDashboardStats.averageAccuracy}%`}
          change="+2.5% from last week"
          trend="up"
        />
        <StatsCard
          icon={Target}
          label="Completion Rate"
          value={`${mockDashboardStats.completionRate}%`}
          change="+3.2% from last month"
          trend="up"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          icon={AlertCircle}
          label="At-Risk Students"
          value={mockDashboardStats.atRiskStudents}
          change="Requires intervention"
          trend="down"
        />
        <StatsCard
          icon={Clock}
          label="Avg Lesson Time"
          value={`${mockDashboardStats.avgLessonTime}m`}
          change="Per session"
          trend="neutral"
        />
        <StatsCard
          icon={BookOpen}
          label="Total Signs"
          value={mockDashboardStats.totalSigns}
          change="Available to learn"
          trend="neutral"
        />
        <StatsCard
          icon={Zap}
          label="Recognition Accuracy"
          value={`${mockDashboardStats.avgRecognitionAccuracy}%`}
          change="Gesture detection"
          trend="up"
        />
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Analytics Chart */}
        <div className="lg:col-span-2">
          <AnalyticsChart data={mockAnalyticsData} />
        </div>

        {/* Activity Feed */}
        <div>
          <ActivityFeed activities={mockActivityLogs} />
        </div>
      </div>
    </div>
  )
}
