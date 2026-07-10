# HandSpeak RBAC Testing Guide

## Quick Start

The RBAC system is fully integrated into the HandSpeak application. To test different roles and permissions:

### Step 1: Access the Dashboard
Navigate to `/dashboard` or click the dashboard link. You'll see the default **Admin** dashboard with full access.

### Step 2: Switch Roles
Click on the **user profile** in the top-right header:
- Shows current user name and role
- Click to expand the menu
- Select a different role: **Admin**, **Faculty**, or **Student**

The interface automatically updates to show:
- Different sidebar navigation items
- Different admin panels
- Different feature access

## Testing Different Roles

### Admin Role Testing

**Access Level:** Maximum (all features)

**What to Test:**
1. ✓ All sidebar menu items appear (14 items)
2. ✓ Can access Admin Panel (/dashboard/admin)
3. ✓ Can see all students in Students page
4. ✓ Can access Faculty management
5. ✓ Can manage content, assessments, and challenges
6. ✓ Can view system logs and reports
7. ✓ Role badge shows "ADMIN" in header

**Test Steps:**
```
1. Switch to Admin role via header dropdown
2. Check sidebar - should see "Admin Panel" option
3. Click Admin Panel - should see system statistics and admin controls
4. Click each menu item - all should be accessible
5. Notice permission gates showing admin-only content
```

### Faculty Role Testing

**Access Level:** Moderate (teaching and content management)

**What to Test:**
1. ✓ Limited sidebar menu items (11 items - Admin Panel, User Management hidden)
2. ✓ Cannot access Admin Panel
3. ✓ Can view Students (assigned sections only)
4. ✓ Can access Analytics and Reports
5. ✓ Can manage Content, Assessments, Challenges
6. ✓ Role badge shows "FACULTY" in header
7. ✓ System log features are hidden

**Test Steps:**
```
1. Switch to Faculty role via header dropdown
2. Check sidebar - "Admin Panel" and "User Management" should be gone
3. Try navigating to /dashboard/admin - should see "Access Denied"
4. Can see Students, Content, Assessments pages
5. Notice permission gates are grayed out for admin content
```

**Expected Sidebar:**
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

### Student Role Testing

**Access Level:** Minimal (personal data only)

**What to Test:**
1. ✓ Very limited sidebar (only 2 items)
2. ✓ Cannot access Students management
3. ✓ Cannot access any admin features
4. ✓ Can only see personal Dashboard and Leaderboard
5. ✓ Role badge shows "STUDENT" in header
6. ✓ Most pages inaccessible

**Test Steps:**
```
1. Switch to Student role via header dropdown
2. Check sidebar - should only see Dashboard and Leaderboard
3. Try accessing /dashboard/students - should see "Access Denied"
4. Try accessing /dashboard/admin - should see "Access Denied"
5. Can only access /dashboard and /dashboard/leaderboard
```

**Expected Sidebar:**
- Dashboard
- Leaderboard

## Feature-Specific Testing

### Admin Panel
**Route:** `/dashboard/admin`
**Required Permission:** `MANAGE_USERS`

**What to Test:**
- ✓ Visible for Admin only
- ✓ Shows system statistics (students, faculty, lessons, etc.)
- ✓ Displays system health status
- ✓ Shows recent activities
- ✓ Has admin action cards (User Management, Content Moderation, System Logs, Settings)

### User Management
**Route:** `/dashboard/users`
**Required Permission:** `MANAGE_USERS`

**What to Test:**
- ✓ Only visible for Admin
- ✓ Faculty cannot see this page
- ✓ Student cannot see this page

### Content Management
**Route:** `/dashboard/content`
**Required Permission:** `VIEW_CONTENT`

**What to Test:**
- ✓ Admin can access
- ✓ Faculty can access
- ✓ Student cannot access

### Learning Analytics
**Route:** `/dashboard/analytics`
**Required Permission:** `VIEW_ANALYTICS`

**What to Test:**
- ✓ Admin can access
- ✓ Faculty can access
- ✓ Student cannot access

## Permission Gate Testing

### Example 1: Admin-Only Content
```tsx
<PermissionGate permission={Permission.MANAGE_USERS}>
  <AdminContent /> // Only shows for Admin
</PermissionGate>
```

**Test:**
- Switch to Admin - content appears
- Switch to Faculty - content disappears
- Switch to Student - content disappears

### Example 2: Multiple Permissions (ANY)
```tsx
<PermissionGate 
  permission={[Permission.MANAGE_CONTENT, Permission.APPROVE_CONTENT]}
>
  <ContentPanel />
</PermissionGate>
```

**Test:**
- Shows if user has ANY of the permissions
- Admin has both - shows
- Faculty has one - shows
- Student has none - hidden

### Example 3: Multiple Permissions (ALL)
```tsx
<PermissionGate 
  permission={[Permission.MANAGE_USERS, Permission.MANAGE_ROLES]}
  requireAll
>
  <AdvancedPanel />
</PermissionGate>
```

**Test:**
- Only shows if user has ALL permissions
- Admin has both - shows
- Faculty has neither - hidden
- Student has neither - hidden

## Header Role Switcher Testing

**Feature:** Role switching dropdown in header

**Test:**
1. Click user profile area in header (top-right)
2. Dropdown menu appears with three role options
3. Current role is highlighted in blue
4. Click a different role - page updates immediately
5. All sidebar items refresh based on new permissions
6. Header role badge updates
7. All permission gates recalculate instantly

## Sidebar Navigation Testing

**What to Test:**
1. Navigation items match user permissions
2. Active page is highlighted
3. Clicking items navigates correctly
4. Mobile sidebar toggle works
5. Menu filters correctly based on role

**Test:**
```
1. Admin role - 14 items visible
2. Faculty role - 11 items visible (no Admin Panel, User Management, Settings)
3. Student role - 2 items visible (Dashboard, Leaderboard)
```

## Protected Routes Testing

**What to Test:**
Routes with permission requirements

**Try accessing:**
- `/dashboard/admin` as Faculty → "Access Denied" page
- `/dashboard/users` as Faculty → "Access Denied" page
- `/dashboard/content` as Student → "Access Denied" page
- `/dashboard/analytics` as Student → "Access Denied" page

## Browser Console Testing

Check browser console for:
1. No auth context errors
2. No missing permission errors
3. Proper role switching logs
4. Permission gate rendering correctly

**Common Issues:**
- "useAuth must be used within an AuthProvider" - AuthProvider not wrapping component
- Route not protecting - ProtectedRoute component missing
- Menu items not filtering - sidebar permission checks not working

## Performance Testing

**What to Test:**
1. Role switching is instant
2. Navigation updates immediately
3. Permission gates render smoothly
4. No lag when checking permissions

## Integration Testing

**Test Complete User Flow:**

**Admin Flow:**
```
1. View dashboard
2. Navigate to admin panel
3. See all system statistics
4. Switch to Faculty role
5. Admin panel disappears from menu
6. Try accessing admin panel URL - get Access Denied
7. Switch back to Admin
8. Admin panel reappears
```

**Faculty Flow:**
```
1. View students in their section
2. Can manage content and assessments
3. Cannot access admin features
4. Cannot see user management
5. Switch to Student role
6. Can only see dashboard and leaderboard
```

## Troubleshooting

### Issue: Role switcher not working
**Solution:**
1. Check browser console for errors
2. Refresh the page
3. Check AuthProvider is in dashboard/layout.tsx
4. Verify useAuth hook is imported correctly

### Issue: Menu items not filtering by role
**Solution:**
1. Check sidebar.tsx imports Permission correctly
2. Verify hasPermission function works
3. Check navigationItems have permission field set
4. Clear browser cache

### Issue: PermissionGate not showing/hiding content
**Solution:**
1. Verify PermissionGate wraps component
2. Check permission spelling matches lib/rbac.ts
3. Verify user has role set correctly
4. Check if permission exists in rolePermissions

### Issue: Can access protected routes when shouldn't
**Solution:**
1. Wrap route in ProtectedRoute component
2. Pass correct requiredPermissions
3. Verify user role in auth context
4. Clear localStorage/session storage

## Next Steps

After testing the RBAC system:

1. **Integration with Backend:**
   - Replace mock users with database
   - Implement real authentication
   - Validate permissions server-side

2. **Custom Roles:**
   - Allow admins to create custom roles
   - Dynamic permission assignment
   - Role templates

3. **Audit Logging:**
   - Log all role changes
   - Log permission denials
   - Track admin actions

4. **Advanced Features:**
   - Time-based permissions
   - Delegation system
   - Permission approval workflow
