'use client'

import { useEffect, useState } from 'react'
import { X, User, Lock, Camera, Save } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

interface ProfileSheetProps {
  open: boolean
  onClose: () => void
}

export function ProfileSheet({
  open,
  onClose,
}: ProfileSheetProps) {
  const { user } = useAuth()

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    department: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  useEffect(() => {
    if (user) {
      const names = user.name?.split(' ') || []

      setForm((prev) => ({
        ...prev,
        firstName: names[0] || '',
        lastName: names.slice(1).join(' ') || '',
        email: (user as any).email || '',
        department: (user as any).department || 'College of Informatics and Computing Sciences',
      }))
    }
  }, [user])

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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    })
  }

  const handleSave = () => {
    alert('Profile saved successfully!')
    onClose()
  }

  return (
    <>
      {/* Overlay */}

      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}

      <div className="fixed right-0 top-0 z-50 h-screen w-full max-w-xl overflow-y-auto bg-white shadow-2xl transition-all">

        {/* Header */}

        <div className="sticky top-0 flex items-center justify-between border-b bg-primary px-6 py-5">

          <div className="flex items-center gap-3">

            <div className="rounded-full bg-white/20 p-2">

              <User className="h-5 w-5 text-white" />

            </div>

            <div>

              <h2 className="text-xl font-bold text-white">
                Profile Settings
              </h2>

              <p className="text-sm text-white/80">
                Update your personal information
              </p>

            </div>

          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-white transition hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>

        </div>

        {/* Body */}

        <div className="space-y-8 p-6">

          {/* Avatar */}

          <div className="flex flex-col items-center">

            <div className="relative">

              <div className="flex h-28 w-28 items-center justify-center rounded-full bg-primary text-4xl font-bold text-white shadow-lg">

                {user?.name?.charAt(0)}

              </div>

              <button className="absolute bottom-0 right-0 rounded-full bg-yellow-400 p-2 shadow hover:bg-yellow-500">

                <Camera className="h-4 w-4 text-black" />

              </button>

            </div>

            <h3 className="mt-4 text-xl font-bold">

              {user?.name}

            </h3>

            <p className="text-sm text-gray-500">

              {(user as any)?.role === 'admin'
                ? 'Administrator'
                : 'Teacher'}

            </p>

          </div>

          {/* Personal Information */}

          <section>

            <h3 className="mb-4 text-lg font-semibold">
              Personal Information
            </h3>

            <div className="grid gap-5">

              <div>

                <label className="mb-2 block text-sm font-medium">
                  First Name
                </label>

                <input
                  name="firstName"
                  value={form.firstName}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-primary"
                />

              </div>

              <div>

                <label className="mb-2 block text-sm font-medium">
                  Last Name
                </label>

                <input
                  name="lastName"
                  value={form.lastName}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-primary"
                />

              </div>

              <div>

                <label className="mb-2 block text-sm font-medium">
                  Email
                </label>

                <input
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-primary"
                />

              </div>

              <div>

                <label className="mb-2 block text-sm font-medium">
                  Department
                </label>

                <input
                  name="department"
                  value={form.department}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-primary"
                />

              </div>

            </div>

          </section>

          {/* Change Password */}

          <section>

            <div className="mb-4 flex items-center gap-2">

              <Lock className="h-5 w-5 text-primary" />

              <h3 className="text-lg font-semibold">
                Change Password
              </h3>

            </div>

            <div className="space-y-4">

              <div>

                <label className="mb-2 block text-sm font-medium">
                  Current Password
                </label>

                <input
                  type="password"
                  name="currentPassword"
                  value={form.currentPassword}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-primary"
                />

              </div>

              <div>

                <label className="mb-2 block text-sm font-medium">
                  New Password
                </label>

                <input
                  type="password"
                  name="newPassword"
                  value={form.newPassword}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-primary"
                />

              </div>

              <div>

                <label className="mb-2 block text-sm font-medium">
                  Confirm Password
                </label>

                <input
                  type="password"
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-primary"
                />

              </div>

            </div>

          </section>

        </div>

        {/* Footer */}

        <div className="sticky bottom-0 flex justify-end gap-3 border-t bg-white p-6">

          <button
            onClick={onClose}
            className="rounded-xl border px-6 py-3 font-medium hover:bg-gray-100"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-white transition hover:opacity-90"
          >
            <Save className="h-4 w-4" />
            Save Changes
          </button>

        </div>

      </div>
    </>
  )
}