import crypto from 'crypto';
import { Router, type Request, type Response } from 'express';
import { db } from './db.ts';
import {
  MIN_PASSWORD_LENGTH,
  attachSessionUser,
  burnPasswordCheck,
  clearFailedLogins,
  endSession,
  getSessionUser,
  hashPassword,
  isLockedOut,
  isValidEmail,
  normalizeEmail,
  normalizePhone,
  recordFailedLogin,
  startSession,
  verifyFirebaseIdToken,
  verifyPassword,
} from './auth.ts';
import {
  computePriceBreakdown,
  getDefaultDailyHirePercentage,
  calculateRuleOfThumbDailyRate,
  getRequiredVehicleClass,
} from './pricingEngine.ts';
import type {
  Asset,
  Booking,
  BookingStatus,
  InspectionRecord,
  LogisticsDispatchJob,
  LogisticsJobStatus,
  RenterTrackRecord,
  SignInPortal,
  SupportMessage,
  User,
  UserRole,
} from '../src/types/index.ts';

export const apiRouter = Router();

// Every request resolves its own signed-in user from its session cookie.
// Visitors without a session browse in Guest View-Only mode.
apiRouter.use(attachSessionUser);

function requireAuth(res: Response): User | null {
  const user = getSessionUser(res);
  if (!user) {
    res.status(401).json({
      error: 'View-only mode: Please log in or sign up to perform this action.',
    });
    return null;
  }
  return user;
}

function requireStaff(res: Response): User | null {
  const user = requireAuth(res);
  if (!user) return null;
  if (!isStaffUser(user)) {
    res.status(403).json({ error: 'RENTZ staff access required' });
    return null;
  }
  return user;
}

function requireAdmin(res: Response): User | null {
  const user = requireAuth(res);
  if (!user) return null;
  if (!isAdminUser(user)) {
    res.status(403).json({ error: 'Administrator access required' });
    return null;
  }
  return user;
}

// Admin & Ops access for these accounts is granted only when Google proves the
// email address (verified Firebase ID token), never from a typed email.
const BOOTSTRAPPED_ADMIN_OPS_EMAILS = ['safarigoodluck35@gmail.com', 'giftj964@gmail.com'];
const ALL_ROLES: UserRole[] = ['admin', 'operations', 'owner', 'renter'];
const SELLER_ROLES: UserRole[] = ['owner', 'renter'];
const BUYER_ROLES: UserRole[] = ['renter'];

function isSellerAccount(user: User): boolean {
  return user.accountType === 'seller';
}

// A seller can also rent; a buyer can never switch into selling
function permittedRoles(user: User): UserRole[] {
  if (user.hasAdminOpsAccess) return ALL_ROLES;
  return isSellerAccount(user) ? SELLER_ROLES : BUYER_ROLES;
}

// Each sign-in page opens the matching view; the seller and staff pages only accept their accounts
function roleForPortal(user: User, portal: SignInPortal): { role?: UserRole; error?: string } {
  if (portal === 'staff') {
    if (!user.hasAdminOpsAccess) return { error: 'This page is for RENTZ staff only.' };
    return { role: user.role === 'admin' || user.role === 'operations' ? user.role : 'admin' };
  }
  if (portal === 'seller') {
    if (!isSellerAccount(user) && !user.hasAdminOpsAccess) {
      return { error: 'This is a buyer account. Seller accounts are separate: create one on this page to list equipment.' };
    }
    return { role: 'owner' };
  }
  return { role: 'renter' };
}

function parsePortal(value: unknown): SignInPortal {
  return value === 'seller' || value === 'staff' ? value : 'buyer';
}

function isBootstrappedAdminOrOpsEmail(email?: string | null): boolean {
  if (!email) return false;
  return BOOTSTRAPPED_ADMIN_OPS_EMAILS.includes(email.trim().toLowerCase());
}

function isStaffUser(user: User | null): boolean {
  if (!user) return false;
  return user.role === 'admin' || user.role === 'operations' || !!user.hasAdminOpsAccess;
}

function isAdminUser(user: User | null): boolean {
  return !!user && user.role === 'admin' && !!user.hasAdminOpsAccess;
}

function isSameUser(user: User, id?: string): boolean {
  return !!id && (id === user.id || (!!user.uid && id === user.uid));
}

function isBookingRenter(user: User, booking: Booking): boolean {
  return isSameUser(user, booking.customerId) || isSameUser(user, booking.renterId);
}

function isBookingParty(user: User, booking: Booking): boolean {
  return isBookingRenter(user, booking) || isSameUser(user, booking.ownerId);
}

// Phone numbers are shared only after the owner accepts a booking, so the first deal
// between a renter and an owner is always arranged through RENTZ.
const CONTACT_SHARED_STATUSES: BookingStatus[] = [
  'confirmed',
  'ready_for_collection',
  'active',
  'return_due',
  'under_inspection',
  'completed',
  'disputed',
];

function assetForViewer(asset: Asset, viewer: User | null): Asset {
  if (isStaffUser(viewer) || (viewer && isSameUser(viewer, asset.ownerId))) return asset;
  return { ...asset, ownerPhone: '' };
}

// The renter's history on RENTZ, so an owner can judge the risk before handing over equipment
function renterTrackRecord(booking: Booking): RenterTrackRecord {
  const renter = db.getUserById(booking.renterId);
  const renterBookings = db
    .getBookings({})
    .filter((b) => b.renterId === booking.renterId || (!!booking.customerId && b.customerId === booking.customerId));
  const renterBookingIds = new Set(renterBookings.map((b) => b.id));
  return {
    verificationStatus: renter?.verificationStatus || 'unverified',
    completedHires: renterBookings.filter((b) => b.status === 'completed').length,
    disputes: db.getDisputes().filter((d) => renterBookingIds.has(d.bookingId)).length,
    memberSince: renter?.createdAt,
  };
}

function bookingForViewer(booking: Booking, viewer: User): Booking {
  const isOwnerView = isStaffUser(viewer) || isSameUser(viewer, booking.ownerId);
  const withProfile = isOwnerView ? { ...booking, renterProfile: renterTrackRecord(booking) } : booking;
  if (isStaffUser(viewer) || CONTACT_SHARED_STATUSES.includes(booking.status)) return withProfile;
  if (isSameUser(viewer, booking.ownerId)) {
    return { ...withProfile, renterPhone: '', customerPhone: '' };
  }
  return { ...booking, ownerPhone: '' };
}

// The signed-in user's own profile; allowedRoles always reflects what the server permits
function sessionView(user: User): User {
  return { ...user, allowedRoles: permittedRoles(user) };
}

function findUsersByEmail(email: string): User[] {
  if (!email) return [];
  return db.getUsers().filter((u) => normalizeEmail(u.email) === email);
}

function findUsersByPhone(phoneKey: string): User[] {
  if (phoneKey.length < 9) return [];
  return db.getUsers().filter((u) => normalizePhone(u.phone) === phoneKey);
}

function newUserId(role: UserRole): string {
  return `user-${role}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
}

function avatarFor(seed: string): string {
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b45309`;
}

// Authentication & Profile
apiRouter.get('/auth/me', (req: Request, res: Response) => {
  const user = getSessionUser(res);
  res.json({ user: user ? sessionView(user) : null });
});

// Create an account with a password (renter or owner only; staff access is granted by an admin)
apiRouter.post('/auth/register', (req: Request, res: Response) => {
  const { name, email, phone, password, portal, companyName, tinNumber, nidaNumber } = req.body || {};
  const cleanName = String(name || '').trim();
  const cleanEmail = normalizeEmail(email);
  const cleanPhone = String(phone || '').trim();
  const phoneKey = normalizePhone(cleanPhone);
  const signInPortal = parsePortal(portal);
  if (signInPortal === 'staff') {
    return res.status(403).json({ error: 'Staff accounts are created by a RENTZ administrator.' });
  }
  const accountRole: UserRole = signInPortal === 'seller' ? 'owner' : 'renter';

  if (cleanName.length < 2 || cleanName.length > 120) {
    return res.status(400).json({ error: 'Please enter your full name.' });
  }
  if (phoneKey.length < 9 || phoneKey.length > 15) {
    return res.status(400).json({ error: 'Please enter a valid mobile number, e.g. +255 7XX XXX XXX.' });
  }
  if (cleanEmail && !isValidEmail(cleanEmail)) {
    return res.status(400).json({ error: 'Please enter a valid email address, or leave it empty.' });
  }
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
  }
  if (isBootstrappedAdminOrOpsEmail(cleanEmail)) {
    return res.status(400).json({ error: 'This email belongs to RENTZ staff. Please use "Sign in with Google" with this account.' });
  }
  if (findUsersByEmail(cleanEmail).length > 0) {
    return res.status(409).json({ error: 'An account with this email already exists. Please sign in instead.' });
  }
  if (findUsersByPhone(phoneKey).length > 0) {
    return res.status(409).json({ error: 'An account with this mobile number already exists. Please sign in instead.' });
  }

  const now = new Date().toISOString();
  const id = newUserId(accountRole);
  const newUser: User = {
    id,
    uid: id,
    name: cleanName,
    email: cleanEmail,
    phone: cleanPhone,
    role: accountRole,
    accountType: accountRole === 'owner' ? 'seller' : 'buyer',
    allowedRoles: accountRole === 'owner' ? SELLER_ROLES : BUYER_ROLES,
    hasAdminOpsAccess: false,
    ownerTier: accountRole === 'owner' ? 'ordinary' : undefined,
    verificationStatus: 'unverified',
    companyName: companyName ? String(companyName).trim().slice(0, 160) : undefined,
    tinNumber: tinNumber ? String(tinNumber).trim().slice(0, 40) : undefined,
    nidaNumber: nidaNumber ? String(nidaNumber).trim().slice(0, 40) : undefined,
    avatarUrl: avatarFor(cleanName),
    savedSearches: [],
    createdAt: now,
    updatedAt: now,
  };

  db.createUser(newUser);
  db.setPassword(id, hashPassword(password));
  startSession(res, newUser);
  db.addAuditLog('AUTH_REGISTER', newUser, `Registered ${newUser.accountType} account ${cleanEmail || cleanPhone}`);
  res.status(201).json({
    success: true,
    user: sessionView(newUser),
    message: `Account created! Welcome to RENTZ, ${newUser.name}!`,
  });
});

// Sign in with email or mobile number + password
apiRouter.post('/auth/login', (req: Request, res: Response) => {
  const { identifier, email, phone, password, portal } = req.body || {};
  const rawIdentifier = String(identifier || email || phone || '').trim();
  const pass = typeof password === 'string' ? password : '';
  if (!rawIdentifier || !pass) {
    return res.status(400).json({ error: 'Enter your email or mobile number and your password.' });
  }

  const throttleKey = rawIdentifier.includes('@') ? normalizeEmail(rawIdentifier) : normalizePhone(rawIdentifier);
  if (isLockedOut(throttleKey)) {
    return res.status(429).json({ error: 'Too many failed sign-in attempts. Please wait 15 minutes and try again.' });
  }

  const candidates = rawIdentifier.includes('@')
    ? findUsersByEmail(normalizeEmail(rawIdentifier))
    : findUsersByPhone(normalizePhone(rawIdentifier));
  const withPassword = candidates.filter((u) => db.getCredential(u.id));
  if (withPassword.length === 0) burnPasswordCheck(pass);
  const user = withPassword.find((u) => verifyPassword(pass, db.getCredential(u.id)!.passwordHash));

  if (!user) {
    recordFailedLogin(throttleKey);
    return res.status(401).json({
      error: 'Incorrect email/mobile number or password. If you created your account with Google, use "Sign in with Google".',
    });
  }

  clearFailedLogins(throttleKey);
  const access = roleForPortal(user, parsePortal(portal));
  if (access.error) return res.status(403).json({ error: access.error });
  const signedIn = db.updateUser(user.id, { role: access.role })!;
  startSession(res, signedIn);
  db.addAuditLog('AUTH_LOGIN', signedIn, `Signed in with password as ${signedIn.name} (${signedIn.role})`);
  res.json({ success: true, user: sessionView(signedIn), message: `Welcome back, ${signedIn.name}!` });
});

// Sign in with Google: the browser sends its Firebase ID token, which the server verifies
apiRouter.post('/auth/google', async (req: Request, res: Response) => {
  const { idToken, portal } = req.body || {};
  const signInPortal = parsePortal(portal);
  let identity;
  try {
    identity = await verifyFirebaseIdToken(idToken);
  } catch (err) {
    console.warn('Rejected Google sign-in:', (err as Error).message);
    return res.status(401).json({ error: 'Google sign-in could not be verified. Please try again.' });
  }
  if (!identity.email || !identity.emailVerified) {
    return res.status(401).json({ error: 'Your Google account email is not verified.' });
  }

  const isStaffEmail = isBootstrappedAdminOrOpsEmail(identity.email);
  const byEmail = findUsersByEmail(identity.email);
  const existing =
    db.getUsers().find((u) => u.uid === identity.uid) ||
    byEmail.find((u) => u.hasAdminOpsAccess) ||
    byEmail[0];
  const now = new Date().toISOString();
  let user: User;
  let message: string;

  if (existing) {
    const updates: Partial<User> = { uid: identity.uid, updatedAt: now };
    if (isStaffEmail) {
      updates.hasAdminOpsAccess = true;
      updates.allowedRoles = ALL_ROLES;
      updates.verificationStatus = 'verified';
    }
    // First Google link to an account created with an unverified email: drop that
    // password and its sessions, in case someone else registered this email first
    if (existing.uid !== identity.uid && db.getCredential(existing.id)) {
      db.removePassword(existing.id);
    }
    user = db.updateUser(existing.id, updates)!;
    message = `Welcome back, ${user.name}!`;
  } else {
    if (signInPortal === 'staff' && !isStaffEmail) {
      return res.status(403).json({ error: 'This page is for RENTZ staff only.' });
    }
    const accountRole: UserRole = isStaffEmail ? 'admin' : signInPortal === 'seller' ? 'owner' : 'renter';
    const name = identity.name || identity.email.split('@')[0];
    user = {
      id: newUserId(accountRole),
      uid: identity.uid,
      name,
      email: identity.email,
      phone: '',
      role: accountRole,
      accountType: accountRole === 'owner' ? 'seller' : 'buyer',
      allowedRoles: isStaffEmail ? ALL_ROLES : accountRole === 'owner' ? SELLER_ROLES : BUYER_ROLES,
      hasAdminOpsAccess: isStaffEmail,
      ownerTier: accountRole === 'owner' ? 'ordinary' : undefined,
      verificationStatus: isStaffEmail ? 'verified' : 'unverified',
      avatarUrl: identity.picture || avatarFor(name),
      savedSearches: [],
      createdAt: now,
      updatedAt: now,
    };
    db.createUser(user);
    message = `Account created! Welcome to RENTZ, ${user.name}!`;
  }

  const access = roleForPortal(user, signInPortal);
  if (access.error) return res.status(403).json({ error: access.error });
  user = db.updateUser(user.id, { role: access.role })!;
  startSession(res, user);
  db.addAuditLog(
    isStaffEmail ? 'AUTH_ADMIN_OPS_GOOGLE' : 'AUTH_LOGIN',
    user,
    `Signed in with Google as ${user.email} (${user.role})`
  );
  res.json({ success: true, user: sessionView(user), message });
});

apiRouter.post('/auth/logout', (req: Request, res: Response) => {
  endSession(req, res);
  res.json({
    success: true,
    user: null,
    message: 'Signed out successfully. You are now in View-Only mode.',
  });
});

// Switch the signed-in user's own active view. Sellers can switch between selling and renting;
// buyers only rent; admin and operations views need staff access granted by an administrator.
apiRouter.post('/auth/switch-role', (req: Request, res: Response) => {
  const sessionUser = requireAuth(res);
  if (!sessionUser) return;

  const { role } = req.body as { role?: UserRole };
  const allowed = permittedRoles(sessionUser);
  if (!role || !allowed.includes(role)) {
    return res.status(403).json({
      error: role === 'owner' ? 'Buyer accounts cannot list equipment. Sellers use a separate seller account.' : 'Your account does not have access to that view.',
    });
  }

  const updates: Partial<User> = { role, allowedRoles: allowed, updatedAt: new Date().toISOString() };
  if (role === 'owner' && !sessionUser.ownerTier) updates.ownerTier = 'ordinary';
  const updated = db.updateUser(sessionUser.id, updates)!;
  db.addAuditLog('AUTH_ROLE_SWITCH', updated, `Switched active view for ${updated.email || updated.phone} to ${role}`);
  res.json({ success: true, user: sessionView(updated) });
});

// Users Collection Endpoints (staff only: storing user roles & Admin/Ops grants)
apiRouter.get('/users', (_req: Request, res: Response) => {
  if (!requireStaff(res)) return;
  const users = db.getUsers().map((u) => ({
    ...u,
    uid: u.uid || u.id,
    hasAdminOpsAccess: Boolean(u.hasAdminOpsAccess || u.role === 'admin' || u.role === 'operations'),
    allowedRoles: permittedRoles(u),
  }));
  res.json({ users });
});

apiRouter.post('/users/:id/role', (req: Request, res: Response) => {
  const sessionUser = requireAdmin(res);
  if (!sessionUser) return;

  const targetUser = db.getUserById(req.params.id);
  if (!targetUser) {
    return res.status(404).json({ error: 'User not found in users collection' });
  }

  const { role, hasAdminOpsAccess } = req.body as { role?: UserRole; hasAdminOpsAccess?: boolean };
  if (role && !ALL_ROLES.includes(role)) {
    return res.status(400).json({ error: 'Unknown role' });
  }
  const isProtectedBootstrap = isBootstrappedAdminOrOpsEmail(targetUser.email);
  const nextHasAdminOps = isProtectedBootstrap
    ? true
    : hasAdminOpsAccess !== undefined
    ? Boolean(hasAdminOpsAccess)
    : Boolean(targetUser.hasAdminOpsAccess || role === 'admin' || role === 'operations');

  const requestedRole: UserRole = role || targetUser.role;
  // Without staff access an account can only hold a marketplace role
  // An administrator may convert a buyer into a seller by giving them the owner role
  const nextAccountType = requestedRole === 'owner' ? 'seller' : targetUser.accountType || 'buyer';
  const marketplaceRoles = nextAccountType === 'seller' ? SELLER_ROLES : BUYER_ROLES;
  const nextRole: UserRole = nextHasAdminOps || marketplaceRoles.includes(requestedRole) ? requestedRole : 'renter';

  const updated = db.updateUser(targetUser.id, {
    role: nextRole,
    hasAdminOpsAccess: nextHasAdminOps,
    accountType: nextAccountType,
    allowedRoles: nextHasAdminOps ? ALL_ROLES : marketplaceRoles,
    ownerTier: nextAccountType === 'seller' ? targetUser.ownerTier || 'ordinary' : targetUser.ownerTier,
    updatedAt: new Date().toISOString(),
  });

  db.addAuditLog(
    'USER_ROLE_UPDATED',
    sessionUser,
    `Updated user role in users collection for ${targetUser.email} to ${nextRole} (Admin/Ops Access: ${nextHasAdminOps})`
  );

  res.json({ success: true, user: updated });
});

// Admin Owners Management & Owner Verification (KYC is checked by an administrator)
apiRouter.get('/admin/owners', (req: Request, res: Response) => {
  if (!requireStaff(res)) return;
  const owners = db.getUsers().filter((u) => u.role === 'owner');
  res.json({ owners });
});

apiRouter.post('/admin/owners/:id/verify', (req: Request, res: Response) => {
  const sessionUser = requireAdmin(res);
  if (!sessionUser) return;

  const ownerId = req.params.id;
  const targetOwner = db.getUserById(ownerId);
  if (!targetOwner || targetOwner.role !== 'owner') {
    return res.status(404).json({ error: 'Owner not found' });
  }

  const { nidaNumber, tinNumber, companyName, customCode } = req.body || {};
  const finalNida = String(nidaNumber ?? targetOwner.nidaNumber ?? '').trim();
  const finalTin = String(tinNumber ?? targetOwner.tinNumber ?? '').trim();
  if (!finalNida && !finalTin) {
    return res.status(400).json({
      error: 'Record the NIDA or TRA TIN number you checked on the original documents before verifying this owner.',
    });
  }

  // Unique reference code recorded against the verification (not a sign-in credential)
  const code = customCode ? String(customCode).trim().toUpperCase() : `RTZ-VER-${crypto.randomInt(1000, 10000)}`;
  const now = new Date().toISOString();

  const updated = db.updateUser(ownerId, {
    ownerTier: 'verified',
    verificationStatus: 'verified',
    verificationCode: code,
    verificationCodeIssuedAt: now,
    verifiedByAdminAt: now,
    verifiedByAdminId: sessionUser.id,
    nidaNumber: finalNida || undefined,
    tinNumber: finalTin || undefined,
    companyName: companyName !== undefined ? companyName : targetOwner.companyName,
  });

  if (updated) {
    // Also upgrade all assets of this owner to verified
    db.getAssets().forEach((a) => {
      if (a.ownerId === ownerId) {
        a.isVerifiedOwner = true;
        a.ownerTier = 'verified';
      }
    });

    db.addAuditLog(
      'ADMIN_VERIFIED_OWNER_KYC',
      sessionUser,
      `Admin completed KYC (TIN: ${updated.tinNumber || 'N/A'}, NIDA: ${updated.nidaNumber || 'N/A'}) for ${updated.name} and generated code ${code}`
    );
    return res.json({
      success: true,
      owner: updated,
      verificationCode: code,
      message: `Owner ${updated.name} KYC saved & verified! Verification code: ${code}`,
    });
  }

  res.status(500).json({ error: 'Failed to verify owner' });
});

apiRouter.post('/admin/owners/:id/generate-code', (req: Request, res: Response) => {
  const sessionUser = requireAdmin(res);
  if (!sessionUser) return;

  const ownerId = req.params.id;
  const targetOwner = db.getUserById(ownerId);
  if (!targetOwner || targetOwner.role !== 'owner') {
    return res.status(404).json({ error: 'Owner not found' });
  }

  const { customCode } = req.body || {};
  const code = customCode ? String(customCode).trim().toUpperCase() : `RTZ-VER-${crypto.randomInt(1000, 10000)}`;
  const now = new Date().toISOString();

  const updated = db.updateUser(ownerId, {
    verificationCode: code,
    verificationCodeIssuedAt: now,
  });

  if (updated) {
    db.addAuditLog('ADMIN_GENERATED_CODE', sessionUser, `Generated new verification code ${code} for owner ${updated.name}`);
    return res.json({
      success: true,
      owner: updated,
      verificationCode: code,
      message: `Generated new verification code: ${code}`,
    });
  }

  res.status(500).json({ error: 'Failed to generate code' });
});

apiRouter.post('/admin/owners/:id/revoke', (req: Request, res: Response) => {
  const sessionUser = requireAdmin(res);
  if (!sessionUser) return;

  const ownerId = req.params.id;
  const targetOwner = db.getUserById(ownerId);
  if (!targetOwner || targetOwner.role !== 'owner') {
    return res.status(404).json({ error: 'Owner not found' });
  }

  const updated = db.updateUser(ownerId, {
    ownerTier: 'ordinary',
    verificationStatus: 'unverified',
    verificationCode: undefined,
  });

  if (updated) {
    db.getAssets().forEach((a) => {
      if (a.ownerId === ownerId) {
        a.isVerifiedOwner = false;
        a.ownerTier = 'ordinary';
      }
    });

    db.addAuditLog('ADMIN_REVOKED_OWNER', sessionUser, `Admin revoked verified status from owner ${updated.name}`);
    return res.json({
      success: true,
      owner: updated,
      message: `Owner ${updated.name} reverted to Ordinary Owner status.`,
    });
  }

  res.status(500).json({ error: 'Failed to revoke owner verification' });
});

// Saved Searches
apiRouter.get('/user/saved-searches', (req: Request, res: Response) => {
  const sessionUser = requireAuth(res);
  if (!sessionUser) return;
  const searches = db.getSavedSearches(sessionUser.id);
  res.json({ savedSearches: searches });
});

apiRouter.post('/user/saved-searches', (req: Request, res: Response) => {
  const sessionUser = requireAuth(res);
  if (!sessionUser) return;

  const { name, query, categoryId, categoryName, region, ownershipFilter } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Search name is required' });
  }

  const saved = db.addSavedSearch(sessionUser.id, {
    userId: sessionUser.id,
    name,
    query: query || undefined,
    categoryId: categoryId || undefined,
    categoryName: categoryName || undefined,
    region: region || undefined,
    ownershipFilter: ownershipFilter || 'all',
  });

  db.addAuditLog('SAVED_SEARCH_CREATED', sessionUser, `User saved search filter "${name}"`);
  res.status(201).json({ savedSearch: saved });
});

apiRouter.delete('/user/saved-searches/:id', (req: Request, res: Response) => {
  const sessionUser = requireAuth(res);
  if (!sessionUser) return;

  const success = db.deleteSavedSearch(sessionUser.id, req.params.id);
  if (!success) {
    return res.status(404).json({ error: 'Saved search not found' });
  }
  res.json({ success: true });
});

// Categories (GET is public for browsing)
apiRouter.get('/categories', (req: Request, res: Response) => {
  res.json({ categories: db.getCategories() });
});

apiRouter.post('/categories', (req: Request, res: Response) => {
  const sessionUser = requireAdmin(res);
  if (!sessionUser) return;

  const { name, nameSwahili, slug, description, iconName } = req.body;
  if (!name || !slug) {
    return res.status(400).json({ error: 'Name and slug are required' });
  }

  const category = db.createCategory({
    id: `cat-${slug.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
    name,
    nameSwahili: nameSwahili || name,
    slug,
    description: description || '',
    iconName: iconName || 'Wrench',
    displayOrder: db.getCategories().length + 1,
    isActive: true,
  });

  db.addAuditLog('CATEGORY_CREATED', sessionUser, `Created category: ${name}`);
  res.status(201).json({ category });
});

// Assets (GET is public for viewing & browsing)
apiRouter.get('/assets', (req: Request, res: Response) => {
  const { categoryId, region, ownershipType, query, ownerId, approvalStatus } = req.query;
  const assets = db.getAssets({
    categoryId: categoryId as string,
    region: region as string,
    ownershipType: ownershipType as 'company' | 'third_party',
    query: query as string,
    ownerId: ownerId as string,
    approvalStatus: approvalStatus as string,
  });
  const viewer = getSessionUser(res);
  const visible = isStaffUser(viewer)
    ? assets
    : assets.filter((a) => a.approvalStatus === 'approved' || (viewer && isSameUser(viewer, a.ownerId)));
  res.json({ assets: visible.map((a) => assetForViewer(a, viewer)) });
});

apiRouter.get('/assets/:id', (req: Request, res: Response) => {
  const asset = db.getAssetById(req.params.id);
  const viewer = getSessionUser(res);
  if (
    !asset ||
    (asset.approvalStatus !== 'approved' && !isStaffUser(viewer) && !(viewer && isSameUser(viewer, asset.ownerId)))
  ) {
    return res.status(404).json({ error: 'Asset not found' });
  }
  res.json({ asset: assetForViewer(asset, viewer) });
});

apiRouter.post('/assets', (req: Request, res: Response) => {
  const sessionUser = requireAuth(res);
  if (!sessionUser) return;

  if (sessionUser.role !== 'owner' && !isAdminUser(sessionUser)) {
    return res.status(403).json({ error: 'Switch to the Asset Owner view to list equipment' });
  }

  const {
    title,
    description,
    categoryId,
    ownershipType,
    weightKg,
    pricing,
    location,
    condition,
    specifications,
    accessoriesIncluded,
    deliveryOptions,
    images,
    serialNumber,
  } = req.body;

  if (!title || !categoryId || (!pricing?.ratePerDay && !pricing?.purchaseValue) || !location?.region) {
    return res.status(400).json({ error: 'Missing required asset fields' });
  }

  const resolvedWeightKg = weightKg ? Number(weightKg) : 25;
  const resolvedDailyHirePct =
    pricing.dailyHirePercentage && Number(pricing.dailyHirePercentage) > 0
      ? Number(pricing.dailyHirePercentage)
      : getDefaultDailyHirePercentage(categoryId, resolvedWeightKg);

  const resolvedPurchaseValue =
    pricing.purchaseValue && Number(pricing.purchaseValue) > 0
      ? Number(pricing.purchaseValue)
      : Math.round(Number(pricing.ratePerDay) / (resolvedDailyHirePct / 100));

  // The owner's own daily rate wins; the rule of thumb only fills in a missing rate
  const resolvedRatePerDay =
    pricing.ratePerDay && Number(pricing.ratePerDay) > 0
      ? Number(pricing.ratePerDay)
      : calculateRuleOfThumbDailyRate(resolvedPurchaseValue, resolvedDailyHirePct);

  const isCompany = isAdminUser(sessionUser) && ownershipType === 'company';
  const newAsset = db.createAsset({
    id: `asset-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    title,
    description: description || '',
    categoryId,
    ownershipType: isCompany ? 'company' : 'third_party',
    ownerId: sessionUser.id,
    ownerName: isCompany ? 'RENTZ Fleet Depot' : sessionUser.name,
    ownerPhone: sessionUser.phone,
    ownerRating: 5.0,
    isVerifiedOwner: sessionUser.verificationStatus === 'verified' || sessionUser.ownerTier === 'verified',
    ownerTier: sessionUser.ownerTier || (sessionUser.verificationStatus === 'verified' ? 'verified' : 'ordinary'),
    weightKg: resolvedWeightKg,
    pricing: {
      purchaseValue: resolvedPurchaseValue,
      dailyHirePercentage: resolvedDailyHirePct,
      ratePerHour: pricing.ratePerHour ? Number(pricing.ratePerHour) : undefined,
      ratePerDay: resolvedRatePerDay,
      ratePerWeek: pricing.ratePerWeek ? Number(pricing.ratePerWeek) : resolvedRatePerDay * 6,
      ratePerMonth: pricing.ratePerMonth ? Number(pricing.ratePerMonth) : resolvedRatePerDay * 24,
      minimumRentalDays: pricing.minimumRentalDays ? Number(pricing.minimumRentalDays) : 1,
    },
    currency: 'TZS',
    location: {
      region: location.region,
      district: location.district || 'City Center',
      ward: location.ward,
      landmark: location.landmark,
    },
    condition: condition || 'excellent',
    specifications: specifications || {},
    accessoriesIncluded: accessoriesIncluded || [],
    deliveryOptions: {
      pickupAvailable: deliveryOptions?.pickupAvailable ?? true,
      deliveryAvailable: deliveryOptions?.deliveryAvailable ?? true,
      flatDeliveryFee: deliveryOptions?.flatDeliveryFee ? Number(deliveryOptions.flatDeliveryFee) : undefined,
      operatorAvailable: deliveryOptions?.operatorAvailable ?? false,
      operatorDailyRate: deliveryOptions?.operatorDailyRate ? Number(deliveryOptions.operatorDailyRate) : undefined,
    },
    images: images && images.length > 0 ? images : ['/src/assets/images/hero_equipment_fleet_1792692516554.jpg'],
    serialNumber: serialNumber || `RTZ-EQ-${Math.floor(1000 + Math.random() * 9000)}`,
    approvalStatus: 'approved',
    isAvailable: true,
    qrCodeId: `QR-RTZ-${Math.floor(10000 + Math.random() * 90000)}`,
    totalRentals: 0,
    rating: 5.0,
    createdAt: new Date().toISOString(),
  });

  db.addAuditLog('ASSET_CREATED', sessionUser, `Listed asset: ${newAsset.title} (${newAsset.id})`);
  res.status(201).json({ asset: newAsset });
});

apiRouter.put('/assets/:id', (req: Request, res: Response) => {
  const sessionUser = requireAuth(res);
  if (!sessionUser) return;

  const asset = db.getAssetById(req.params.id);
  if (!asset) return res.status(404).json({ error: 'Asset not found' });

  // Security check: only asset owner or admin can edit
  const isAdmin = isAdminUser(sessionUser);
  if (!isAdmin && !isSameUser(sessionUser, asset.ownerId)) {
    return res.status(403).json({ error: 'Unauthorized to edit this asset' });
  }

  const updates = { ...(req.body || {}) };
  for (const field of ['id', 'createdAt', 'qrCodeId', 'rating', 'totalRentals', 'ownerRating']) delete updates[field];
  if (!isAdmin) {
    for (const field of ['ownerId', 'ownerName', 'ownerPhone', 'ownershipType', 'isVerifiedOwner', 'ownerTier', 'approvalStatus']) {
      delete updates[field];
    }
  }

  const updated = db.updateAsset(req.params.id, updates);
  db.addAuditLog('ASSET_UPDATED', sessionUser, `Updated asset: ${asset.title}`);
  res.json({ asset: updated });
});

apiRouter.post('/assets/:id/status', (req: Request, res: Response) => {
  const sessionUser = requireAuth(res);
  if (!sessionUser) return;

  const { approvalStatus, isAvailable } = req.body;
  const asset = db.getAssetById(req.params.id);
  if (!asset) return res.status(404).json({ error: 'Asset not found' });

  // Owners can toggle availability; only staff can approve or reject a listing
  if (!isAdminUser(sessionUser) && !isSameUser(sessionUser, asset.ownerId)) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  if (approvalStatus && !isStaffUser(sessionUser)) {
    return res.status(403).json({ error: 'Only RENTZ staff can approve or reject listings' });
  }

  const updates: Partial<typeof asset> = {};
  if (approvalStatus) updates.approvalStatus = approvalStatus;
  if (isAvailable !== undefined) updates.isAvailable = isAvailable;

  const updated = db.updateAsset(req.params.id, updates);
  db.addAuditLog('ASSET_STATUS_CHANGE', sessionUser, `Changed status of ${asset.title} to status:${approvalStatus}, avail:${isAvailable}`);
  res.json({ asset: updated });
});

apiRouter.delete('/assets/:id', (req: Request, res: Response) => {
  const sessionUser = requireAuth(res);
  if (!sessionUser) return;

  const asset = db.getAssetById(req.params.id);
  if (!asset) return res.status(404).json({ error: 'Asset not found' });

  if (!isAdminUser(sessionUser) && !isSameUser(sessionUser, asset.ownerId)) {
    return res.status(403).json({ error: 'Unauthorized to delete this asset' });
  }

  const deleted = db.deleteAsset(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Failed to delete asset' });
  db.addAuditLog('ASSET_DELETED', sessionUser, `Deleted asset: ${asset.title} (${asset.id})`);
  res.json({ success: true, deletedId: req.params.id });
});

// Server-side Pricing Calculation API (Public read-only quotation preview)
apiRouter.post('/pricing/calculate', (req: Request, res: Response) => {
  const { assetId, startDate, endDate, rentalUnit, deliveryRequired, deliveryDistanceKm, operatorRequired } = req.body;

  if (!assetId || !startDate || !endDate) {
    return res.status(400).json({ error: 'Asset ID, start date, and end date are required' });
  }

  const asset = db.getAssetById(assetId);
  if (!asset) {
    return res.status(404).json({ error: 'Asset not found' });
  }

  const breakdown = computePriceBreakdown(asset, startDate, endDate, {
    rentalUnit,
    deliveryRequired,
    deliveryDistanceKm: deliveryDistanceKm ? Number(deliveryDistanceKm) : undefined,
    operatorRequired,
  });

  // Check if conflict exists for these dates
  const hasConflict = db.hasBookingConflict(assetId, startDate, endDate);

  res.json({
    breakdown,
    hasConflict,
    conflictMessage: hasConflict ? 'Notice: This asset already has confirmed bookings during this time period.' : null,
  });
});

// Bookings — readable by customerId, ownerId, and users with the admin role
apiRouter.get('/bookings', (req: Request, res: Response) => {
  const sessionUser = requireAuth(res);
  if (!sessionUser) return;

  const { status } = req.query;
  const allBookings = db.getBookings({ status: status as string });

  const isStaff = isStaffUser(sessionUser);
  const readableBookings = allBookings.filter((b) => isStaff || isBookingParty(sessionUser, b));

  res.json({ bookings: readableBookings.map((b) => bookingForViewer(b, sessionUser)) });
});

apiRouter.get('/bookings/:id', (req: Request, res: Response) => {
  const sessionUser = requireAuth(res);
  if (!sessionUser) return;

  const booking = db.getBookingById(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  // Bookings must be readable by customerId, ownerId, and RENTZ staff
  if (!isStaffUser(sessionUser) && !isBookingParty(sessionUser, booking)) {
    return res.status(403).json({
      error: 'Access denied: bookings are only readable by customerId, ownerId, and users with the admin role.',
    });
  }

  const inspections = db.getInspections(booking.id);

  res.json({ booking: bookingForViewer(booking, sessionUser), inspections });
});

// Create booking request
apiRouter.post('/bookings', (req: Request, res: Response) => {
  const sessionUser = requireAuth(res);
  if (!sessionUser) return;

  const {
    assetId,
    startDate,
    endDate,
    rentalUnit,
    deliveryRequired,
    deliveryDistanceKm,
    deliveryAddress,
    operatorRequired,
    notes,
    customerName,
    customerPhone,
  } = req.body;

  if (!assetId || !startDate || !endDate) {
    return res.status(400).json({ error: 'Missing assetId, startDate, or endDate' });
  }

  const asset = db.getAssetById(assetId);
  if (!asset) return res.status(404).json({ error: 'Asset not found' });

  if (asset.approvalStatus !== 'approved' || !asset.isAvailable) {
    return res.status(400).json({ error: 'This equipment is not currently available for booking.' });
  }
  if (isSameUser(sessionUser, asset.ownerId)) {
    return res.status(400).json({ error: 'You cannot book your own equipment.' });
  }
  if (new Date(endDate).getTime() < new Date(startDate).getTime()) {
    return res.status(400).json({ error: 'The return date must be on or after the start date.' });
  }

  // Check double booking prevention
  if (db.hasBookingConflict(assetId, startDate, endDate)) {
    return res.status(409).json({
      error: 'Double-booking conflict: This equipment is already booked and confirmed for the selected dates.',
    });
  }

  // Server-side estimate of the owner's charges (settled directly with the owner)
  const priceBreakdown = computePriceBreakdown(asset, startDate, endDate, {
    rentalUnit,
    deliveryRequired,
    deliveryDistanceKm: deliveryDistanceKm ? Number(deliveryDistanceKm) : undefined,
    operatorRequired,
  });

  const bookingCode = `RT-2026-${Math.floor(1000 + Math.random() * 9000)}`;
  const qrHandoverToken = `RTZ-HANDOVER-${Math.floor(1000 + Math.random() * 9000)}`;
  const bookingId = `book-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const resolvedCustomerName = (customerName || sessionUser.name || 'RENTZ Customer').trim();
  const resolvedCustomerPhone = (customerPhone || sessionUser.phone || '+255 700 000 000').trim();
  const resolvedCustomerId = sessionUser.uid || sessionUser.id;

  const newBooking: Booking = {
    id: bookingId,
    bookingId,
    bookingCode,
    listingId: asset.id,
    assetId: asset.id,
    listingTitle: asset.title,
    assetTitle: asset.title,
    assetImage: asset.images[0],
    categoryId: asset.categoryId,
    ownershipType: asset.ownershipType,
    ownerId: asset.ownerId,
    ownerName: asset.ownerName,
    ownerPhone: asset.ownerPhone,
    customerId: resolvedCustomerId,
    renterId: sessionUser.id,
    customerName: resolvedCustomerName,
    renterName: resolvedCustomerName,
    customerPhone: resolvedCustomerPhone,
    renterPhone: resolvedCustomerPhone,
    startDate,
    returnDate: endDate,
    endDate,
    billingInterval: priceBreakdown.rentalUnit,
    rentalUnit: priceBreakdown.rentalUnit,
    billableUnits: priceBreakdown.billableUnits,
    priceBreakdown,
    status: 'requested',
    bookingStatus: 'pending',
    deliveryRequired: !!deliveryRequired,
    deliveryDistanceKm: deliveryRequired && deliveryDistanceKm ? Number(deliveryDistanceKm) : undefined,
    deliveryDestination: deliveryAddress || '',
    deliveryAddress: deliveryAddress || '',
    operatorRequired: !!operatorRequired,
    notes: notes || '',
    digitalContractSigned: true,
    signedAt: new Date().toISOString(),
    qrHandoverToken,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.createBooking(newBooking);

  // Automatically create a dedicated Logistics & Delivery Driver Dispatch job if delivery is requested
  if (deliveryRequired) {
    const weightKg = Number(asset.weightKg) || 25;
    const distanceKm = deliveryDistanceKm ? Number(deliveryDistanceKm) : 5;
    const vehicleClass = getRequiredVehicleClass(weightKg);
    const dispatchJob: LogisticsDispatchJob = {
      id: `log-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      bookingId: newBooking.id,
      bookingCode: newBooking.bookingCode,
      assetId: asset.id,
      assetTitle: asset.title,
      assetImage: asset.images[0],
      weightKg,
      distanceKm,
      vehicleClass,
      requiredVehicleClass: vehicleClass,
      originAddress: `${asset.location.yardAddress || asset.location.district}, ${asset.location.region}`,
      pickupLocation: `${asset.location.yardAddress || asset.location.district}, ${asset.location.region}`,
      destinationAddress: deliveryAddress || `${asset.location.district}, ${asset.location.region}`,
      dropoffLocation: deliveryAddress || `${asset.location.district}, ${asset.location.region}`,
      renterName: sessionUser.name,
      renterPhone: sessionUser.phone,
      ownerName: asset.ownerName,
      ownerPhone: asset.ownerPhone,
      status: 'pending_assignment',
      waybillCode: `WB-TZ-${Math.floor(10000 + Math.random() * 90000)}`,
      estimatedEtaMinutes: Math.max(25, Math.round(distanceKm * 3.2)),
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    db.createLogisticsJob(dispatchJob);
  }

  db.addAuditLog('BOOKING_REQUESTED', sessionUser, `Requested booking ${bookingCode} for ${asset.title} (estimated TSh ${priceBreakdown.estimatedTotal.toLocaleString()}, settled with owner)`);

  res.status(201).json({ booking: bookingForViewer(newBooking, sessionUser) });
});

// Update booking status with strict state machine validation
apiRouter.post('/bookings/:id/status', (req: Request, res: Response) => {
  const sessionUser = requireAuth(res);
  if (!sessionUser) return;

  const { status, notes } = req.body as { status: BookingStatus; notes?: string };
  const booking = db.getBookingById(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  // Valid status transitions check
  const allowedTransitions: Partial<Record<BookingStatus, BookingStatus[]>> = {
    draft: ['requested', 'cancelled'],
    requested: ['confirmed', 'cancelled'],
    confirmed: ['ready_for_collection', 'active', 'cancelled', 'disputed'],
    ready_for_collection: ['active', 'cancelled', 'disputed'],
    active: ['return_due', 'under_inspection', 'disputed'],
    return_due: ['under_inspection', 'disputed'],
    under_inspection: ['completed', 'disputed'],
    completed: ['disputed'],
    cancelled: [],
    disputed: ['under_inspection', 'completed', 'cancelled'],
  };

  const isStaff = isStaffUser(sessionUser);
  const isOwner = isSameUser(sessionUser, booking.ownerId);
  const isRenter = isBookingRenter(sessionUser, booking);
  if (!isStaff && !isOwner && !isRenter) {
    return res.status(403).json({ error: 'You are not a party to this booking.' });
  }
  // A renter can only withdraw before collection, or raise a dispute
  const RENTER_CANCELLABLE: BookingStatus[] = ['draft', 'requested', 'confirmed', 'ready_for_collection'];
  if (isRenter && !isOwner && !isStaff) {
    const renterAllowed = (status === 'cancelled' && RENTER_CANCELLABLE.includes(booking.status)) || status === 'disputed';
    if (!renterAllowed) {
      return res.status(403).json({
        error: booking.status === 'requested' && status === 'confirmed'
          ? 'Only the equipment owner can accept this booking request.'
          : 'Only the equipment owner or RENTZ staff can make this change.',
      });
    }
  }

  // Accepting a request is the owner's decision, and must not double-book the asset
  if (booking.status === 'requested' && status === 'confirmed') {
    if (!isOwner && !isStaff) {
      return res.status(403).json({ error: 'Only the equipment owner can accept this booking request.' });
    }
    if (db.hasBookingConflict(booking.assetId, booking.startDate, booking.endDate, booking.id)) {
      return res.status(409).json({
        error: 'Cannot accept: this equipment is already confirmed for another booking on overlapping dates.',
      });
    }
  }

  const validNext = allowedTransitions[booking.status] || [];
  if (!validNext.includes(status) && !isAdminUser(sessionUser)) {
    return res.status(400).json({
      error: `Invalid transition from ${booking.status} to ${status}. Allowed: ${validNext.join(', ')}`,
    });
  }

  const updated = db.updateBooking(booking.id, {
    status,
    notes: notes ? `${booking.notes ? booking.notes + '\n' : ''}[${new Date().toLocaleTimeString()}]: ${notes}` : booking.notes,
  });

  db.addAuditLog('BOOKING_STATUS_CHANGED', sessionUser, `Booking ${booking.bookingCode} transitioned to ${status}`);
  res.json({ booking: updated && bookingForViewer(updated, sessionUser) });
});

// Rental Extension Request
apiRouter.post('/bookings/:id/request-extension', (req: Request, res: Response) => {
  const sessionUser = requireAuth(res);
  if (!sessionUser) return;

  const { requestedEndDate, reason } = req.body;
  const booking = db.getBookingById(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  // Security: only the renter who booked or admin can request extension
  if (!isAdminUser(sessionUser) && !isBookingRenter(sessionUser, booking)) {
    return res.status(403).json({ error: 'Only the renter can request an extension on this booking' });
  }

  // Allowed statuses
  const extendableStatuses: BookingStatus[] = ['confirmed', 'ready_for_collection', 'active', 'return_due'];
  if (!extendableStatuses.includes(booking.status)) {
    return res.status(400).json({ error: `Cannot extend booking in "${booking.status}" status` });
  }

  if (!requestedEndDate) {
    return res.status(400).json({ error: 'New end date is required' });
  }

  const currentEnd = new Date(booking.endDate);
  const newEnd = new Date(requestedEndDate);
  const diffTime = newEnd.getTime() - currentEnd.getTime();
  const additionalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (additionalDays <= 0) {
    return res.status(400).json({ error: 'Requested end date must be after the current booking return date' });
  }

  // Conflict check with other confirmed bookings for this asset
  if (db.hasBookingConflict(booking.assetId, booking.endDate, requestedEndDate, booking.id)) {
    return res.status(409).json({
      error: 'Conflict: This equipment is already reserved by another client during the requested extension period.',
    });
  }

  const asset = db.getAssetById(booking.assetId);
  const ratePerDay = asset?.pricing.ratePerDay || booking.priceBreakdown.rentalRate;

  // Estimate only; the extra hire is settled directly with the owner
  const additionalRentalAmount = additionalDays * ratePerDay;

  const updatedBooking = db.updateBooking(booking.id, {
    extensionRequest: {
      requestedEndDate,
      additionalDays,
      additionalRentalAmount,
      reason: reason || 'Renter requested hire period extension',
      status: 'pending',
      requestedAt: new Date().toISOString(),
    },
  });

  db.addAuditLog(
    'EXTENSION_REQUESTED',
    sessionUser,
    `Extension requested on ${booking.bookingCode} by +${additionalDays} days to ${requestedEndDate} (estimated +TSh ${additionalRentalAmount.toLocaleString()})`
  );

  res.json({ success: true, booking: updatedBooking && bookingForViewer(updatedBooking, sessionUser) });
});

// Respond to Extension Request (Owner / Admin)
apiRouter.post('/bookings/:id/respond-extension', (req: Request, res: Response) => {
  const sessionUser = requireAuth(res);
  if (!sessionUser) return;

  const { action, responseNotes } = req.body as { action: 'approve' | 'reject'; responseNotes?: string };
  const booking = db.getBookingById(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  if (!booking.extensionRequest || booking.extensionRequest.status !== 'pending') {
    return res.status(400).json({ error: 'No pending extension request found for this booking' });
  }

  // Authorization: Only owner of the asset or admin can approve/reject
  if (!isAdminUser(sessionUser) && !isSameUser(sessionUser, booking.ownerId)) {
    return res.status(403).json({ error: 'Only the equipment owner or platform administrator can respond to extensions' });
  }

  if (action === 'approve') {
    if (db.hasBookingConflict(booking.assetId, booking.endDate, booking.extensionRequest.requestedEndDate, booking.id)) {
      return res.status(409).json({
        error: 'Cannot approve: Conflicting booking was confirmed in the interim for this date window.',
      });
    }
  }

  const updatedBooking = db.respondBookingExtension(booking.id, action, responseNotes);

  db.addAuditLog(
    action === 'approve' ? 'EXTENSION_APPROVED' : 'EXTENSION_REJECTED',
    sessionUser,
    `Extension request for ${booking.bookingCode} ${action.toUpperCase()}D by ${sessionUser.name}`
  );

  res.json({ success: true, booking: updatedBooking && bookingForViewer(updatedBooking, sessionUser) });
});

// Inspections (Handover Dispatch and Return Check-In with Universal Category Fields)
apiRouter.get('/inspections', (req: Request, res: Response) => {
  if (!requireStaff(res)) return;
  const inspections = db.getInspections();
  res.json({ inspections });
});

apiRouter.get('/inspections/:bookingId', (req: Request, res: Response) => {
  const sessionUser = requireAuth(res);
  if (!sessionUser) return;
  const booking = db.getBookingById(req.params.bookingId);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  if (!isStaffUser(sessionUser) && !isBookingParty(sessionUser, booking)) {
    return res.status(403).json({ error: 'You are not a party to this booking.' });
  }
  const inspections = db.getInspections(req.params.bookingId);
  res.json({ inspections });
});

apiRouter.post('/inspections', (req: Request, res: Response) => {
  const sessionUser = requireAuth(res);
  if (!sessionUser) return;

  const {
    bookingId,
    type,
    conditionRating,
    checklist,
    meterReading,
    fuelLevel,
    equipmentCategory,
    unitQuantity,
    logisticsMode,
    courierOrHandler,
    returnTiming,
    cleanlinessState,
    missingOrDamagedItems,
    inspectionNotes,
    photoUrls,
    signatureName,
    damageCostEstimate,
  } = req.body;

  const booking = db.getBookingById(bookingId);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  if (!isStaffUser(sessionUser) && !isSameUser(sessionUser, booking.ownerId)) {
    return res.status(403).json({ error: 'Only the equipment owner or RENTZ field operations can record inspections.' });
  }
  if (type !== 'handover' && type !== 'return') {
    return res.status(400).json({ error: 'Inspection type must be handover or return' });
  }
  const INSPECTABLE: Record<'handover' | 'return', BookingStatus[]> = {
    handover: ['confirmed', 'ready_for_collection'],
    return: ['active', 'return_due', 'under_inspection'],
  };
  if (!INSPECTABLE[type as 'handover' | 'return'].includes(booking.status)) {
    return res.status(400).json({ error: `A ${type} inspection cannot be recorded while the booking is "${booking.status}".` });
  }

  const inspection: InspectionRecord = {
    id: `insp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    bookingId,
    assetId: booking.assetId,
    type,
    inspectedBy: sessionUser.name,
    inspectorRole: sessionUser.role === 'operations' ? 'RENTZ Operations' : sessionUser.role.toUpperCase(),
    timestamp: new Date().toISOString(),
    conditionRating: conditionRating || 'normal_wear',
    checklist: checklist || [],
    meterReading: meterReading || 'N/A',
    fuelLevel: fuelLevel || 'Verified',
    equipmentCategory: equipmentCategory || booking.categoryId,
    unitQuantity: unitQuantity || '1 Complete Unit / Set',
    logisticsMode: logisticsMode || (booking.deliveryRequired ? 'Site Delivery' : 'Yard Collection'),
    courierOrHandler: courierOrHandler || booking.renterName,
    returnTiming: type === 'return' ? (returnTiming || 'on_time') : undefined,
    cleanlinessState: type === 'return' ? (cleanlinessState || 'clean_ready') : undefined,
    missingOrDamagedItems: type === 'return' ? (missingOrDamagedItems || 'None') : undefined,
    inspectionNotes: inspectionNotes || 'Inspection completed according to standard equipment handover protocol.',
    photoUrls: photoUrls && photoUrls.length > 0 ? photoUrls : [booking.assetImage || '/src/assets/images/asset_diesel_generator_1792692516323.jpg'],
    signatureName: signatureName || `${booking.renterName} & ${sessionUser.name}`,
    damageCostEstimate: damageCostEstimate ? Number(damageCostEstimate) : undefined,
  };

  db.createInspection(inspection);

  if (type === 'handover') {
    db.updateBooking(booking.id, {
      status: 'active',
      handoverInspectionId: inspection.id,
    });
  } else if (type === 'return') {
    const hasDamage = conditionRating === 'minor_damage' || conditionRating === 'severe_damage';

    if (hasDamage) {
      // RENTZ records the damage; any repair cost is settled directly between owner and renter
      const claimAmount = inspection.damageCostEstimate;

      const autoDispute = db.createDispute({
        id: `disp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        bookingId: booking.id,
        assetTitle: booking.assetTitle,
        raisedByUserId: sessionUser.id,
        raisedByName: sessionUser.name,
        raisedByRole: sessionUser.role,
        reason: `Return Inspection Damage (${conditionRating.replace('_', ' ')})`,
        description: `Damage reported at Return Inspection (${inspection.id}). Missing/Damaged: ${missingOrDamagedItems || 'Reported in check-in'}.${claimAmount ? ` Estimated repair cost: TSh ${claimAmount.toLocaleString()}.` : ''}`,
        claimAmount,
        evidencePhotos: inspection.photoUrls,
        status: 'under_review',
        createdAt: new Date().toISOString(),
      });

      db.updateBooking(booking.id, {
        status: 'disputed',
        returnInspectionId: inspection.id,
        disputeId: autoDispute.id,
      });
    } else {
      db.updateBooking(booking.id, {
        status: 'completed',
        returnInspectionId: inspection.id,
      });
    }
  }

  db.addAuditLog('INSPECTION_RECORDED', sessionUser, `${type === 'handover' ? 'DISPATCH' : 'RETURN'} form recorded for booking ${booking.bookingCode}`);
  res.status(201).json({ inspection });
});

// Disputes
apiRouter.get('/disputes', (req: Request, res: Response) => {
  const sessionUser = requireAuth(res);
  if (!sessionUser) return;
  const disputes = db.getDisputes();
  if (isStaffUser(sessionUser)) return res.json({ disputes });
  res.json({
    disputes: disputes.filter((d) => {
      const booking = db.getBookingById(d.bookingId);
      return isSameUser(sessionUser, d.raisedByUserId) || (!!booking && isBookingParty(sessionUser, booking));
    }),
  });
});

apiRouter.post('/disputes', (req: Request, res: Response) => {
  const sessionUser = requireAuth(res);
  if (!sessionUser) return;

  const { bookingId, reason, description, claimAmount, evidencePhotos } = req.body;
  const booking = db.getBookingById(bookingId);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  if (!isStaffUser(sessionUser) && !isBookingParty(sessionUser, booking)) {
    return res.status(403).json({ error: 'You are not a party to this booking.' });
  }

  const dispute = db.createDispute({
    id: `disp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    bookingId,
    assetTitle: booking.assetTitle,
    raisedByUserId: sessionUser.id,
    raisedByName: sessionUser.name,
    raisedByRole: sessionUser.role,
    reason,
    description,
    claimAmount: claimAmount ? Number(claimAmount) : undefined,
    evidencePhotos: evidencePhotos || [],
    status: 'open',
    createdAt: new Date().toISOString(),
  });

  db.updateBooking(booking.id, {
    status: 'disputed',
    disputeId: dispute.id,
  });

  db.addAuditLog('DISPUTE_RAISED', sessionUser, `Dispute raised on ${booking.bookingCode}: ${reason}`);
  res.status(201).json({ dispute });
});

apiRouter.post('/disputes/:id/resolve', (req: Request, res: Response) => {
  const sessionUser = requireAdmin(res);
  if (!sessionUser) return;


  const { resolutionNotes, status } = req.body;
  const dispute = db.getDisputes().find((d) => d.id === req.params.id);
  if (!dispute) return res.status(404).json({ error: 'Dispute not found' });

  const updated = db.updateDispute(dispute.id, {
    status: status || 'resolved',
    resolutionNotes,
    resolvedAt: new Date().toISOString(),
  });

  const booking = db.getBookingById(dispute.bookingId);
  if (booking) {
    db.updateBooking(booking.id, { status: 'completed' });
  }

  db.addAuditLog('DISPUTE_RESOLVED', sessionUser, `Resolved dispute ${dispute.id} with outcome: ${status}`);
  res.json({ dispute: updated });
});

// Administration & Analytics
apiRouter.get('/admin/metrics', (req: Request, res: Response) => {
  if (!requireStaff(res)) return;
  res.json({ analytics: db.getAnalytics() });
});

// Public platform config (supported regions)
apiRouter.get('/admin/config', (req: Request, res: Response) => {
  res.json({ config: db.getConfig() });
});

apiRouter.put('/admin/config', (req: Request, res: Response) => {
  const sessionUser = requireAdmin(res);
  if (!sessionUser) return;

  const updated = db.updateConfig(req.body);
  db.addAuditLog('CONFIG_UPDATED', sessionUser, `Updated platform configuration`);
  res.json({ config: updated });
});

apiRouter.get('/audit-logs', (req: Request, res: Response) => {
  if (!requireAdmin(res)) return;
  res.json({ auditLogs: db.getAuditLogs() });
});

// ============================================================================
// DEDICATED LOGISTICS & DELIVERY DRIVER DISPATCH PORTAL ENDPOINTS
// ============================================================================
apiRouter.get('/logistics/jobs', (req: Request, res: Response) => {
  const sessionUser = requireAuth(res);
  if (!sessionUser) return;
  const jobs = db.getLogisticsJobs();
  if (isStaffUser(sessionUser)) return res.json({ jobs });
  // Parties see the delivery for their own bookings once the owner has accepted
  res.json({
    jobs: jobs.filter((j) => {
      const booking = db.getBookingById(j.bookingId);
      return !!booking && isBookingParty(sessionUser, booking) && CONTACT_SHARED_STATUSES.includes(booking.status);
    }),
  });
});

apiRouter.post('/logistics/jobs/:id/status', (req: Request, res: Response) => {
  const sessionUser = requireStaff(res);
  if (!sessionUser) return;

  const { status, driverName, driverPhone, vehiclePlate, recipientSignedBy } = req.body as {
    status: LogisticsJobStatus;
    driverName?: string;
    driverPhone?: string;
    vehiclePlate?: string;
    recipientSignedBy?: string;
  };

  const job = db.getLogisticsJobById(req.params.id);
  if (!job) return res.status(404).json({ error: 'Logistics dispatch job not found' });
  if (status === 'assigned' && !((driverName || job.driverName) && (driverPhone || job.driverPhone))) {
    return res.status(400).json({ error: "Enter the carrier's driver name and phone number to assign this delivery." });
  }

  const updates: Partial<LogisticsDispatchJob> = { status };
  if (driverName) updates.driverName = driverName;
  if (driverPhone) updates.driverPhone = driverPhone;
  if (vehiclePlate) updates.vehiclePlate = vehiclePlate;
  if (recipientSignedBy) updates.recipientSignedBy = recipientSignedBy;
  if (status === 'en_route_pickup') updates.dispatchedAt = new Date().toISOString();
  if (status === 'delivered_at_site') updates.deliveredAt = new Date().toISOString();
  if (status === 'returned_to_yard') updates.returnedAt = new Date().toISOString();

  const updatedJob = db.updateLogisticsJob(job.id, updates);

  // Sync booking status when delivered or returned
  if (status === 'delivered_at_site') {
    db.updateBooking(job.bookingId, { status: 'active' });
  } else if (status === 'returned_to_yard') {
    db.updateBooking(job.bookingId, { status: 'under_inspection' });
  }

  db.addAuditLog(
    'LOGISTICS_STATUS_UPDATE',
    sessionUser,
    `Dispatch ${job.waybillCode} (${job.bookingCode}) updated to ${status}`
  );

  res.json({ success: true, job: updatedJob });
});

// ============================================================================
// SUPPORT & BOOKING CHAT WITH WHATSAPP HANDOFF
// ============================================================================
function supportMessagesFor(user: User | null, bookingCode?: string): SupportMessage[] {
  const messages = db.getSupportMessages(bookingCode);
  if (!user) return [];
  if (isStaffUser(user)) return messages;
  const myBookingCodes = new Set(
    db.getBookings({}).filter((b) => isBookingParty(user, b)).map((b) => b.bookingCode)
  );
  return messages.filter(
    (m) =>
      isSameUser(user, m.senderId) ||
      isSameUser(user, m.recipientId) ||
      (!!m.bookingCode && myBookingCodes.has(m.bookingCode))
  );
}

apiRouter.get('/support/messages', (req: Request, res: Response) => {
  const { bookingId } = req.query;
  res.json({ messages: supportMessagesFor(getSessionUser(res), bookingId as string | undefined) });
});

apiRouter.post('/support/messages', (req: Request, res: Response) => {
  const { bookingId, bookingCode, text, channel, senderName, senderRole } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Message text is required' });
  }

  const user = getSessionUser(res);
  const trimmedText = String(text).trim().slice(0, 2000);
  const newMessage: SupportMessage = {
    id: `msg-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    bookingId: bookingId || undefined,
    bookingCode: bookingCode || undefined,
    senderId: user?.id || `guest-${crypto.randomBytes(4).toString('hex')}`,
    senderName: user?.name || String(senderName || 'Site Visitor').slice(0, 80),
    senderRole: user?.role || (senderRole === 'owner' ? 'owner' : 'renter'),
    text: trimmedText,
    message: trimmedText,
    channel: channel || 'in_app',
    timestamp: new Date().toISOString(),
  };

  db.addSupportMessage(newMessage);

  // Auto-reply from RENTZ Operations Desk if sent by renter or owner
  if (newMessage.senderRole === 'renter' || newMessage.senderRole === 'owner') {
    const replyBody = `Asante ${newMessage.senderName.split(' ')[0]}! We have received your message${newMessage.bookingCode ? ` about ${newMessage.bookingCode}` : ''}. A RENTZ team member will reply here. For urgent help, use the WhatsApp button above.`;
    const reply: SupportMessage = {
      id: `msg-${Date.now() + 1}-${Math.floor(100 + Math.random() * 900)}`,
      bookingId: newMessage.bookingId,
      bookingCode: newMessage.bookingCode,
      senderId: 'rentz-auto-reply',
      senderName: 'RENTZ Support (automatic reply)',
      senderRole: 'operations',
      recipientId: newMessage.senderId,
      text: replyBody,
      message: replyBody,
      channel: 'in_app',
      timestamp: new Date().toISOString(),
    };
    db.addSupportMessage(reply);
  }

  res.status(201).json({
    message: newMessage,
    // Guests have no session to read history with, so they get this exchange only
    messages: user
      ? supportMessagesFor(user, bookingId as string | undefined)
      : db.getSupportMessages().filter((m) => m.id === newMessage.id || m.recipientId === newMessage.senderId),
  });
});

// ============================================================================
// SUPPORTIVE APPS & EXTERNAL WEBS INTEGRATIONS HUB
// ============================================================================
// Honest status of outside services. Nothing here is connected to a live API yet.
apiRouter.get('/integrations/status', (req: Request, res: Response) => {
  res.json({
    integrations: [
      {
        id: 'whatsapp_links',
        name: 'WhatsApp click-to-chat links (wa.me)',
        category: 'Messaging',
        status: 'manual',
        endpoint: 'https://wa.me',
        description:
          'Opens WhatsApp with a pre-written message; a person must press Send. No WhatsApp Business API or SMS gateway is connected, so nothing is sent automatically.',
      },
      {
        id: 'google_workspace',
        name: 'Google Sheets / Calendar',
        category: 'Productivity',
        status: 'not_connected',
        endpoint: 'CSV download and calendar links only',
        description: 'Bookings can be downloaded as a CSV for Google Sheets, and calendar events opened in Google Calendar. No Google account is connected.',
      },
      {
        id: 'id_format_checks',
        name: 'NIDA / TRA TIN / BRELA number format check',
        category: 'Verification',
        status: 'format_check_only',
        endpoint: 'Checked inside RENTZ only',
        description:
          'Checks only that a number has the right shape. Nothing is checked with NIDA, TRA or BRELA; an administrator must inspect the original documents before verifying an owner.',
      },
      {
        id: 'gps_tracking',
        name: 'GPS tracking',
        category: 'Fleet tracking',
        status: 'not_connected',
        endpoint: 'None',
        description: 'No GPS trackers are connected. Maps show the yard location each owner entered for a listing.',
      },
    ],
  });
});

apiRouter.post('/integrations/send-alert', (req: Request, res: Response) => {
  const sessionUser = requireStaff(res);
  if (!sessionUser) return;
  const { phone, channel, templateType, bookingCode, customMessage } = req.body;
  const cleanPhone = (phone || '255793481147').replace(/[^0-9]/g, '');
  const messageBody =
    customMessage ||
    (templateType === 'dispatch_waybill'
      ? `RENTZ DISPATCH ALERT: Equipment for booking ${bookingCode || 'RT-2026'} has left the yard and is on its way. Check the digital gate pass on RENTZ.`
      : `RENTZ RETURN REMINDER: Hire period for booking ${bookingCode || 'RT-2026'} is due for check-in. Reply or open RENTZ to request an extension.`);

  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageBody)}`;

  db.addAuditLog(
    'EXTERNAL_ALERT_SENT',
    sessionUser,
    `Prepared WhatsApp message link for +${cleanPhone} (${bookingCode || 'General'})`
  );

  res.json({
    success: true,
    // Nothing is sent from the server: a person sends it by opening the WhatsApp link
    sent: false,
    channel: 'whatsapp',
    recipient: `+${cleanPhone}`,
    messageBody,
    whatsappUrl,
    timestamp: new Date().toISOString(),
  });
});

apiRouter.post('/integrations/verify-registry', (req: Request, res: Response) => {
  const { registryType, identifier } = req.body as {
    registryType: 'NIDA' | 'BRELA' | 'TRA_TIN';
    identifier: string;
  };

  const cleaned = (identifier || '').trim();
  if (!cleaned) {
    return res.status(400).json({ error: 'Identifier is required for verification' });
  }

  if (registryType === 'NIDA') {
    const digitsOnly = cleaned.replace(/[^0-9]/g, '');
    const isValid = digitsOnly.length === 20;
    return res.json({
      valid: isValid,
      registry: 'NIDA number (format check only)',
      identifier: cleaned,
      status: isValid ? 'FORMAT_OK' : 'FORMAT_INVALID_20_DIGITS_EXPECTED',
      holderName: isValid
        ? 'Format looks right. NOT checked with NIDA: inspect the original ID card.'
        : 'A NIDA number has 20 digits (e.g. 19880412-11205-00001-24).',
      verifiedAt: new Date().toISOString(),
    });
  }

  if (registryType === 'TRA_TIN') {
    const digitsOnly = cleaned.replace(/[^0-9]/g, '');
    const isValid = digitsOnly.length === 9;
    return res.json({
      valid: isValid,
      registry: 'TRA TIN (format check only)',
      identifier: cleaned,
      status: isValid ? 'FORMAT_OK' : 'FORMAT_INVALID_9_DIGITS_EXPECTED',
      holderName: isValid
        ? 'Format looks right. NOT checked with TRA: inspect the TIN certificate.'
        : 'A TRA TIN has 9 digits (e.g. 124-890-411).',
      verifiedAt: new Date().toISOString(),
    });
  }

  if (registryType === 'BRELA') {
    const isValid = cleaned.length >= 5;
    return res.json({
      valid: isValid,
      registry: 'BRELA certificate number (format check only)',
      identifier: cleaned,
      status: isValid ? 'FORMAT_OK' : 'FORMAT_INVALID',
      holderName: isValid
        ? 'Format looks right. NOT checked with BRELA: inspect the certificate of incorporation.'
        : 'Enter at least 5 characters of the BRELA certificate number.',
      verifiedAt: new Date().toISOString(),
    });
  }

  return res.status(400).json({ error: 'Unsupported registry type' });
});

