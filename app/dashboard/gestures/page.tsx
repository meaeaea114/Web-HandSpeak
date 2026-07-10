'use client'

import { mockSignPerformance } from '@/lib/mock-data'
import { TrendingUp, AlertCircle, Zap } from 'lucide-react'

export default function GesturePerformancePage() {
  const sortedSigns = [...mockSignPerformance].sort((a, b) => b.recognition_rate - a.recognition_rate)
  const lowestPerforming = [...mockSignPerformance].sort((a, b) => a.recognition_rate - b.recognition_rate).slice(0, 3)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Gesture Performance</h1>
        <p className="mt-2 text-muted-foreground">
          AI-powered gesture recognition accuracy and student practice analytics
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Avg Recognition Rate</p>
              <p className="mt-2 text-3xl font-bold text-foreground">
                {(mockSignPerformance.reduce((sum, s) => sum + s.recognition_rate, 0) / mockSignPerformance.length).toFixed(1)}%
              </p>
            </div>
            <div className="rounded-xl bg-primary/10 p-3">
              <Zap className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Sign Attempts</p>
              <p className="mt-2 text-3xl font-bold text-foreground">
                {mockSignPerformance.reduce((sum, s) => sum + s.attempts, 0)}
              </p>
            </div>
            <div className="rounded-xl bg-secondary/10 p-3">
              <TrendingUp className="h-6 w-6 text-secondary" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Signs Mastered</p>
              <p className="mt-2 text-3xl font-bold text-foreground">
                {mockSignPerformance.filter(s => s.recognition_rate >= 85).length}
              </p>
            </div>
            <div className="rounded-xl bg-green-100 dark:bg-green-900/30 p-3">
              <span className="text-2xl">👑</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sign Performance Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Sign Recognition Performance</h3>
          <p className="mt-1 text-sm text-muted-foreground">Performance metrics for all learned signs</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Sign</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Category</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Recognition Rate</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Attempts</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Avg Confidence</th>
              </tr>
            </thead>
            <tbody>
              {sortedSigns.map((sign, index) => (
                <tr
                  key={index}
                  className={`border-b border-border hover:bg-muted/50 transition-colors`}
                >
                  <td className="px-6 py-4 font-medium text-foreground">{sign.sign}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{sign.category}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full ${
                            sign.recognition_rate >= 85
                              ? 'bg-green-500'
                              : sign.recognition_rate >= 70
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                          }`}
                          style={{ width: `${sign.recognition_rate}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-foreground">{sign.recognition_rate}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-foreground">{sign.attempts}</td>
                  <td className="px-6 py-4 text-sm text-foreground">
                    {(sign.avg_confidence * 100).toFixed(0)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Needs Improvement */}
      <div className="rounded-2xl border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 p-6">
        <div className="flex items-start gap-4">
          <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-yellow-900 dark:text-yellow-300 mb-3">Signs Needing Practice</h3>
            <div className="space-y-2">
              {lowestPerforming.map((sign) => (
                <div key={sign.sign} className="flex items-center justify-between text-sm">
                  <span className="text-yellow-800 dark:text-yellow-300">{sign.sign}</span>
                  <span className="font-medium text-yellow-600 dark:text-yellow-400">
                    {sign.recognition_rate}% accuracy
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
