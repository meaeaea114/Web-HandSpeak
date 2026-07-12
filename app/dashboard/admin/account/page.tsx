'use client'

import { useState } from 'react'
import { Mail, Lock, Shield, User } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth-context'
import { Permission } from '@/lib/rbac'

export default function AccountManagementPage() {
  const { user } = useAuth()
  const [accountData, setAccountData] = useState({
    email: user?.email || 'teacher@handspeak.edu',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    twoFactorEnabled: true,
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Account Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your account settings and security</p>
      </div>

      {/* Email Settings */}
      <Card className="p-6">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <Mail className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Email Address</h2>
        </div>
        <div className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Current Email</label>
            <input
              type="email"
              value={accountData.email}
              disabled
              className="mt-2 w-full rounded-lg border border-input bg-muted px-4 py-2 text-foreground"
            />
          </div>
          <Button className="gap-2">Update Email Address</Button>
        </div>
      </Card>

      {/* Password Settings */}
      <Card className="p-6">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <Lock className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Password</h2>
        </div>
        <div className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Current Password</label>
            <input
              type="password"
              value={accountData.currentPassword}
              onChange={(e) => setAccountData({ ...accountData, currentPassword: e.target.value })}
              className="mt-2 w-full rounded-lg border border-input bg-background px-4 py-2 text-foreground"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">New Password</label>
            <input
              type="password"
              value={accountData.newPassword}
              onChange={(e) => setAccountData({ ...accountData, newPassword: e.target.value })}
              className="mt-2 w-full rounded-lg border border-input bg-background px-4 py-2 text-foreground"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Confirm Password</label>
            <input
              type="password"
              value={accountData.confirmPassword}
              onChange={(e) => setAccountData({ ...accountData, confirmPassword: e.target.value })}
              className="mt-2 w-full rounded-lg border border-input bg-background px-4 py-2 text-foreground"
            />
          </div>
          <Button className="gap-2">Change Password</Button>
        </div>
      </Card>

      {/* Security Settings */}
      <Card className="p-6">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <Shield className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Two-Factor Authentication</h2>
        </div>
        <div className="mt-6">
          <div className="flex items-center justify-between rounded-lg border border-input p-4">
            <div>
              <p className="font-medium text-foreground">Two-Factor Authentication (2FA)</p>
              <p className="text-sm text-muted-foreground">Enhanced security for your account</p>
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={accountData.twoFactorEnabled}
                onChange={(e) => setAccountData({ ...accountData, twoFactorEnabled: e.target.checked })}
                className="h-5 w-5"
              />
              <span className="text-sm font-medium">{accountData.twoFactorEnabled ? 'Enabled' : 'Disabled'}</span>
            </label>
          </div>
        </div>
      </Card>
    </div>
  )
}
