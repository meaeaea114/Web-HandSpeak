'use client'

import { useState } from 'react'
import { Save, Bell, Lock, Globe } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth-context'
import { Permission } from '@/lib/rbac'

export default function SettingsPage() {
  const { hasPermission } = useAuth()
  const [settings, setSettings] = useState({
    siteName: 'HandSpeak',
    siteDescription: 'Filipino Sign Language Learning Platform',
    maintenanceMode: false,
    emailNotifications: true,
    systemLogsRetention: 90,
    maxUploadSize: 50,
  })

  if (!hasPermission(Permission.MANAGE_SETTINGS)) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-foreground">Access Denied</p>
          <p className="text-sm text-muted-foreground">You don't have permission to manage system settings</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">System Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Configure system-wide settings and preferences</p>
      </div>

      {/* General Settings */}
      <Card className="p-6">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <Globe className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">General Settings</h2>
        </div>
        <div className="mt-6 space-y-6">
          <div>
            <label className="text-sm font-medium text-foreground">Site Name</label>
            <input
              type="text"
              value={settings.siteName}
              onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
              className="mt-2 w-full rounded-lg border border-input bg-background px-4 py-2 text-foreground"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Site Description</label>
            <textarea
              value={settings.siteDescription}
              onChange={(e) => setSettings({ ...settings, siteDescription: e.target.value })}
              className="mt-2 w-full rounded-lg border border-input bg-background px-4 py-2 text-foreground"
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-input p-4">
            <div>
              <p className="font-medium text-foreground">Maintenance Mode</p>
              <p className="text-sm text-muted-foreground">Enable to temporarily disable system access</p>
            </div>
            <input
              type="checkbox"
              checked={settings.maintenanceMode}
              onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
              className="h-5 w-5"
            />
          </div>
        </div>
      </Card>

      {/* Notification Settings */}
      <Card className="p-6">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <Bell className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Notification Settings</h2>
        </div>
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-input p-4">
            <div>
              <p className="font-medium text-foreground">Email Notifications</p>
              <p className="text-sm text-muted-foreground">Send email notifications for important events</p>
            </div>
            <input
              type="checkbox"
              checked={settings.emailNotifications}
              onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
              className="h-5 w-5"
            />
          </div>
        </div>
      </Card>

      {/* Security Settings */}
      <Card className="p-6">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <Lock className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Security Settings</h2>
        </div>
        <div className="mt-6 space-y-6">
          <div>
            <label className="text-sm font-medium text-foreground">System Logs Retention (days)</label>
            <input
              type="number"
              value={settings.systemLogsRetention}
              onChange={(e) => setSettings({ ...settings, systemLogsRetention: parseInt(e.target.value) })}
              className="mt-2 w-full rounded-lg border border-input bg-background px-4 py-2 text-foreground"
            />
            <p className="mt-1 text-xs text-muted-foreground">How long to keep system logs before deletion</p>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Maximum Upload Size (MB)</label>
            <input
              type="number"
              value={settings.maxUploadSize}
              onChange={(e) => setSettings({ ...settings, maxUploadSize: parseInt(e.target.value) })}
              className="mt-2 w-full rounded-lg border border-input bg-background px-4 py-2 text-foreground"
            />
            <p className="mt-1 text-xs text-muted-foreground">Maximum file size for uploads</p>
          </div>
        </div>
      </Card>

      {/* Save Button */}
      <Button className="gap-2" size="lg">
        <Save className="h-4 w-4" />
        Save Settings
      </Button>
    </div>
  )
}
