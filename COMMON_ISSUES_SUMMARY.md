# Common Issues & Solutions Summary

## 1. React Rendering & State Management Issues

### Issue: Material Cards Moving/Switching Positions
**Problem**: When navigating between tabs, selected material cards would randomly reorder themselves.
**Root Cause**: React was re-rendering without stable keys, causing the virtual DOM to lose track of component positions.
**Solution**: 
- Added `materialOrder` state array to maintain stable ordering
- Used array index from materialOrder for rendering instead of object keys
- Preserved order when updating materials

### Issue: White Screen Flashing Between Tabs
**Problem**: Users experienced white flashes when transitioning between tabs.
**Root Cause**: setTimeout delays in navigation and async state updates.
**Solution**:
- Removed all unnecessary setTimeout delays
- Used requestAnimationFrame for smooth transitions
- Added loading states to prevent empty renders

### Issue: Infinite Re-render Loops
**Problem**: Components would get stuck in infinite re-render loops.
**Root Cause**: Dependencies in useEffect hooks that were unstable (objects, arrays, functions).
**Solution**:
- Removed unstable dependencies like `onMaterialsUpdate` from useEffect
- Used useCallback for stable function references
- Added `isInternalChange` flags to prevent cascading updates

## 2. Data Persistence & Loss Issues

### Issue: Form Data Lost on Navigation
**Problem**: Users would lose all progress when switching tabs or refreshing.
**Root Cause**: No state persistence mechanism.
**Solution**:
- Implemented localStorage caching with `useLocalStorage` hook
- Added auto-save functionality with debouncing
- Created recovery mechanisms for interrupted sessions

### Issue: Materials Not Persisting
**Problem**: Selected materials would disappear after navigation.
**Root Cause**: Props and local state synchronization issues.
**Solution**:
- Added proper state synchronization logic
- Implemented `skipNextParentUpdate` flag to prevent loops
- Used `prevSelectedMaterialsCount` to track actual changes

## 3. UI/UX Consistency Issues

### Issue: Territory Showing UUID Instead of Name
**Problem**: Dashboard displayed "Territory a221805b..." instead of "Winter Park Territory".
**Root Cause**: Not fetching territory relationship data properly.
**Solution**:
- Updated AuthContext to include territory data in profile query
- Added proper joins in Supabase queries
- Implemented fallback display logic

### Issue: Dark Theme Inconsistency
**Problem**: Some components had light backgrounds in dark theme.
**Root Cause**: Hardcoded colors instead of theme-aware classes.
**Solution**:
- Implemented role-based conditional styling
- Used Tailwind's dark mode classes consistently
- Created separate themes for sales reps vs admin/managers

## 4. React Fragment & JSX Syntax Errors

### Issue: "Expected corresponding JSX closing tag for <React.Fragment>"
**Problem**: Build errors due to mismatched JSX tags.
**Root Cause**: Complex conditional rendering with fragments.
**Solution**:
- Replaced `<React.Fragment>` with `<>` shorthand
- Simplified conditional rendering structure
- Used proper JSX formatting and indentation

### Issue: Nested Fragments Causing Errors
**Problem**: Multiple levels of fragments causing parser confusion.
**Root Cause**: Over-use of fragments in conditional renders.
**Solution**:
- Reduced fragment usage where not needed
- Used single parent elements when possible
- Cleaned up JSX structure

## 5. Performance Issues

### Issue: Slow Material Selection Updates
**Problem**: Lag when selecting/deselecting materials.
**Root Cause**: Too many state updates triggering re-renders.
**Solution**:
- Batched state updates using React 18's automatic batching
- Memoized expensive calculations
- Reduced unnecessary re-renders with React.memo

### Issue: Memory Leaks from Event Listeners
**Problem**: Performance degradation over time.
**Root Cause**: Event listeners not being cleaned up.
**Solution**:
- Added cleanup functions in useEffect returns
- Used AbortController for fetch requests
- Properly disposed of timeouts and intervals

## 6. Database & API Issues

### Issue: Supabase RLS Policies Blocking Access
**Problem**: Users couldn't access their own data.
**Root Cause**: Incorrect RLS policy conditions.
**Solution**:
- Updated policies to check auth.uid() properly
- Added territory-based access controls
- Implemented proper role checks

### Issue: Race Conditions in Data Fetching
**Problem**: Data would load in wrong order or get overwritten.
**Root Cause**: Multiple async operations without coordination.
**Solution**:
- Used AbortController to cancel outdated requests
- Implemented request queuing
- Added loading states to prevent race conditions

## 7. Development Environment Issues

### Issue: Port 5173 Already in Use
**Problem**: Can't start dev server due to port conflict.
**Solution**:
```bash
lsof -ti:5173 | xargs kill -9
npm run dev
```

### Issue: HMR (Hot Module Replacement) Not Working
**Problem**: Changes not reflecting without manual refresh.
**Solution**:
- Clear Vite cache: `rm -rf node_modules/.vite`
- Restart dev server
- Check for syntax errors blocking HMR

## 8. Type Safety Issues

### Issue: TypeScript Errors with Supabase Types
**Problem**: Type mismatches with database schema.
**Solution**:
- Regenerated types: `npx supabase gen types typescript`
- Created proper interfaces for complex types
- Used type assertions where necessary

## Prevention Strategies

1. **Always use stable dependencies in hooks**
2. **Implement proper error boundaries**
3. **Add loading and error states for all async operations**
4. **Use TypeScript strictly to catch errors early**
5. **Test on multiple devices and browsers**
6. **Implement proper state management patterns**
7. **Use React DevTools to debug re-renders**
8. **Add comprehensive logging for debugging**

## Debugging Tools Used

- React DevTools for component inspection
- Chrome DevTools for network and performance
- PostHog for user behavior tracking
- Supabase Dashboard for database queries
- Console logging with descriptive prefixes
- Git bisect for finding breaking changes 