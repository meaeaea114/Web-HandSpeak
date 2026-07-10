# HandSpeak RBAC - Files and Architecture

## Core RBAC System Files

### 1. `/lib/rbac.ts`
**Purpose:** Defines roles, permissions, and permission mappings

**Contains:**
- `Role` enum - Three roles: ADMIN, FACULTY, STUDENT
- `Permission` enum - 23 granular permissions
- `rolePermissions` object - Maps each role to their allowed permissions
- `User` type - User data structure with role
- Helper functions:
  - `hasPermission(role, permission)` - Check if role has permission
  - `hasAnyPermission(role, permissions[])` - Check if role has any permission
  - `hasAllPermissions(role, permissions[])` - Check if role has all permissions
- Mock users for testing: `mockCurrentUser` (Admin), `mockFacultyUser` (Faculty)

**Key Functions:**
```typescript
// Check single permission
hasPermission(Role.FACULTY, Permission.VIEW_STUDENTS)

// Check multiple permissions (any)
hasAnyPermission(Role.ADMIN, [Permission.MANAGE_USERS, Permission.MANAGE_ROLES])

// Check multiple permissions (all)
hasAllPermissions(Role.ADMIN, [Permission.MANAGE_USERS, Permission.MANAGE_ROLES])
```

---

### 2. `/lib/auth-context.tsx`
**Purpose:** React Context for authentication and authorization

**Exports:**
- `AuthProvider` component - Wraps app with auth state
- `useAuth()` hook - Access auth in components

**Features:**
- Manages current user state
- Provides login/logout methods
- Role switcher for testing (`switchRole()`)
- Permission checking via context
- Mock authentication (production: replace with real auth)

**Context Methods:**
```typescript
const { user, isAuthenticated, login, logout, switchRole, hasPermission } = useAuth()
```

**Usage:**
```tsx
<AuthProvider>
  {children}
</AuthProvider>
```

---

## Authentication & Authorization Components

### 3. `/components/auth/protected-route.tsx`
**Purpose:** Component for protecting routes with permission requirements

**Features:**
- Checks authentication
- Validates required permissions
- Redirects unauthorized access
- Shows "Access Denied" for insufficient permissions
- Supports fallback UI

**Usage:**
```tsx
<ProtectedRoute requiredPermissions={[Permission.MANAGE_USERS]}>
  <AdminPanel />
</ProtectedRoute>
```

**Props:**
- `children` - Content to protect
- `requiredPermissions` - Array of required permissions
- `requireAll` - Require all (true) or any (false) permission
- `fallback` - Custom denied UI

---

### 4. `/components/auth/permission-gate.tsx`
**Purpose:** Component-level permission checking

**Features:**
- Conditionally renders content based on permissions
- Support for single or multiple permissions
- Optional fallback content
- Supports "all" or "any" logic

**Usage:**
```tsx
<PermissionGate permission={Permission.MANAGE_CONTENT}>
  <ContentPanel />
</PermissionGate>

<PermissionGate 
  permission={[Permission.MANAGE_USERS, Permission.MANAGE_ROLES]}
  requireAll
  fallback={<p>Access Denied</p>}
>
  <AdminPanel />
</PermissionGate>
```

---

## UI Components (Updated for RBAC)

### 5. `/components/dashboard/sidebar.tsx`
**Updates for RBAC:**
- Added `useAuth()` hook for permission checking
- Navigation items now include `permission` field
- Filters visible items based on user permissions
- Dynamically shows/hides menu items by role
- 14 total items for Admin, 11 for Faculty, 2 for Student

**Key Changes:**
```tsx
const visibleItems = navigationItems.filter(
  (item) => !item.permission || hasPermission(item.permission)
)
```

---

### 6. `/components/dashboard/header.tsx`
**Updates for RBAC:**
- Displays current user name and role
- Shows role badge with color coding:
  - Admin: Red
  - Faculty: Blue
  - Student: Green
- Includes role switcher dropdown (demo feature)
- Logout button in dropdown menu
- Instant UI update on role switch

**Features:**
- Role switcher for testing different user levels
- Visual indication of current role
- Quick logout access
- Responsive design

---

### 7. `/app/dashboard/layout.tsx`
**Updates for RBAC:**
- Wrapped in `<AuthProvider>`
- Makes auth context available to all dashboard routes
- Sidebar and Header use auth context

---

### 8. `/components/ui/card.tsx`
**New Component:**
- Created for admin dashboard styling
- Reusable card component with variants
- Used in Admin Panel and other UI sections
- Supports header, content, footer, title, description

---

## Feature Pages

### 9. `/app/dashboard/admin/page.tsx`
**Purpose:** Admin-exclusive dashboard

**Features:**
- System statistics (students, faculty, lessons, etc.)
- System health status (database, API, storage)
- Recent system activities log
- Admin action cards
- All content gated by `Permission.MANAGE_USERS`

**Visible Only To:** Admin role

**Notable Sections:**
```tsx
<PermissionGate permission={Permission.MANAGE_USERS}>
  {/* Admin content */}
</PermissionGate>

<PermissionGate permission={Permission.VIEW_SYSTEM_LOGS}>
  {/* System logs */}
</PermissionGate>

<PermissionGate permission={Permission.MANAGE_ROLES}>
  {/* Admin actions */}
</PermissionGate>
```

---

## Documentation Files

### 10. `/RBAC.md` (296 lines)
**Complete RBAC Documentation**

Covers:
- Overview of roles and permissions
- Detailed explanation of each role's capabilities
- Permission system breakdown
- Implementation details
- Usage examples
- Testing instructions
- Future enhancements
- Security considerations
- Configuration guide
- Troubleshooting

---

### 11. `/RBAC_TESTING.md` (330 lines)
**Testing and Verification Guide**

Covers:
- Quick start instructions
- Testing each role (Admin, Faculty, Student)
- Feature-specific testing
- Permission gate testing examples
- Role switcher testing
- Sidebar navigation testing
- Protected routes testing
- Browser console testing
- Performance testing
- Integration testing
- Comprehensive troubleshooting guide

---

### 12. `/RBAC_FILES.md` (This File)
**Architecture and File Reference**

Complete reference to all RBAC-related files and their purposes.

---

## Architecture Summary

```
HandSpeak RBAC Architecture
├── Core System
│   ├── lib/rbac.ts (Roles, Permissions, Mappings)
│   └── lib/auth-context.tsx (Auth State & Context)
│
├── Access Control
│   ├── components/auth/protected-route.tsx
│   └── components/auth/permission-gate.tsx
│
├── UI Integration
│   ├── components/dashboard/sidebar.tsx (Dynamic Navigation)
│   ├── components/dashboard/header.tsx (User & Role Display)
│   ├── components/ui/card.tsx (Card Components)
│   └── app/dashboard/layout.tsx (Provider Wrapper)
│
├── Features
│   └── app/dashboard/admin/page.tsx (Admin-only Dashboard)
│
└── Documentation
    ├── RBAC.md (Complete Guide)
    ├── RBAC_TESTING.md (Testing Guide)
    └── RBAC_FILES.md (This Reference)
```

---

## Permission Matrix

### Admin (15 permissions - All)
✓ All permissions enabled

### Faculty (14 permissions)
✓ VIEW_DASHBOARD
✓ VIEW_STUDENTS
✓ VIEW_ANALYTICS
✓ VIEW_CONTENT
✓ MANAGE_CONTENT
✓ VIEW_ASSESSMENTS
✓ MANAGE_ASSESSMENTS
✓ VIEW_CHALLENGES
✓ MANAGE_CHALLENGES
✓ VIEW_GESTURE_ANALYTICS
✓ VIEW_REPORTS
✓ GENERATE_REPORTS
✓ VIEW_PATHWAYS
✓ VIEW_LEADERBOARD

❌ MANAGE_STUDENTS
❌ VIEW_FACULTY
❌ MANAGE_FACULTY
❌ APPROVE_FACULTY
❌ APPROVE_CONTENT
❌ MANAGE_USERS
❌ VIEW_SYSTEM_LOGS
❌ MANAGE_SETTINGS
❌ MANAGE_ROLES

### Student (2 permissions)
✓ VIEW_DASHBOARD
✓ VIEW_LEADERBOARD

❌ All others

---

## Integration Checklist

- [x] Created role and permission enums
- [x] Implemented permission mapping
- [x] Created Auth Context with hooks
- [x] Implemented ProtectedRoute component
- [x] Implemented PermissionGate component
- [x] Updated Sidebar for role-based filtering
- [x] Updated Header with user role display
- [x] Added role switcher for testing
- [x] Created Admin Dashboard page
- [x] Created Card component for styling
- [x] Updated Dashboard layout with AuthProvider
- [x] Complete documentation
- [x] Testing guide

---

## Next Steps

### For Production:
1. Replace mock authentication with real auth system
2. Implement server-side permission validation
3. Add database-backed user and permission management
4. Implement proper session management (JWT, OAuth, etc.)
5. Add audit logging
6. Implement row-level security in database

### For Enhancement:
1. Custom role creation by admins
2. Time-based permissions
3. Permission delegation
4. Granular section/class-level permissions
5. Permission approval workflows
6. Team/group management for Faculty

---

## File Statistics

| File | Type | Lines | Purpose |
|------|------|-------|---------|
| rbac.ts | Core | 158 | Role & Permission Definitions |
| auth-context.tsx | Core | 76 | Auth State & Context |
| protected-route.tsx | Component | 58 | Route Protection |
| permission-gate.tsx | Component | 33 | Component-Level Access |
| sidebar.tsx | Component | 120 | Dynamic Navigation |
| header.tsx | Component | 95 | User & Role Display |
| card.tsx | Component | 61 | UI Cards |
| admin/page.tsx | Page | 214 | Admin Dashboard |
| layout.tsx | Layout | 26 | Provider Wrapper |
| RBAC.md | Docs | 296 | Complete Guide |
| RBAC_TESTING.md | Docs | 330 | Testing Guide |
| RBAC_FILES.md | Docs | Reference | This File |

**Total RBAC Code Lines:** ~1,467 lines
**Total Documentation:** ~625 lines

---

## Quick Reference: Adding RBAC to a New Page

```tsx
'use client'

import { PermissionGate } from '@/components/auth/permission-gate'
import { Permission } from '@/lib/rbac'
import { useAuth } from '@/lib/auth-context'

export default function MyPage() {
  const { hasPermission } = useAuth()

  return (
    <PermissionGate permission={Permission.MANAGE_USERS}>
      <div>
        {/* Protected content here */}
      </div>
    </PermissionGate>
  )
}
```

---

## Authentication Flow

```
User Loads App
    ↓
AuthProvider wraps app with mock user (Admin)
    ↓
useAuth() accessible in all components
    ↓
Components check permissions
    ↓
Sidebar filters navigation items
    ↓
Protected routes validate access
    ↓
User can switch roles via header dropdown
    ↓
UI updates instantly with new permissions
```

---

## Contact & Support

For detailed information, see:
- **Complete Guide:** RBAC.md
- **Testing Guide:** RBAC_TESTING.md
- **Architecture:** This file (RBAC_FILES.md)
