import {
  Asset,
  Category,
  Booking,
  InspectionRecord,
  PriceBreakdown,
  PlatformConfig,
  AdminAnalytics,
  User,
  UserRole,
  Dispute,
  AuditLog,
  RentalUnit,
  SavedSearch,
  SignInPortal,
  LogisticsDispatchJob,
  LogisticsJobStatus,
  SupportMessage,
} from '../types/index.js';
import { signOutFromFirebase } from './firebase.js';

const API_BASE = '/api';


export async function fetchCurrentUser(): Promise<{ user: User | null }> {
  const res = await fetch(`${API_BASE}/auth/me`);
  if (!res.ok) throw new Error('Failed to fetch user');
  return res.json();
}

// Switches the signed-in user's own view; the server decides which roles the account may use
export async function switchUserRole(role: UserRole): Promise<{ success: boolean; user: User }> {
  const res = await fetch(`${API_BASE}/auth/switch-role`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to switch role' }));
    throw new Error(err.error || 'Failed to switch role');
  }
  const data = await res.json();

  return data;
}

type AuthResponse = { success: boolean; user: User; message: string };

async function postAuth(path: string, body: unknown, fallbackError: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: fallbackError }));
    throw new Error(err.error || fallbackError);
  }
  return res.json();
}

// Sign in with email or mobile number + password; the server sets an httpOnly session cookie
export function loginUser(credentials: { identifier: string; password: string; portal: SignInPortal }): Promise<AuthResponse> {
  return postAuth('/auth/login', credentials, 'Failed to sign in');
}

export function registerUser(details: {
  name: string;
  phone: string;
  email?: string;
  password: string;
  // 'seller' creates a seller account (Seller Centre); 'buyer' a buyer account
  portal: SignInPortal;
  companyName?: string;
  tinNumber?: string;
  nidaNumber?: string;
}): Promise<AuthResponse> {
  return postAuth('/auth/register', details, 'Failed to create account');
}

// Exchanges a Firebase ID token (from Google sign-in) for a RENTZ session
export function loginWithGoogle(idToken: string, portal: SignInPortal): Promise<AuthResponse> {
  return postAuth('/auth/google', { idToken, portal }, 'Google sign-in failed');
}

export async function fetchUsersCollection(): Promise<User[]> {
  const res = await fetch(`${API_BASE}/users`);
  if (!res.ok) throw new Error('Failed to fetch users collection');
  const data = await res.json();
  return data.users;
}

export async function updateUserRoleInCollection(
  userId: string,
  payload: { role?: UserRole; hasAdminOpsAccess?: boolean }
): Promise<{ success: boolean; user: User }> {
  const res = await fetch(`${API_BASE}/users/${userId}/role`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Role update failed' }));
    throw new Error(err.error || 'Failed to update user role');
  }
  return res.json();
}

export async function fetchAdminOwners(): Promise<User[]> {
  const res = await fetch(`${API_BASE}/admin/owners`);
  if (!res.ok) throw new Error('Failed to fetch owners');
  const data = await res.json();
  return data.owners;
}

export async function verifyOwnerByAdmin(
  ownerId: string,
  kycData?: {
    nidaNumber?: string;
    tinNumber?: string;
    companyName?: string;
    customCode?: string;
  }
): Promise<{ success: boolean; owner: User; verificationCode: string; message: string }> {
  const res = await fetch(`${API_BASE}/admin/owners/${ownerId}/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(kycData || {}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Verification failed' }));
    throw new Error(err.error || 'Failed to verify owner');
  }
  return res.json();
}

export async function generateOwnerCodeByAdmin(
  ownerId: string,
  customCode?: string
): Promise<{ success: boolean; owner: User; verificationCode: string; message: string }> {
  const res = await fetch(`${API_BASE}/admin/owners/${ownerId}/generate-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customCode }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Code generation failed' }));
    throw new Error(err.error || 'Failed to generate code');
  }
  return res.json();
}

export async function revokeOwnerVerification(ownerId: string): Promise<{ success: boolean; owner: User; message: string }> {
  const res = await fetch(`${API_BASE}/admin/owners/${ownerId}/revoke`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Revocation failed' }));
    throw new Error(err.error || 'Failed to revoke owner verification');
  }
  return res.json();
}

export async function logoutUser(): Promise<{ success: boolean; user: User | null; message: string }> {
  await signOutFromFirebase();
  const res = await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('Failed to log out');
  return res.json();
}

export async function fetchCategories(): Promise<Category[]> {
  const res = await fetch(`${API_BASE}/categories`);
  if (!res.ok) throw new Error('Failed to fetch categories');
  const data = await res.json();
  return data.categories;
}

export async function createCategory(cat: Partial<Category>): Promise<Category> {
  const res = await fetch(`${API_BASE}/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cat),
  });
  if (!res.ok) throw new Error('Failed to create category');
  const data = await res.json();
  return data.category;
}

export async function fetchAssets(params?: {
  categoryId?: string;
  region?: string;
  ownershipType?: 'company' | 'third_party';
  query?: string;
  ownerId?: string;
  approvalStatus?: string;
}): Promise<Asset[]> {
  const res = await fetch(`${API_BASE}/assets`);
  if (!res.ok) throw new Error('Failed to fetch assets');
  const data = await res.json();
  let result: Asset[] = data.assets || [];

  if (params?.categoryId && params.categoryId !== 'all') {
    result = result.filter((a) => a.categoryId === params.categoryId);
  }
  if (params?.region && params.region !== 'all') {
    result = result.filter(
      (a) =>
        a.location?.region?.toLowerCase() === params.region!.toLowerCase() ||
        a.region?.toLowerCase() === params.region!.toLowerCase()
    );
  }
  if (params?.ownershipType) {
    result = result.filter((a) => a.ownershipType === params.ownershipType);
  }
  if (params?.ownerId) {
    result = result.filter((a) => a.ownerId === params.ownerId);
  }
  if (params?.approvalStatus && params.approvalStatus !== 'all') {
    result = result.filter((a) => a.approvalStatus === params.approvalStatus);
  }
  if (params?.query) {
    const q = params.query.toLowerCase();
    result = result.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.location?.region?.toLowerCase().includes(q) ||
        a.location?.district?.toLowerCase().includes(q)
    );
  }

  return result;
}

export async function fetchAssetById(id: string): Promise<Asset> {
  const res = await fetch(`${API_BASE}/assets/${id}`);
  if (!res.ok) throw new Error('Failed to fetch asset');
  const data = await res.json();
  return data.asset;
}

export async function createAsset(assetData: any): Promise<Asset> {
  const res = await fetch(`${API_BASE}/assets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(assetData),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to list asset');
  }
  const data = await res.json();
  return data.asset;
}

async function readJsonOrThrow(res: Response, fallbackError: string) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: fallbackError }));
    throw new Error(err.error || fallbackError);
  }
  return res.json();
}

export async function updateAsset(assetId: string, assetData: Partial<Asset>): Promise<Asset> {
  const res = await fetch(`${API_BASE}/assets/${assetId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(assetData),
  });
  return (await readJsonOrThrow(res, 'Failed to update asset')).asset;
}

export async function updateAssetStatus(
  assetId: string,
  updates: { approvalStatus?: string; isAvailable?: boolean }
): Promise<Asset> {
  const res = await fetch(`${API_BASE}/assets/${assetId}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  return (await readJsonOrThrow(res, 'Failed to update asset status')).asset;
}

export async function deleteAsset(assetId: string): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/assets/${assetId}`, { method: 'DELETE' });
  return readJsonOrThrow(res, 'Failed to delete asset');
}

export async function calculatePrice(params: {
  assetId: string;
  startDate: string;
  endDate: string;
  rentalUnit?: RentalUnit;
  deliveryRequired?: boolean;
  deliveryDistanceKm?: number;
  operatorRequired?: boolean;
}): Promise<{ breakdown: PriceBreakdown; hasConflict: boolean; conflictMessage: string | null }> {
  const res = await fetch(`${API_BASE}/pricing/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return readJsonOrThrow(res, 'Failed to calculate pricing');
}

export async function fetchBookings(status?: string): Promise<Booking[]> {
  const query = status && status !== 'all' ? `?status=${encodeURIComponent(status)}` : '';
  const res = await fetch(`${API_BASE}/bookings${query}`);
  const data = await readJsonOrThrow(res, 'Failed to fetch bookings');
  return (data.bookings as Booking[]).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function fetchBookingById(id: string): Promise<{ booking: Booking; inspections: InspectionRecord[] }> {
  const res = await fetch(`${API_BASE}/bookings/${id}`);
  if (!res.ok) throw new Error('Failed to fetch booking details');
  return res.json();
}

export async function createBooking(payload: {
  assetId: string;
  startDate: string;
  endDate: string;
  rentalUnit?: RentalUnit;
  deliveryRequired?: boolean;
  deliveryDistanceKm?: number;
  deliveryAddress?: string;
  operatorRequired?: boolean;
  notes?: string;
  customerName?: string;
  customerPhone?: string;
}): Promise<Booking> {
  const res = await fetch(`${API_BASE}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Booking creation failed');
  }
  const data = await res.json();
  return data.booking;
}

export async function updateBookingStatus(id: string, status: string, notes?: string): Promise<Booking> {
  const res = await fetch(`${API_BASE}/bookings/${id}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, notes }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Status transition failed');
  }
  const data = await res.json();
  return data.booking;
}

export async function fetchAllInspections(): Promise<InspectionRecord[]> {
  const res = await fetch(`${API_BASE}/inspections`);
  if (!res.ok) throw new Error('Failed to fetch inspections');
  const data = await res.json();
  return data.inspections;
}

export async function recordInspection(payload: any): Promise<InspectionRecord> {
  const res = await fetch(`${API_BASE}/inspections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to record inspection');
  }
  const data = await res.json();
  return data.inspection;
}

export async function fetchDisputes(): Promise<Dispute[]> {
  const res = await fetch(`${API_BASE}/disputes`);
  if (!res.ok) throw new Error('Failed to fetch disputes');
  const data = await res.json();
  return data.disputes;
}

export async function createDispute(payload: {
  bookingId: string;
  reason: string;
  description: string;
  claimAmount?: number;
  evidencePhotos?: string[];
}): Promise<Dispute> {
  const res = await fetch(`${API_BASE}/disputes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to raise dispute');
  const data = await res.json();
  return data.dispute;
}

export async function resolveDispute(disputeId: string, resolutionNotes: string, status: string): Promise<Dispute> {
  const res = await fetch(`${API_BASE}/disputes/${disputeId}/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resolutionNotes, status }),
  });
  if (!res.ok) throw new Error('Failed to resolve dispute');
  const data = await res.json();
  return data.dispute;
}

export async function fetchAdminMetrics(): Promise<AdminAnalytics> {
  const res = await fetch(`${API_BASE}/admin/metrics`);
  if (!res.ok) throw new Error('Failed to fetch admin metrics');
  const data = await res.json();
  return data.analytics;
}

export async function fetchPlatformConfig(): Promise<PlatformConfig> {
  const res = await fetch(`${API_BASE}/admin/config`);
  if (!res.ok) throw new Error('Failed to fetch platform config');
  const data = await res.json();
  return data.config;
}

export async function updatePlatformConfig(config: Partial<PlatformConfig>): Promise<PlatformConfig> {
  const res = await fetch(`${API_BASE}/admin/config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  if (!res.ok) throw new Error('Failed to update config');
  const data = await res.json();
  return data.config;
}

export async function fetchAuditLogs(): Promise<AuditLog[]> {
  const res = await fetch(`${API_BASE}/audit-logs`);
  if (!res.ok) throw new Error('Failed to fetch audit logs');
  const data = await res.json();
  return data.auditLogs;
}

// Saved Searches
export async function fetchSavedSearches(): Promise<SavedSearch[]> {
  const res = await fetch(`${API_BASE}/user/saved-searches`);
  if (!res.ok) throw new Error('Failed to fetch saved searches');
  const data = await res.json();
  return data.savedSearches;
}

export async function createSavedSearch(search: {
  name: string;
  query?: string;
  categoryId?: string;
  categoryName?: string;
  region?: string;
  ownershipFilter?: 'all' | 'company' | 'third_party';
}): Promise<SavedSearch> {
  const res = await fetch(`${API_BASE}/user/saved-searches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(search),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to save search');
  }
  const data = await res.json();
  return data.savedSearch;
}

export async function deleteSavedSearch(id: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/user/saved-searches/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete saved search');
  const data = await res.json();
  return data.success;
}

// Booking Extensions
export async function requestBookingExtension(
  bookingId: string,
  payload: { requestedEndDate: string; reason?: string }
): Promise<Booking> {
  const res = await fetch(`${API_BASE}/bookings/${bookingId}/request-extension`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Extension request failed');
  }
  const data = await res.json();
  return data.booking;
}

export async function respondBookingExtension(
  bookingId: string,
  payload: { action: 'approve' | 'reject'; responseNotes?: string }
): Promise<Booking> {
  const res = await fetch(`${API_BASE}/bookings/${bookingId}/respond-extension`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Responding to extension failed');
  }
  const data = await res.json();
  return data.booking;
}

// Logistics & Delivery Driver Dispatch Portal
export async function fetchLogisticsJobs(): Promise<LogisticsDispatchJob[]> {
  const res = await fetch(`${API_BASE}/logistics/jobs`);
  if (!res.ok) throw new Error('Failed to fetch logistics dispatch jobs');
  const data = await res.json();
  return data.jobs;
}

export async function updateLogisticsJobStatus(
  jobId: string,
  payload: {
    status: LogisticsJobStatus;
    driverName?: string;
    driverPhone?: string;
    vehiclePlate?: string;
    recipientSignedBy?: string;
  }
): Promise<LogisticsDispatchJob> {
  const res = await fetch(`${API_BASE}/logistics/jobs/${jobId}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to update dispatch status' }));
    throw new Error(err.error || 'Failed to update dispatch status');
  }
  const data = await res.json();
  return data.job;
}

// Support & Booking Chat
export async function fetchSupportMessages(bookingId?: string): Promise<SupportMessage[]> {
  const query = bookingId ? `?bookingId=${encodeURIComponent(bookingId)}` : '';
  const res = await fetch(`${API_BASE}/support/messages${query}`);
  if (!res.ok) throw new Error('Failed to fetch support messages');
  const data = await res.json();
  return data.messages;
}

export async function sendSupportMessage(payload: {
  bookingId?: string;
  bookingCode?: string;
  text: string;
  channel?: 'in_app' | 'whatsapp_handoff';
  senderName?: string;
  senderRole?: string;
}): Promise<{ message: SupportMessage; messages: SupportMessage[] }> {
  const res = await fetch(`${API_BASE}/support/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to send message');
  return res.json();
}

// Supportive Apps & External Webs Integrations
export async function fetchIntegrationsStatus(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/integrations/status`);
  if (!res.ok) throw new Error('Failed to fetch integrations status');
  const data = await res.json();
  return data.integrations;
}

export async function sendWhatsAppSmsAlert(payload: {
  phone: string;
  channel?: 'whatsapp' | 'sms';
  templateType?: 'dispatch_waybill' | 'return_reminder';
  bookingCode?: string;
  customMessage?: string;
}): Promise<{
  success: boolean;
  sent: false;
  channel: string;
  recipient: string;
  messageBody: string;
  whatsappUrl: string;
  timestamp: string;
}> {
  const res = await fetch(`${API_BASE}/integrations/send-alert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to send WhatsApp/SMS alert');
  return res.json();
}

export async function verifyGovernmentRegistry(payload: {
  registryType: 'NIDA' | 'BRELA' | 'TRA_TIN';
  identifier: string;
}): Promise<{
  valid: boolean;
  registry: string;
  identifier: string;
  status: string;
  holderName: string;
  verificationUrl?: string;
  verifiedAt: string;
}> {
  const res = await fetch(`${API_BASE}/integrations/verify-registry`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to verify registry identifier');
  return res.json();
}
