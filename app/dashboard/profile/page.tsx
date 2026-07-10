'use client'

import { useState } from 'react'
import { User, Phone, MapPin, Save } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth-context'
import { Permission } from '@/lib/rbac'

export default function ProfileSettingsPage() {
  const { hasPermission, user } = useAuth()
  const [profile, setProfile] = useState({
    firstName: user?.name?.split(' ')[0] || 'John',
    lastName: user?.name?.split(' ')[1] || 'Doe',
    phone: '+1 (555) 123-4567',
    department: user?.department || 'Language Arts',
    bio: 'Dedicated teacher focused on student success.',
    avatar: 'JD',
  })

  if (!hasPermission(Permission.MANAGE_PROFILE)) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-foreground">Access Denied</p>
          <p className="text-sm text-muted-foreground">You don't have permission to manage profiles</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Profile Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Update your personal information and preferences</p>
      </div>

      {/* Avatar Section */}
      <Card className="p-6">
        <div className="flex items-center gap-6">
          <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-primary text-2xl font-bold text-white">
            {profile.avatar}
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Profile Picture</h3>
            <p className="text-sm text-muted-foreground">Upload a new profile picture</p>
            <Button className="mt-3" variant="outline">
              Upload Photo
            </Button>
          </div>
        </div>
      </Card>

      {/* Personal Information */}
      <Card className="p-6">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <User className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Personal Information</h2>
        </div>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-foreground">First Name</label>
            <input
              type="text"
              value={profile.firstName}
              onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
              className="mt-2 w-full rounded-lg border border-input bg-background px-4 py-2 text-foreground"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Last Name</label>
            <input
              type="text"
              value={profile.lastName}
              onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
              className="mt-2 w-full rounded-lg border border-input bg-background px-4 py-2 text-foreground"
            />
          </div>
        </div>
      </Card>

      {/* Contact Information */}
      <Card className="p-6">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <Phone className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Contact Information</h2>
        </div>
        <div className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Phone Number</label>
            <input
              type="tel"
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              className="mt-2 w-full rounded-lg border border-input bg-background px-4 py-2 text-foreground"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Department</label>
            <input
              type="text"
              value={profile.department}
              onChange={(e) => setProfile({ ...profile, department: e.target.value })}
              className="mt-2 w-full rounded-lg border border-input bg-background px-4 py-2 text-foreground"
            />
          </div>
        </div>
      </Card>

      {/* Bio */}
      <Card className="p-6">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <MapPin className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Bio</h2>
        </div>
        <div className="mt-6">
          <label className="text-sm font-medium text-foreground">Professional Bio</label>
          <textarea
            value={profile.bio}
            onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
            rows={5}
            className="mt-2 w-full rounded-lg border border-input bg-background px-4 py-2 text-foreground"
          />
          <p className="mt-1 text-xs text-muted-foreground">{profile.bio.length}/500 characters</p>
        </div>
      </Card>

      {/* Save Button */}
      <Button className="gap-2" size="lg">
        <Save className="h-4 w-4" />
        Save Profile
      </Button>
    </div>
  )
}
