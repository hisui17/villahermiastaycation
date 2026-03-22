

## Problem Analysis

The app has a **broken authentication flow** caused by mixing Firebase and Supabase patterns. The data pages (Dashboard, Bookings, Properties, Analytics) correctly use Firebase/Firestore, but the **LoginPage** and **FirebaseAuthContext** have critical issues:

1. **LoginPage treats Firebase returns like Supabase** — Firebase's `signInWithEmailAndPassword` throws errors (try/catch), but the code destructures `{ error }` (Supabase pattern)
2. **Registration still calls `supabase.auth.getUser()`** — after Firebase signup, it tries to get the user ID from Supabase, which returns nothing
3. **`signUp` signature mismatch** — FirebaseAuthContext's `signUp(email, password)` takes 2 args, but LoginPage passes 3 `(email, password, fullName)`
4. **Supabase import in LoginPage** — still imports and uses the Supabase client unnecessarily

Because login fails silently or errors out, users can't authenticate, so they see an empty dashboard.

## Plan

### Step 1: Fix FirebaseAuthContext
- Update `signUp` to accept `fullName` parameter
- After creating the user, store user profile in Firestore `users` collection using the Firebase UID (not Supabase)
- Keep `signIn` and `logout` as-is but ensure proper error handling

### Step 2: Fix LoginPage
- Remove `supabase` import entirely
- Replace `{ error } = await signUp/signIn(...)` destructuring with proper try/catch blocks (Firebase throws, doesn't return errors)
- Remove the Supabase `getUser()` call in registration flow
- Registration profile storage moves to the auth context (Step 1)

### Step 3: Verify all data pages
- Confirm Dashboard, Bookings, Properties, Analytics, and BookingCalendar only reference Firebase — these already look correct based on inspection

### Technical Details
- Firebase Auth methods throw on failure; the code must use `try { await signIn(...) } catch (err) { ... }` pattern
- After `createUserWithEmailAndPassword`, the returned `UserCredential.user.uid` should be used to write the Firestore user doc
- No database migrations needed — this is purely a frontend auth flow fix

