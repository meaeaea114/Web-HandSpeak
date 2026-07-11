'use client'

import { useState } from 'react'
import { Plus, Search, Filter, Edit2, Trash2, Lock, Unlock, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/lib/auth-context'

// Explicitly define the local Teacher type interface
interface Teacher {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'inactive';
  joinedDate: string;
}

// Simulated backup records for local state initialization
const mockTeachers: Teacher[] = [
  { id: '1', name: 'Sir Eddie', email: 'eddie@batstate-u.edu.ph', status: 'active', joinedDate: '2026-01-15' },
  { id: '2', name: 'Ms. Jet', email: 'jet@batstate-u.edu.ph', status: 'active', joinedDate: '2026-02-10' }
]

export default function TeacherAccountsPage() {
  // Destructure 'user' directly out of your auth hook context to resolve the error
  const { user } = useAuth()

  const [teachers, setTeachers] = useState<Teacher[]>(mockTeachers)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null)
  const [showForm, setShowForm] = useState(false)

  // Clean string-literal restriction validation gate
  if (user?.role !== 'admin') {
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Faculty Management</h1>
          <p className="text-sm text-muted-foreground">
            Create, monitor, and configure administrator authentication accounts for school teachers.
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} className="flex items-center gap-2 self-start sm:self-auto">
          <Plus className="h-4 w-4" />
          Add New Teacher
        </Button>
      </div>

      <Card className="p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search faculty by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <Button variant="outline" className="flex items-center gap-2 self-start md:self-auto">
            <Filter className="h-4 w-4" />
            Filter Status
          </Button>
        </div>

        <div className="overflow-x-auto rounded-md border bg-card">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b bg-muted/50 font-medium text-muted-foreground">
                <th className="p-4">Name</th>
                <th className="p-4">Email Address</th>
                <th className="p-4">Joined Date</th>
                <th className="p-4">Account Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTeachers.map((teacher) => (
                <tr key={teacher.id} className="border-b transition-colors hover:bg-muted/30">
                  <td className="p-4 font-medium">{teacher.name}</td>
                  <td className="p-4 text-muted-foreground">{teacher.email}</td>
                  <td className="p-4 text-muted-foreground">{teacher.joinedDate}</td>
                  <td className="p-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        teacher.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : 'bg-rose-500/10 text-rose-500'
                      }`}
                    >
                      {teacher.status.charAt(0).toUpperCase() + teacher.status.slice(1)}
                    </span>
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <Button variant="ghost" size="icon" title="View Details">
                      <Eye className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" title="Edit Access">
                      <Edit2 className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" title={teacher.status === 'active' ? 'Suspend' : 'Activate'}>
                      {teacher.status === 'active' ? (
                        <Lock className="h-4 w-4 text-muted-foreground hover:text-amber-500" />
                      ) : (
                        <Unlock className="h-4 w-4 text-muted-foreground hover:text-emerald-500" />
                      )}
                    </Button>
                  </td>
                </tr>
              ))}
              {filteredTeachers.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    No matching teacher accounts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}