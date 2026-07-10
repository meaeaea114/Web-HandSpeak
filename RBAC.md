# HandSpeak Role-Based Access Control (RBAC) System

## Overview

The HandSpeak platform implements a comprehensive Role-Based Access Control system with three primary roles: **Administrator**, **Faculty**, and **Student**. This system ensures that users can only access features and data appropriate to their role.

## Roles and Permissions

### 1. Administrator (Admin)
**Highest privilege level** - Has access to all system features and can manage everything.

**Key Features:**
- View all students and their progress
- Manage faculty accounts (approve, suspend, edit)
- Manage all content (lessons, assessments, challenges)
- Approve submitted content
- View comprehensive system analytics
- Access system logs and security logs
- Configure system settings
- Manage user roles and permissions
- Generate system reports

**Sidebar Navigation:**
- Admin Panel (exclusive)
- Dashboard
- Students
- Faculty
- Learning Analytics
- Learning Pathways
- FSL Content
- Gesture Performance
- Assessments
- Challenges
- Leaderboard
- Reports
- User Management
- Settings

### 2. Faculty
**Moderate privilege level** - Can manage their assigned sections and content.

**Key Features:**
- View students in assigned sections
- Monitor student learning progress
- Manage FSL content for their sections
- Create and manage assessments
- Create and manage challenges
- View learning analytics for their students
- Generate reports for their classes
- Track gesture recognition performance

**Sidebar Navigation:**
- Dashboard
- Students
- Faculty (can view all faculty, not manage)
- Learning Analytics
- Learning Pathways
- FSL Content
- Gesture Performance
- Assessments
- Challenges
- Leaderboard
- Reports

### 3. Student
**Minimal privilege level** - Can only view personal learning data.

**Key Features:**
- View personal dashboard
- View leaderboard rankings

**Sidebar Navigation:**
- Dashboard (personal overview)
- Leaderboard

## Permission System

The system uses granular permissions to control access to specific features:

### Permission Categories

#### Dashboard & Viewing
- `VIEW_DASHBOARD` - Access to main dashboard
- `VIEW_ANALYTICS` - Access to learning analytics
- `VIEW_LEADERBOARD` - Access to leaderboard

#### Student Management
- `VIEW_STUDENTS` - View student list and profiles
- `MANAGE_STUDENTS` - Create, edit, or archive student accounts

#### Faculty Management
- `VIEW_FACULTY` - View faculty list and profiles
- `MANAGE_FACULTY` - Create, edit, or delete faculty accounts
- `APPROVE_FACULTY` - Approve faculty registration requests

#### Content Management
- `VIEW_CONTENT` - View FSL content library
- `MANAGE_CONTENT` - Create, edit, or delete content
- `APPROVE_CONTENT` - Review and approve submitted content

#### Assessment & Challenge Management
- `VIEW_ASSESSMENTS` - View assessments
- `MANAGE_ASSESSMENTS` - Create, edit, or delete assessments
- `VIEW_CHALLENGES` - View challenges
- `MANAGE_CHALLENGES` - Create, edit, or delete challenges

#### Analytics & Reporting
- `VIEW_GESTURE_ANALYTICS` - View gesture recognition analytics
- `VIEW_REPORTS` - View generated reports
- `GENERATE_REPORTS` - Create custom reports

#### System Administration
- `VIEW_PATHWAYS` - View learning pathways
- `MANAGE_USERS` - User management and admin panel access
- `VIEW_SYSTEM_LOGS` - Access to system, login, and activity logs
- `MANAGE_SETTINGS` - Configure system settings
- `MANAGE_ROLES` - Manage roles and permissions

## Implementation

### Key Files

1. **`lib/rbac.ts`** - Core RBAC definitions
   - Defines roles and permissions
   - Maps roles to permissions
   - Helper functions for permission checking

2. **`lib/auth-context.tsx`** - Authentication context
   - Manages current user state
   - Provides authentication methods
   - Exposes permission checking hooks

3. **`components/auth/protected-route.tsx`** - Route protection
   - Protects routes based on permissions
   - Redirects unauthorized access to login
   - Shows access denied message

4. **`components/auth/permission-gate.tsx`** - Component-level access control
   - Conditionally renders content based on permissions
   - Can require all or any permission
   - Supports fallback content

5. **`components/dashboard/sidebar.tsx`** - Dynamic navigation
   - Filters menu items based on user role
   - Only shows accessible routes

6. **`components/dashboard/header.tsx`** - User management
   - Displays current user and role
   - Includes role switcher for testing

## Usage Examples

### Checking Permissions in Components

```tsx
import { useAuth } from '@/lib/auth-context'
import { Permission } from '@/lib/rbac'

function MyComponent() {
  const { hasPermission, user } = useAuth()
  
  if (!hasPermission(Permission.MANAGE_USERS)) {
    return <div>Access Denied</div>
  }
  
  return <div>Admin Content</div>
}
```

### Using Permission Gate

```tsx
import { PermissionGate } from '@/components/auth/permission-gate'
import { Permission } from '@/lib/rbac'

function Page() {
  return (
    <PermissionGate permission={Permission.MANAGE_CONTENT}>
      <ContentManagementPanel />
    </PermissionGate>
  )
}
```

### Protecting Routes

```tsx
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Permission } from '@/lib/rbac'

function AdminPage() {
  return (
    <ProtectedRoute requiredPermissions={[Permission.MANAGE_USERS]}>
      <AdminPanel />
    </ProtectedRoute>
  )
}
```

### Using Multiple Permissions

```tsx
// Require ANY permission (OR logic)
<PermissionGate 
  permission={[Permission.MANAGE_CONTENT, Permission.APPROVE_CONTENT]}
>
  <ContentPanel />
</PermissionGate>

// Require ALL permissions (AND logic)
<PermissionGate 
  permission={[Permission.MANAGE_USERS, Permission.MANAGE_ROLES]}
  requireAll
>
  <AdvancedAdminPanel />
</PermissionGate>
```

## Testing the RBAC System

### Role Switcher
The header includes a role switcher for testing purposes. Click the user profile area and select a different role to see how the UI adapts:

1. **Admin** - Full access to all features
2. **Faculty** - Limited to teaching and content management
3. **Student** - Only personal learning data

### Testing Permissions
When you switch roles, observe:
- **Sidebar Navigation** - Menu items appear/disappear based on permissions
- **Component Visibility** - PermissionGate components show/hide content
- **Page Access** - Protected routes redirect if insufficient permissions

## Future Enhancements

### Planned Features
1. **Database Integration** - Replace mock users with database-backed authentication
2. **OAuth/SSO** - Support for institutional single sign-on
3. **Custom Roles** - Allow admins to create custom roles with specific permissions
4. **Row-Level Security** - Database-level permission checks
5. **Audit Logging** - Track all permission-related actions
6. **Team Management** - Group students into sections with faculty oversight
7. **Permission Inheritance** - Hierarchical permission system
8. **Time-Based Permissions** - Temporary access grants with expiration

## Security Considerations

### Current Implementation
- Mock authentication for demo purposes
- Client-side permission checking
- Session-based user state

### Production Recommendations
1. **Server-Side Validation** - Always validate permissions on the backend
2. **JWT Tokens** - Use secure JWT tokens for session management
3. **Rate Limiting** - Implement rate limiting on sensitive endpoints
4. **Audit Logging** - Log all permission checks and role changes
5. **Regular Audits** - Review user permissions regularly
6. **Principle of Least Privilege** - Grant minimum necessary permissions
7. **Role Separation** - Ensure proper separation of duties

## Configuration

### Adding New Permissions
1. Add permission to `Permission` enum in `lib/rbac.ts`
2. Add permission to appropriate roles in `rolePermissions` object
3. Use the permission in components/routes

### Adding New Roles
1. Add role to `Role` enum in `lib/rbac.ts`
2. Add role permissions mapping in `rolePermissions`
3. Update sidebar navigation for visibility
4. Update header role switcher if needed

### User Type Definition
Update the `User` type in `lib/rbac.ts` to add custom fields as needed.

## Troubleshooting

### Content Not Showing
- Check if user has required permission in `rolePermissions`
- Verify permission is used correctly in component
- Check browser console for auth context errors
- Ensure AuthProvider wraps the component

### Routes Not Protected
- Verify ProtectedRoute has correct `requiredPermissions`
- Check if user is authenticated
- Ensure user role has necessary permissions

### Role Switcher Not Working
- Clear browser cache
- Check browser console for errors
- Verify user is properly set in auth context
- Restart the application
