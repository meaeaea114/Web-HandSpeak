'use client'

import { useEffect, useState } from 'react'
import {
  X,
  Bell,
  AlertCircle,
  CheckCircle2,
  Mail,
  Trash2,
} from 'lucide-react'

interface NotificationSheetProps {
  open: boolean
  onClose: () => void
}

const initialNotifications = [
  {
    id: 1,
    title: 'Student Achievement',
    message: 'Maria Santos reached 90% proficiency in Module 3.',
    time: '2 hours ago',
    read: false,
    icon: CheckCircle2,
    color: 'text-green-600',
    bg: 'bg-green-100',
  },
  {
    id: 2,
    title: 'Low Performance Alert',
    message: 'Three students require intervention in Module 2.',
    time: '4 hours ago',
    read: false,
    icon: AlertCircle,
    color: 'text-red-600',
    bg: 'bg-red-100',
  },
  {
    id: 3,
    title: 'New Content Available',
    message: 'The Alphabet module has been updated.',
    time: 'Yesterday',
    read: true,
    icon: Bell,
    color: 'text-yellow-600',
    bg: 'bg-yellow-100',
  },
  {
    id: 4,
    title: 'New Message',
    message: 'You received feedback from a teacher.',
    time: '2 days ago',
    read: true,
    icon: Mail,
    color: 'text-blue-600',
    bg: 'bg-blue-100',
  },
]

export function NotificationSheet({
  open,
  onClose,
}: NotificationSheetProps) {
  const [notifications, setNotifications] =
    useState(initialNotifications)

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
    }

    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [open])

  if (!open) return null

  const unreadCount = notifications.filter(
    (n) => !n.read
  ).length

  const markAsRead = (id: number) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id
          ? {
              ...n,
              read: true,
            }
          : n
      )
    )
  }

  const markAllAsRead = () => {
    setNotifications((prev) =>
      prev.map((n) => ({
        ...n,
        read: true,
      }))
    )
  }

  const clearNotifications = () => {
    setNotifications([])
  }

  return (
    <>
      {/* Overlay */}

      <div
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
      />

      {/* Sheet */}

      <div className="fixed right-0 top-0 z-50 flex h-screen w-full max-w-md flex-col bg-white shadow-2xl">

        {/* Header */}

        <div className="flex items-center justify-between border-b bg-primary px-6 py-5">

          <div>

            <h2 className="text-xl font-bold text-white">
              Notifications
            </h2>

            <p className="text-sm text-white/80">
              {unreadCount} unread notifications
            </p>

          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-white transition hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>

        </div>

        {/* Actions */}

        <div className="flex gap-3 border-b p-4">

          <button
            onClick={markAllAsRead}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Mark All Read
          </button>

          <button
            onClick={clearNotifications}
            className="flex items-center gap-2 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
            Clear
          </button>

        </div>

        {/* Notification List */}

        <div className="flex-1 overflow-y-auto">

          {notifications.length === 0 ? (

            <div className="flex h-full flex-col items-center justify-center px-6 text-center">

              <Bell className="mb-4 h-16 w-16 text-gray-300" />

              <h3 className="text-lg font-semibold">
                No Notifications
              </h3>

              <p className="mt-2 text-sm text-gray-500">
                You're all caught up.
              </p>

            </div>

          ) : (

            <div className="divide-y">

              {notifications.map((notification) => {

                const Icon = notification.icon

                return (

                  <button
                    key={notification.id}
                    onClick={() => markAsRead(notification.id)}
                    className={`flex w-full items-start gap-4 p-5 text-left transition hover:bg-gray-50 ${
                      !notification.read
                        ? 'bg-primary/5'
                        : ''
                    }`}
                  >

                    <div
                      className={`rounded-full p-3 ${notification.bg}`}
                    >
                      <Icon
                        className={`h-5 w-5 ${notification.color}`}
                      />
                    </div>

                    <div className="flex-1">

                      <div className="flex items-start justify-between">

                        <h4 className="font-semibold">
                          {notification.title}
                        </h4>

                        {!notification.read && (
                          <span className="ml-2 mt-2 h-2 w-2 rounded-full bg-primary" />
                        )}

                      </div>

                      <p className="mt-1 text-sm text-gray-600">
                        {notification.message}
                      </p>

                      <p className="mt-2 text-xs text-gray-400">
                        {notification.time}
                      </p>

                    </div>

                  </button>

                )
              })}

            </div>

          )}

        </div>

      </div>
    </>
  )
}