'use client'

import { Users, AlertCircle, Eye, MoreVertical } from 'lucide-react'

interface FacultyCardProps {
  faculty: {
    id: string
    name: string
    email: string
    role: string
    sections: string[]
    studentsAssigned: number
    interventionCount: number
    lastActive: string
  }
}

export function FacultyCard({ faculty }: FacultyCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 hover:shadow-md transition-all">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/20">
            <span className="text-lg font-bold text-primary">
              {faculty.name.split(' ').map(n => n[0]).join('')}
            </span>
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{faculty.name}</h3>
            <p className="text-xs text-muted-foreground">{faculty.role}</p>
          </div>
        </div>
        <button className="rounded-lg p-1 hover:bg-muted">
          <MoreVertical className="h-5 w-5 text-muted-foreground" />
        </button>
      </div>

      {/* Email */}
      <p className="mb-4 text-sm text-muted-foreground">{faculty.email}</p>

      {/* Sections */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-muted-foreground mb-2">Assigned Sections</p>
        <div className="flex flex-wrap gap-2">
          {faculty.sections.map((section) => (
            <span
              key={section}
              className="inline-block rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
            >
              {section}
            </span>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-muted p-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-secondary" />
            <span className="text-xs text-muted-foreground">Students</span>
          </div>
          <p className="mt-1 text-lg font-bold text-foreground">
            {faculty.studentsAssigned}
          </p>
        </div>
        <div className="rounded-lg bg-muted p-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-accent" />
            <span className="text-xs text-muted-foreground">Interventions</span>
          </div>
          <p className="mt-1 text-lg font-bold text-foreground">
            {faculty.interventionCount}
          </p>
        </div>
      </div>

      {/* Last Active */}
      <p className="mb-4 text-xs text-muted-foreground">
        Last active: {faculty.lastActive}
      </p>

      {/* Action Button */}
      <button className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary/10 py-2.5 font-medium text-primary hover:bg-primary/20 transition-colors">
        <Eye className="h-4 w-4" />
        View Details
      </button>
    </div>
  )
}
