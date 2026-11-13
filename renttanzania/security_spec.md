# RENTZ Firestore Security Specification (`security_spec.md`)

## 1. Data Invariants
1. **Identity Integrity (`users/{userId}`)**: A user document at `/users/{userId}` can only be created when `request.auth.uid == userId`, `incoming().uid == userId`, and `request.auth.token.email_verified == true`.
2. **PII Isolation (`users/{userId}`)**: Because `/users/{userId}` stores PII (`email`, `phone`), `get` and `list` operations are strictly restricted to the document owner (`request.auth.uid == userId` / `resource.data.uid == request.auth.uid`) or a verified platform administrator (`hasAdminRole()`). Blanket `isSignedIn()` reads are forbidden.
3. **Self-Assigned Privilege Prevention**: Standard users cannot self-assign `role: 'admin'`, `role: 'operations'`, or `hasAdminOpsAccess: true`. Only verified bootstrapped admins (`safarigoodluck35@gmail.com` and `giftj964@gmail.com` with `email_verified == true`) or existing admins in `/admins/{uid}` / `/users/{uid}` (`role == 'admin'`) can create or update a user document with Admin/Ops privileges.
4. **Bookings Read Access Invariant (`bookings/{bookingId}`)**: Every booking document at `/bookings/{bookingId}` MUST be readable (`get` and `list`) ONLY by:
   - the booking customer (`resource.data.customerId == request.auth.uid`),
   - the equipment owner (`resource.data.ownerId == request.auth.uid`), or
   - users with the `admin` role (`hasAdminRole()`).
   Any authenticated or unauthenticated user who is neither `customerId`, `ownerId`, nor an `admin` role holder is strictly denied read access.
5. **Bookings Write & Terminal State Invariant (`bookings/{bookingId}`)**: A booking can only be created when `incoming().customerId == request.auth.uid` (or by an admin) and `exists(/databases/$(database)/documents/users/$(incoming().customerId))` holds. Once `status` reaches a terminal state (`'completed'` or `'cancelled'`), non-admin updates are locked. `id`, `customerId`, `ownerId`, `assetId`, and `createdAt` are immutable.
6. **Strict Key & Size Enforcement**: Every string and array is strictly bounded by `.size()` and regex checks matching `firebase-blueprint.json`. Shadow fields are blocked via `hasOnly()`.
7. **Temporal Integrity**: `createdAt` and `updatedAt` must equal `request.time`.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Payload 1 (Identity Spoofing on User Create)**: Authenticated user `user_abc` attempts to create `/users/user_xyz` with `{ "uid": "user_xyz", "role": "renter", ... }`. -> `PERMISSION_DENIED`
2. **Payload 2 (Self-Assigned Admin Escalation)**: Non-admin user `attacker@example.com` creates `/users/user_abc` with `{ "role": "admin", "hasAdminOpsAccess": true }`. -> `PERMISSION_DENIED`
3. **Payload 3 (Unverified Email Spoof Attack)**: Attacker with `email: "safarigoodluck35@gmail.com"` and `email_verified: false` attempts to create `/users/user_abc` with `role: "admin"`. -> `PERMISSION_DENIED`
4. **Payload 4 (Unverified Second Admin Email Spoof)**: Attacker with `email: "giftj964@gmail.com"` and `email_verified: false` attempts to read `/users/other_user`. -> `PERMISSION_DENIED`
5. **Payload 5 (Shadow Field Injection on Create)**: User sends valid fields plus `"isSuperAdmin": true`. -> `PERMISSION_DENIED`
6. **Payload 6 (PII Blanket Read Attack)**: Authenticated user `user_abc` attempts `get` on `/users/user_xyz`. -> `PERMISSION_DENIED`
7. **Payload 7 (Unauthorized Third-Party Booking Read)**: Authenticated user `user_stranger` (not `customerId`, not `ownerId`, and `role != 'admin'`) attempts `get` or `list` on `/bookings/book_001`. -> `PERMISSION_DENIED`
8. **Payload 8 (Booking Identity Spoofing on Create)**: Authenticated user `user_abc` attempts to create `/bookings/book_001` with `customerId: "user_victim"`. -> `PERMISSION_DENIED`
9. **Payload 9 (Booking Terminal State Bypass)**: Customer or owner attempts to update `/bookings/book_001` after `status` is already `'completed'` or `'cancelled'`. -> `PERMISSION_DENIED`
10. **Payload 10 (Booking Immutable Field Mutation)**: Customer attempts to update `ownerId`, `customerId`, or `totalDue` on `/bookings/book_001`. -> `PERMISSION_DENIED`
11. **Payload 11 (Forged Client Timestamp)**: User creates `/bookings/book_001` with a forged `createdAt` instead of `request.time`. -> `PERMISSION_DENIED`
12. **Payload 12 (Unauthorized Admin Collection Write)**: Non-admin user attempts to create `/admins/user_abc`. -> `PERMISSION_DENIED`
