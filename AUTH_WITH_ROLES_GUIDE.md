# Enhanced Authentication with Role-Based Access Control

The auth helpers now support role-based access control that integrates seamlessly with your existing `AllowedRoles` and `RouteProtection` components.

## 🚀 **New Features**

- **Role checking in loaders and actions**
- **422 error responses** for unauthorized access (as requested)
- **Integration with existing `AllowedRoles`**
- **Flexible API** - works with existing code

## 📖 **API Reference**

### Basic Usage (No Role Checking)
```typescript
export const loader = withAuth(async ({ user, supabaseClient }) => {
  // Any authenticated user can access
  return { user };
});
```

### Role-Based Access Control
```typescript
// Method 1: Direct role array
export const loader = withAuth(['ADMIN'], async ({ user, supabaseClient }) => {
  // Only ADMIN can access - throws 422 if unauthorized
  return { data: 'admin only data' };
});

// Method 2: Multiple roles
export const loader = withAuth(
  ['ADMIN', 'HEAD_OF_DEPARTMENT'], 
  async ({ user, supabaseClient }) => {
    return { data: 'management data' };
  }
);

// Method 3: Using AllowedRoles constants (RECOMMENDED)
import { AllowedRoles } from '~/components/route-protections';

export const loader = withAuth(AllowedRoles.headOfDept, async ({ user, supabaseClient }) => {
  // HEAD_OF_DEPARTMENT or ADMIN can access
  return { data: 'team management data' };
});
```

### Actions with Role Checking
```typescript
// Basic action auth
export const action = withAuthAction(async ({ request, user, supabaseClient }) => {
  // Any authenticated user
  return { success: true };
});

// Role-protected action
export const action = withAuthAction(
  AllowedRoles.adminOnly,
  async ({ request, user, supabaseClient }) => {
    // Only ADMIN can perform this action
    return { deleted: true };
  }
);
```

## 🛡️ **Available Role Constants**

From `~/components/route-protections.tsx`:

```typescript
export const AllowedRoles = {
  noone: [],                                    // No access
  adminOnly: ["ADMIN"],                         // Admin only
  headOfDept: ["HEAD_OF_DEPARTMENT", "ADMIN"],  // Management roles
  coach: ["COACH", "HEAD_OF_DEPARTMENT", "ADMIN"], // Coaching roles
  scout: ["SCOUT", "HEAD_OF_DEPARTMENT", "ADMIN"], // Scouting roles
  all: ["COACH", "SCOUT", "HEAD_OF_DEPARTMENT", "ADMIN"], // All roles
};
```

## ⚡ **Error Handling**

When a user lacks required permissions:

- **Status Code**: `422` (Unprocessable Entity)
- **Response**: `"Access denied. Insufficient permissions."`
- **Headers**: `Content-Type: application/json`

This integrates with your frontend error handling and provides clear feedback.

## 🔄 **Migration Examples**

### Before (Component-Level Protection)
```typescript
// Route with manual role checking
export const loader = withAuth(async ({ user, supabaseClient }) => {
  // Logic here
  return { user, data };
});

export default function Component() {
  const { user, data } = useLoaderData();
  
  return (
    <RouteProtection allowedRoles={AllowedRoles.headOfDept} user={user}>
      {/* Component content */}
    </RouteProtection>
  );
}
```

### After (Loader-Level Protection)
```typescript
// Route with automatic role checking
export const loader = withAuth(AllowedRoles.headOfDept, async ({ user, supabaseClient }) => {
  // Logic here - user is guaranteed to have correct role
  return { user, data };
});

export default function Component() {
  const { user, data } = useLoaderData();
  
  // No RouteProtection wrapper needed!
  return (
    <div>
      {/* Component content */}
    </div>
  );
}
```

## 📋 **Real-World Examples**

### Admin-Only Settings
```typescript
export const loader = withAuth(AllowedRoles.adminOnly, async ({ user, supabaseClient }) => {
  const settings = await getSystemSettings(supabaseClient);
  return { settings };
});

export const action = withAuthAction(AllowedRoles.adminOnly, async ({ request, supabaseClient }) => {
  const formData = await request.formData();
  await updateSystemSettings(formData, supabaseClient);
  return { success: true };
});
```

### Team Management
```typescript
export const loader = withAuth(AllowedRoles.headOfDept, async ({ user, supabaseClient }) => {
  const teamService = new TeamService(supabaseClient);
  const teams = await teamService.getUserTeams(user);
  return { teams, user };
});
```

### Scout Reports
```typescript
export const loader = withAuth(AllowedRoles.scout, async ({ user, params, supabaseClient }) => {
  const reportService = new ReportService(supabaseClient);
  
  // Additional authorization logic if needed
  if (user.role === 'SCOUT' && user.id !== params.scoutId) {
    throw new Response("Access denied. Can only view own reports.", { status: 422 });
  }
  
  const reports = await reportService.getReportsByScout(params.scoutId);
  return { reports };
});
```

### Player Creation
```typescript
export const action = withAuthAction(
  AllowedRoles.coach, 
  async ({ request, user, supabaseClient }) => {
    const formData = await request.formData();
    const playerService = new PlayerService(supabaseClient);
    
    const playerData = {
      // ... form data
      teamId: user.team.id,  // Automatically use user's team
      createdBy: user.id
    };
    
    const player = await playerService.createPlayer(playerData);
    return redirect(`/dashboard/players/${player.id}`);
  }
);
```

## 🎯 **Best Practices**

1. **Use AllowedRoles constants** instead of hardcoded arrays
2. **Protect at the loader level** rather than component level when possible
3. **Combine with additional authorization** for complex requirements
4. **Consistent error messages** for better UX
5. **Log unauthorized access attempts** for security monitoring

## 🔍 **Debugging**

To debug role issues:

```typescript
export const loader = withAuth(AllowedRoles.headOfDept, async ({ user, supabaseClient }) => {
  console.log('User role:', user.role);
  console.log('Required roles:', AllowedRoles.headOfDept);
  console.log('Access granted:', AllowedRoles.headOfDept.includes(user.role));
  
  return { user };
});
```

## 🚀 **Benefits**

- **Security**: Role checking happens server-side, can't be bypassed
- **Performance**: Single auth call with role validation
- **Consistency**: Same role system everywhere
- **Developer Experience**: Clean, readable code
- **Error Handling**: Proper HTTP status codes
- **Integration**: Works with existing components and patterns

This enhancement maintains backward compatibility while providing a more secure and efficient way to handle role-based access control! 🎉