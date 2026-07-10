'use client'

import { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Permission } from '@/lib/rbac'

interface ProtectedRouteProps {
  children: ReactNode
  requiredPermissions?: Permission[]
  requireAll?: boolean
  fallback?: ReactNode
}

export function ProtectedRoute({
  children,
  requiredPermissions = [],
  requireAll = false,
  fallback,
}: ProtectedRouteProps) {
  const { isAuthenticated, user, hasPermission } = useAuth()
  const router = useRouter()

  if (!isAuthenticated) {
    router.push('/login')
    return null
  }

  if (requiredPermissions.length > 0) {
    const hasRequiredPermissions = requireAll
      ? requiredPermissions.every((perm) => hasPermission(perm))
      : requiredPermissions.some((perm) => hasPermission(perm))

    if (!hasRequiredPermissions) {
      return (
        fallback || (
          <div className="flex min-h-screen items-center justify-center bg-background">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
              <p className="mt-2 text-muted-foreground">
                You don&apos;t have permission to access this page.
              </p>
              <button
                onClick={() => router.push('/dashboard')}
                className="mt-4 rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        )
      )
    }
  }

  return <>{children}</>
}
