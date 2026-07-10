'use client'

import { useState } from 'react'
import { Bell, Mail, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/lib/auth-context'
import { Permission } from '@/lib/rbac'

const mockNotifications = [
  {
    id: 1,
    type: 'achievement',
    title: 'Student Achievement',
    message: 'Maria Santos reached 90% proficiency in Module 3',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    read: false,
    icon: CheckCircle2,
  },
  {
    id: 2,
    type: 'alert',
    title: 'Low Performance Alert',
    message: '3 students need attention in Module 2',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
    read: false,
    icon: AlertCircle,
  },
  {
    id: 3,
    type: 'announcement',
    title: 'New Content Available',
    message: 'Alphabet Module updated with new vocabulary',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
    read: true,
    icon: Bell,
  },
  {
    id: 4,
    type: 'system',
    title: 'System Maintenance',
    message: 'Scheduled maintenance completed successfully',
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    read: true,
    icon: Bell,
  },
]

export default function NotificationsPage() {
  const { hasPermission } = useAuth()
  const [notifications, setNotifications] = useState(mockNotifications)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  if (!hasPermission(Permission.VIEW_NOTIFICATIONS)) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-foreground">Access Denied</p>
          <p className="text-sm text-muted-foreground">You don't have permission to view notifications</p>
        </div>
      </div>
    )
  }

  const filteredNotifications = filter === 'unread' ? notifications.filter((n) => !n.read) : notifications

  const handleMarkAsRead = (id: number) => {
    setNotifications(notifications.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }

  const handleClearAll = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">Stay updated with important messages</p>
        </div>
        <button
          onClick={handleClearAll}
          className="rounded-lg bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20"
        >
          Mark All as Read
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 font-medium transition-colors ${
            filter === 'all' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          All Notifications
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-4 py-2 font-medium transition-colors ${
            filter === 'unread' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Unread ({notifications.filter((n) => !n.read).length})
        </button>
      </div>

      {/* Notifications List */}
      <div className="space-y-2">
        {filteredNotifications.length === 0 ? (
          <Card className="p-12 text-center">
            <Bell className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-foreground">No notifications to display</p>
          </Card>
        ) : (
          filteredNotifications.map((notification) => {
            const IconComponent = notification.icon
            return (
              <Card
                key={notification.id}
                className={`p-4 transition-colors cursor-pointer hover:bg-muted/50 ${
                  !notification.read ? 'bg-primary/5 border-primary/20' : ''
                }`}
                onClick={() => handleMarkAsRead(notification.id)}
              >
                <div className="flex items-start gap-4">
                  <div className={`mt-1 flex h-10 w-10 items-center justify-center rounded-lg ${
                    !notification.read ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                  }`}>
                    <IconComponent className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-foreground">{notification.title}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
                      </div>
                      {!notification.read && (
                        <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                      )}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {notification.timestamp.toLocaleString()}
                    </p>
                  </div>
                </div>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
