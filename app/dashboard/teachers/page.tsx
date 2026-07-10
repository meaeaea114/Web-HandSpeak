'use client'

import { useState } from 'react'
import { Plus, Search, Filter, Edit2, Trash2, Lock, Unlock, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/lib/auth-context'
import { Permission } from '@/lib/rbac'

interface Teacher {
  id: string
  name: string
  email: string
  department: string
  subjects: string[]
  status: 'active' | 'inactive'
  joinDate: string
}

const mockTeachers: Teacher[] = [
  {
    id: '1',
    name: 'Ma. Santos',
    email: 'ma.santos@school.edu',
    department: 'FSL Studies',
    subjects: ['FSL 101', 'FSL 201'],
    status: 'active',
    joinDate: '2023-01-15',
  },
  {
    id: '2',
    name: 'Juan Dela Cruz',
    email: 'juan.delacruz@school.edu',
    department: 'FSL Studies',
    subjects: ['FSL 301', 'Advanced FSL'],
    status: 'active',
    joinDate: '2023-03-20',
  },
  {
    id: '3',
    name: 'Rosa Hernandez',
    email: 'rosa.hernandez@school.edu',
    department: 'FSL Studies',
    subjects: ['FSL 102'],
    status: 'inactive',
    joinDate: '2023-02-10',
  },
]

export default function TeacherAccountsPage() {
  const { hasPermission } = useAuth()
  const [teachers, setTeachers] = useState<Teacher[]>(mockTeachers)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null)
  const [showForm, setShowForm] = useState(false)

  if (!hasPermission(Permission.MANAGE_TEACHERS)) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-foreground">Access Denied</p>
          <p className="text-sm text-muted-foreground">You don't have permission to manage teacher accounts</p>
        </div>
      </div>
    )
  }

  const filteredTeachers = teachers.filter(
    (teacher) =>
      teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teacher.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const toggleStatus = (id: string) => {
    setTeachers(
      teachers.map((t) => (t.id === id ? { ...t, status: t.status === 'active' ? 'inactive' : 'active' } : t))
    )
  }

  const deleteTeacher = (id: string) => {
    setTeachers(teachers.filter((t) => t.id !== id))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Teacher Accounts</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage and monitor all teacher accounts</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Teacher
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-input bg-background py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <button className="flex items-center gap-2 rounded-lg border border-input px-4 py-2 text-sm text-foreground hover:bg-muted">
          <Filter className="h-4 w-4" />
          Filter
        </button>
      </div>

      {/* Teachers Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Name</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Email</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Department</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Subjects</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredTeachers.map((teacher) => (
                <tr key={teacher.id} className="hover:bg-muted/50">
                  <td className="px-6 py-4 text-sm font-medium text-foreground">{teacher.name}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{teacher.email}</td>
                  <td className="px-6 py-4 text-sm text-foreground">{teacher.department}</td>
                  <td className="px-6 py-4 text-sm text-foreground">
                    <div className="flex flex-wrap gap-1">
                      {teacher.subjects.map((subject) => (
                        <span key={subject} className="rounded bg-primary/20 px-2 py-1 text-xs text-primary">
                          {subject}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        teacher.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {teacher.status.charAt(0).toUpperCase() + teacher.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedTeacher(teacher)}
                        className="rounded p-2 hover:bg-muted"
                        title="View details"
                      >
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => setSelectedTeacher(teacher)}
                        className="rounded p-2 hover:bg-muted"
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => toggleStatus(teacher.id)}
                        className="rounded p-2 hover:bg-muted"
                        title={teacher.status === 'active' ? 'Deactivate' : 'Activate'}
                      >
                        {teacher.status === 'active' ? (
                          <Lock className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Unlock className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                      <button
                        onClick={() => deleteTeacher(teacher.id)}
                        className="rounded p-2 hover:bg-destructive/10"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Total Teachers</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{teachers.length}</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Active Teachers</p>
          <p className="mt-2 text-3xl font-bold text-green-600">{teachers.filter((t) => t.status === 'active').length}</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Inactive Teachers</p>
          <p className="mt-2 text-3xl font-bold text-gray-600">{teachers.filter((t) => t.status === 'inactive').length}</p>
        </Card>
      </div>
    </div>
  )
}
