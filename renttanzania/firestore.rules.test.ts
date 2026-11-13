/**
 * Firestore Security Rules Test Suite for RENTZ (`firestore.rules.test.ts`)
 * Only the RENTZ server (Firebase Admin SDK) reads and writes Firestore, so every
 * browser request must return PERMISSION_DENIED, whoever is signed in, including
 * the bootstrapped admin accounts. Access control lives in the server API instead.
 */

export interface SecurityTestCase {
  id: number;
  name: string;
  auth: {
    uid: string;
    email: string;
    email_verified: boolean;
  } | null;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED' | 'ALLOWED';
}

const renter = { uid: 'user_abc', email: 'renter@example.com', email_verified: true };
const admin = { uid: 'admin_uid', email: 'safarigoodluck35@gmail.com', email_verified: true };

export const CLIENT_ACCESS_TESTS: SecurityTestCase[] = [
  { id: 1, name: 'Guest reads server users', auth: null, operation: 'list', path: '/rentz_users', expectedResult: 'PERMISSION_DENIED' },
  { id: 2, name: 'Renter reads own user doc', auth: renter, operation: 'get', path: '/rentz_users/user_abc', expectedResult: 'PERMISSION_DENIED' },
  { id: 3, name: 'Renter grants self admin', auth: renter, operation: 'update', path: '/rentz_users/user_abc', payload: { role: 'admin', hasAdminOpsAccess: true }, expectedResult: 'PERMISSION_DENIED' },
  { id: 4, name: 'Renter reads password hashes', auth: renter, operation: 'list', path: '/rentz_credentials', expectedResult: 'PERMISSION_DENIED' },
  { id: 5, name: 'Renter reads sessions', auth: renter, operation: 'list', path: '/rentz_sessions', expectedResult: 'PERMISSION_DENIED' },
  { id: 6, name: 'Renter confirms own booking', auth: renter, operation: 'update', path: '/rentz_bookings/book-1', payload: { status: 'confirmed' }, expectedResult: 'PERMISSION_DENIED' },
  { id: 7, name: 'Renter reads all bookings', auth: renter, operation: 'list', path: '/rentz_bookings', expectedResult: 'PERMISSION_DENIED' },
  { id: 8, name: 'Guest creates a listing', auth: null, operation: 'create', path: '/rentz_assets/asset-x', payload: { title: 'x' }, expectedResult: 'PERMISSION_DENIED' },
  { id: 9, name: 'Admin account writes directly (must use the API)', auth: admin, operation: 'update', path: '/rentz_config/platform', payload: { supportedRegions: [] }, expectedResult: 'PERMISSION_DENIED' },
  { id: 10, name: 'Legacy browser collection: users', auth: renter, operation: 'create', path: '/users/user_abc', payload: { role: 'admin' }, expectedResult: 'PERMISSION_DENIED' },
  { id: 11, name: 'Legacy browser collection: listings', auth: renter, operation: 'list', path: '/listings', expectedResult: 'PERMISSION_DENIED' },
  { id: 12, name: 'Legacy browser collection: bookings', auth: renter, operation: 'delete', path: '/bookings/book-1', expectedResult: 'PERMISSION_DENIED' },
];
