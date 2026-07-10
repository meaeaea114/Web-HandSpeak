'use client'

import { Student } from '@/lib/mock-data'
import { X, Calendar, Award, Target, TrendingUp } from 'lucide-react'

interface StudentProfileDrawerProps {
  student: Student
  onClose: () => void
}

export function StudentProfileDrawer({ student, onClose }: StudentProfileDrawerProps) {
  const getLevelColor = (level: string) => {
    switch (level) {
      case 'Beginner':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
      case 'Intermediate':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
      case 'Advanced':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 z-50 h-full w-full max-w-lg overflow-y-auto bg-card shadow-xl md:max-w-md">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-card px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">Student Profile</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-muted"
          >
            <X className="h-5 w-5 text-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/20">
                <span className="text-2xl font-bold text-primary">
                  {student.name.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">{student.name}</h3>
                <p className="text-sm text-muted-foreground">{student.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-muted p-3">
                <p className="text-xs font-medium text-muted-foreground">Section</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{student.section}</p>
              </div>
              <div className="rounded-lg bg-muted p-3">
                <p className="text-xs font-medium text-muted-foreground">Enrolled</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{student.enrolledDate}</p>
              </div>
            </div>
          </div>

          {/* Learning Level */}
          <div>
            <p className="text-sm font-semibold text-foreground mb-2">Learning Level</p>
            <span className={`inline-block rounded-full px-4 py-2 text-sm font-semibold ${getLevelColor(student.learningLevel)}`}>
              {student.learningLevel}
            </span>
          </div>

          {/* Performance Metrics */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  <p className="text-sm font-medium text-foreground">Mastery Score</p>
                </div>
                <span className="text-sm font-bold text-primary">{student.masteryScore}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${student.masteryScore}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-secondary" />
                  <p className="text-sm font-medium text-foreground">Completion</p>
                </div>
                <span className="text-sm font-bold text-secondary">{student.completionPercentage}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-secondary transition-all"
                  style={{ width: `${student.completionPercentage}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-accent" />
                  <p className="text-sm font-medium text-foreground">Accuracy</p>
                </div>
                <span className="text-sm font-bold text-accent">{student.accuracyPercentage}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-accent transition-all"
                  style={{ width: `${student.accuracyPercentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* Risk Assessment */}
          <div className="rounded-lg border border-border p-4">
            <p className="text-sm font-semibold text-foreground mb-3">Risk Assessment</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Current Level:</span>
                <span className={`text-sm font-semibold ${
                  student.riskLevel === 'Low'
                    ? 'text-green-600'
                    : student.riskLevel === 'Medium'
                      ? 'text-yellow-600'
                      : 'text-red-600'
                }`}>
                  {student.riskLevel} Risk
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button className="flex-1 rounded-lg border border-border py-2.5 font-medium text-primary hover:bg-primary/5">
              View Progress
            </button>
            <button className="flex-1 rounded-lg bg-primary py-2.5 font-medium text-primary-foreground hover:bg-primary/90">
              Intervene
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
