# Authentication Migration Guide

This guide shows how to migrate from the old authentication pattern to the new streamlined approach.

## Old Pattern (Multiple Supabase Calls)

```typescript
// OLD - Every route does this
export const loader: LoaderFunction = async ({ request }) => {
  const { supabaseClient } = getSupabaseServerClient(request);
  const authUser = await requireUser(supabaseClient);         // Call 1 to Supabase
  const user = await getAppUser(authUser.user.id, supabaseClient); // Calls 2-4 to Supabase
  
  // Route-specific logic
  const data = await someService.getData(user.team.id);
  
  return { user, data };
};
```

## New Pattern (Single Cached Call)

### Option 1: Simple Replacement with `withAuth`

```typescript
// NEW - Single call, cached
import { withAuth } from "~/utils/auth-helpers";

export const loader = withAuth(async ({ request, user, supabaseClient }) => {
  // Route-specific logic - user is already loaded and cached
  const data = await someService.getData(user.team.id);
  
  return { user, data };
});
```

### Option 2: Basic Auth Loader (for layout routes)

```typescript
// For simple routes that only need user data
import { createAuthLoader } from "~/utils/auth-helpers";

export const loader = createAuthLoader();
```

### Option 3: Role-based Access Control

```typescript
// For routes that require specific roles
import { withAuthAndRole } from "~/utils/auth-helpers";

export const loader = withAuthAndRole(['ADMIN', 'HEAD_OF_DEPARTMENT'], 
  async ({ user, supabaseClient }) => {
    // Only admins and heads can access this
    return { user };
  }
);
```

## Migration Steps

1. **Update imports**: Replace old auth imports with new helpers
2. **Replace loader pattern**: Use `withAuth` instead of manual auth calls
3. **Update login/register routes**: Use `withGuestOnly` for routes that should redirect authenticated users
4. **Test**: Verify auth still works and performance is improved

## Routes to Update

### High Priority (Most Used)
- `app/routes/dashboard.tsx` ✅ (Updated)
- `app/routes/dashboard.players.tsx` ✅ (Updated)
- `app/routes/dashboard._index.tsx`
- `app/routes/dashboard.events.tsx`
- `app/routes/dashboard.groups.tsx`

### Medium Priority
- `app/routes/dashboard.team.tsx`
- `app/routes/dashboard.players_.$id.tsx`
- `app/routes/dashboard.events_.$id.tsx`
- Player creation/editing routes

### Low Priority
- Individual detail pages
- Admin-only routes
- Settings pages

## Performance Benefits

- **Before**: 4+ Supabase calls per route (auth + user profile + teams + memberships)
- **After**: 1 Supabase call per route (cached for 5 minutes)
- **Result**: ~75% reduction in database calls for authenticated routes

## Cache Management

The new auth system includes automatic cache management:

- User data cached for 5 minutes
- Cache automatically cleared on server restart
- Manual cache invalidation when user data changes
- Automatic cleanup of expired entries

## Monitoring

Check auth cache performance:

```typescript
import { getAuthCacheStats } from "~/utils/auth.server";

// In a monitoring route
export const loader = async () => {
  const stats = getAuthCacheStats();
  return { stats };
};
```