'use client'

import { ReactNode } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Permission } from '@/lib/rbac'

interface PermissionGateProps {
  permission: Permission | Permission[]
  children: ReactNode
  fallback?: ReactNode
  requireAll?: boolean
}

export function PermissionGate({
  permission,
  children,
  fallback = null,
  requireAll = false,
}: PermissionGateProps) {
  const { hasPermission } = useAuth()

  const permissions = Array.isArray(permission) ? permission : [permission]
  const hasRequiredPermission = requireAll
    ? permissions.every((p) => hasPermission(p))
    : permissions.some((p) => hasPermission(p))

  if (!hasRequiredPermission) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
