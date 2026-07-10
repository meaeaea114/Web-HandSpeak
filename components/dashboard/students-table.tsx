'use client'

import { Student } from '@/lib/mock-data'
import { AlertCircle, TrendingUp } from 'lucide-react'

interface StudentsTableProps {
  students: Student[]
  onSelectStudent: (student: Student) => void
}

export function StudentsTable({ students, onSelectStudent }: StudentsTableProps) {
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

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'Low':
        return 'text-green-600 dark:text-green-400'
      case 'Medium':
        return 'text-yellow-600 dark:text-yellow-400'
      case 'High':
        return 'text-red-600 dark:text-red-400'
      default:
        return 'text-gray-600'
    }
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Name</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Section</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Level</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Mastery</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Accuracy</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Risk</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Action</th>
          </tr>
        </thead>
        <tbody>
          {students.map((student, index) => (
            <tr
              key={student.id}
              className={`${
                index !== students.length - 1 ? 'border-b border-border' : ''
              } hover:bg-muted/50 transition-colors`}
            >
              <td className="px-6 py-4">
                <div className="flex flex-col">
                  <p className="font-medium text-foreground">{student.name}</p>
                  <p className="text-xs text-muted-foreground">{student.email}</p>
                </div>
              </td>
              <td className="px-6 py-4 text-sm text-foreground">{student.section}</td>
              <td className="px-6 py-4">
                <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${getLevelColor(student.learningLevel)}`}>
                  {student.learningLevel}
                </span>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-24 rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${student.masteryScore}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-foreground">{student.masteryScore}%</span>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-foreground">{student.accuracyPercentage}%</span>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  {student.riskLevel === 'High' && (
                    <AlertCircle className={`h-4 w-4 ${getRiskColor(student.riskLevel)}`} />
                  )}
                  <span className={`text-sm font-medium ${getRiskColor(student.riskLevel)}`}>
                    {student.riskLevel}
                  </span>
                </div>
              </td>
              <td className="px-6 py-4">
                <button
                  onClick={() => onSelectStudent(student)}
                  className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                >
                  View Profile
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
