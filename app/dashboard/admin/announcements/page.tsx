'use client'

import { useState } from 'react'
import { Plus, Edit2, Trash2, Pin, Calendar, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/lib/auth-context'
import { Permission } from '@/lib/rbac'

interface Announcement {
  id: string
  title: string
  description: string
  priority: 'high' | 'normal' | 'low'
  pinned: boolean
  datePosted: string
  scheduledDate?: string
  status: 'published' | 'scheduled' | 'draft'
}

const mockAnnouncements: Announcement[] = [
  {
    id: '1',
    title: 'System Maintenance Notice',
    description: 'The system will be under maintenance on Saturday from 2 AM to 6 AM. Please plan accordingly.',
    priority: 'high',
    pinned: true,
    datePosted: '2024-06-05',
    status: 'published',
  },
  {
    id: '2',
    title: 'New Content Approval Guidelines',
    description: 'Updated content submission guidelines are now available. All teachers should review the new standards.',
    priority: 'normal',
    pinned: false,
    datePosted: '2024-06-03',
    status: 'published',
  },
  {
    id: '3',
    title: 'End of Quarter Report Submission',
    description: 'All quarterly reports must be submitted by June 30th. Late submissions will not be accepted.',
    priority: 'high',
    pinned: false,
    datePosted: '2024-06-01',
    status: 'published',
  },
]

export default function AnnouncementsPage() {
  const { hasPermission } = useAuth()
  const [announcements, setAnnouncements] = useState<Announcement[]>(mockAnnouncements)
  const [showForm, setShowForm] = useState(false)

  if (!hasPermission(Permission.MANAGE_ANNOUNCEMENTS)) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-foreground">Access Denied</p>
          <p className="text-sm text-muted-foreground">You don't have permission to manage announcements</p>
        </div>
      </div>
    )
  }

  const togglePin = (id: string) => {
    setAnnouncements(announcements.map((a) => (a.id === id ? { ...a, pinned: !a.pinned } : a)))
  }

  const deleteAnnouncement = (id: string) => {
    setAnnouncements(announcements.filter((a) => a.id !== id))
  }

  const pinnedAnnouncements = announcements.filter((a) => a.pinned)
  const otherAnnouncements = announcements.filter((a) => !a.pinned)

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800'
      case 'normal':
        return 'bg-blue-100 text-blue-800'
      case 'low':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">System Announcements</h1>
          <p className="mt-1 text-sm text-muted-foreground">Publish announcements visible to all teachers</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Announcement
        </Button>
      </div>

      {/* Pinned Announcements */}
      {pinnedAnnouncements.length > 0 && (
        <div className="space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Pin className="h-5 w-5 text-yellow-600" />
            Pinned Announcements
          </h2>
          <div className="grid gap-4">
            {pinnedAnnouncements.map((announcement) => (
              <Card key={announcement.id} className="border-l-4 border-l-yellow-500 p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground">{announcement.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{announcement.description}</p>
                    <div className="mt-4 flex items-center gap-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getPriorityColor(announcement.priority)}`}>
                        {announcement.priority.charAt(0).toUpperCase() + announcement.priority.slice(1)} Priority
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(announcement.datePosted).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="ml-4 flex gap-2">
                    <button onClick={() => togglePin(announcement.id)} className="rounded p-2 hover:bg-muted" title="Unpin">
                      <Pin className="h-4 w-4 text-yellow-600" />
                    </button>
                    <button onClick={() => setShowForm(true)} className="rounded p-2 hover:bg-muted" title="Edit">
                      <Edit2 className="h-4 w-4 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => deleteAnnouncement(announcement.id)}
                      className="rounded p-2 hover:bg-destructive/10"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Other Announcements */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">All Announcements</h2>
        <div className="grid gap-4">
          {otherAnnouncements.length === 0 ? (
            <Card className="p-12 text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-sm text-muted-foreground">No announcements yet. Create one to get started.</p>
            </Card>
          ) : (
            otherAnnouncements.map((announcement) => (
              <Card key={announcement.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground">{announcement.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{announcement.description}</p>
                    <div className="mt-4 flex items-center gap-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getPriorityColor(announcement.priority)}`}>
                        {announcement.priority.charAt(0).toUpperCase() + announcement.priority.slice(1)} Priority
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(announcement.datePosted).toLocaleDateString()}
                      </span>
                      <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
                        {announcement.status.charAt(0).toUpperCase() + announcement.status.slice(1)}
                      </span>
                    </div>
                  </div>
                  <div className="ml-4 flex gap-2">
                    <button
                      onClick={() => togglePin(announcement.id)}
                      className="rounded p-2 hover:bg-muted"
                      title="Pin announcement"
                    >
                      <Pin className="h-4 w-4 text-muted-foreground" />
                    </button>
                    <button onClick={() => setShowForm(true)} className="rounded p-2 hover:bg-muted" title="Edit">
                      <Edit2 className="h-4 w-4 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => deleteAnnouncement(announcement.id)}
                      className="rounded p-2 hover:bg-destructive/10"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Total Announcements</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{announcements.length}</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Published</p>
          <p className="mt-2 text-3xl font-bold text-green-600">{announcements.filter((a) => a.status === 'published').length}</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Pinned</p>
          <p className="mt-2 text-3xl font-bold text-yellow-600">{pinnedAnnouncements.length}</p>
        </Card>
      </div>
    </div>
  )
}
