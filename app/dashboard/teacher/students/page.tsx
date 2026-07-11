'use client'

import { useState } from 'react'
import { mockStudents } from '@/lib/mock-data'
import { StudentsTable } from '@/components/dashboard/students-table'
import { StudentProfileDrawer } from '@/components/dashboard/student-profile-drawer'
import { Student } from '@/lib/mock-data'
import { Search, Filter } from 'lucide-react'

export default function StudentsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [filterLevel, setFilterLevel] = useState<string>('all')

  const filteredStudents = mockStudents.filter((student) => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterLevel === 'all' || student.learningLevel === filterLevel
    return matchesSearch && matchesFilter
  })

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Students</h1>
        <p className="mt-2 text-muted-foreground">
          Manage and monitor your student learners
        </p>
      </div>

      {/* Filters and Search */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-border bg-card pl-10 pr-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-muted-foreground" />
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className="rounded-lg border border-border bg-card px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Levels</option>
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
          </select>
        </div>
      </div>

      {/* Students Table */}
      <StudentsTable
        students={filteredStudents}
        onSelectStudent={setSelectedStudent}
      />

      {/* Student Profile Drawer */}
      {selectedStudent && (
        <StudentProfileDrawer
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
        />
      )}
    </div>
  )
}
