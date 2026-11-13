import React, { useState, useEffect } from 'react';
import {
  AdminAnalytics,
  PlatformConfig,
  Booking,
  Asset,
  Category,
  Dispute,
  AuditLog,
  User,
  UserRole,
  AppLanguage,
} from '../types/index.js';
import {
  fetchAdminMetrics,
  fetchPlatformConfig,
  updatePlatformConfig,
  fetchBookings,
  fetchAssets,
  fetchCategories,
  createCategory,
  fetchDisputes,
  resolveDispute,
  fetchAuditLogs,
  updateAssetStatus,
  deleteAsset,
  fetchAdminOwners,
  verifyOwnerByAdmin,
  generateOwnerCodeByAdmin,
  revokeOwnerVerification,
  fetchUsersCollection,
  updateUserRoleInCollection,
} from '../services/api.js';
import { formatTZS, formatDate, formatDateTime } from '../utils/formatters.js';
import {
  ShieldCheck,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Layers,
  Wrench,
  CheckCircle2,
  XCircle,
  Settings,
  FileText,
  Clock,
  Sliders,
  Plus,
  RefreshCw,
  Loader2,
  KeyRound,
  Copy,
  Check,
  Sparkles,
  UserCheck,
  BadgeCheck,
  Lock,
} from 'lucide-react';

interface AdminDashboardProps {
  currentUser: User;
  language: AppLanguage;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser, language }) => {
  const [metrics, setMetrics] = useState<AdminAnalytics | null>(null);
  const [config, setConfig] = useState<PlatformConfig | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [owners, setOwners] = useState<User[]>([]);
  const [usersCollection, setUsersCollection] = useState<User[]>([]);
  const [userRoleActionLoading, setUserRoleActionLoading] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [activeSection, setActiveSection] = useState<
    'overview' | 'users' | 'owners' | 'listings' | 'categories' | 'disputes' | 'audit'
  >('overview');

  // Owner verification, Business KYC & Verification Code Generator state
  const [ownerFilter, setOwnerFilter] = useState<'all' | 'verified' | 'ordinary'>('all');
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [ownerActionLoading, setOwnerActionLoading] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const [selectedKycOwnerId, setSelectedKycOwnerId] = useState<string>('');
  const [kycNidaNumber, setKycNidaNumber] = useState<string>('');
  const [kycTinNumber, setKycTinNumber] = useState<string>('');
  const [kycCompanyName, setKycCompanyName] = useState<string>('');
  const [generatedCodeInput, setGeneratedCodeInput] = useState<string>(
    `RTZ-VER-${Math.floor(1000 + Math.random() * 9000)}`
  );

  // Category creation form state
  const [newCatName, setNewCatName] = useState('');
  const [newCatSlug, setNewCatSlug] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');


  // Dispute resolution state
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const loadAll = async () => {
    setLoading(true);
    try {
      const [m, c, b, a, cats, d, l, ow, allUsers] = await Promise.all([
        fetchAdminMetrics(),
        fetchPlatformConfig(),
        fetchBookings(),
        fetchAssets(),
        fetchCategories(),
        fetchDisputes(),
        fetchAuditLogs(),
        fetchAdminOwners(),
        fetchUsersCollection(),
      ]);
      setMetrics(m);
      setConfig(c);
      setBookings(b);
      setAssets(a);
      setCategories(cats);
      setDisputes(d);
      setAuditLogs(l);
      setOwners(ow);
      setUsersCollection(allUsers);
      if (ow.length > 0 && !selectedKycOwnerId) {
        const firstOwner = ow.find((o) => o.ownerTier !== 'verified') || ow[0];
        selectOwnerForKycStudio(firstOwner);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUserRole = async (targetUser: User, nextRole: UserRole, grantAdminOps: boolean) => {
    setUserRoleActionLoading(targetUser.id);
    try {
      const res = await updateUserRoleInCollection(targetUser.id, {
        role: nextRole,
        hasAdminOpsAccess: grantAdminOps,
      });
      if (res.success) {
        setUsersCollection((prev) => prev.map((u) => (u.id === targetUser.id ? res.user : u)));
        setActionSuccessMsg(
          `Updated ${res.user.email} in users collection → Role: ${res.user.role.toUpperCase()}${
            res.user.hasAdminOpsAccess ? ' (Admin + Field Ops Access Granted)' : ''
          }`
        );
        setTimeout(() => setActionSuccessMsg(null), 5000);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setUserRoleActionLoading(null);
    }
  };

  const selectOwnerForKycStudio = (owner: User) => {
    setSelectedKycOwnerId(owner.id);
    // Only what the owner actually provided; the admin types in what they checked
    setKycNidaNumber(owner.nidaNumber || '');
    setKycTinNumber(owner.tinNumber || '');
    setKycCompanyName(owner.companyName || '');
    setGeneratedCodeInput(
      owner.verificationCode || `RTZ-VER-${Math.floor(1000 + Math.random() * 9000)}`
    );
  };

  const handleRollNewVerificationCode = () => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    setGeneratedCodeInput(`RTZ-VER-${randomSuffix}`);
  };

  const handleAdminKycAndCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKycOwnerId) return;
    setOwnerActionLoading(selectedKycOwnerId);
    try {
      const codeToIssue =
        generatedCodeInput.trim().toUpperCase() ||
        `RTZ-VER-${Math.floor(1000 + Math.random() * 9000)}`;
      const res = await verifyOwnerByAdmin(selectedKycOwnerId, {
        nidaNumber: kycNidaNumber.trim(),
        tinNumber: kycTinNumber.trim(),
        companyName: kycCompanyName.trim(),
        customCode: codeToIssue,
      });
      if (res.success) {
        setOwners((prev) => prev.map((o) => (o.id === selectedKycOwnerId ? res.owner : o)));
        setGeneratedCodeInput(res.verificationCode);
        setActionSuccessMsg(
          `KYC Verified for ${res.owner.name} (TIN: ${res.owner.tinNumber || 'N/A'}) & Issued Verification Code: ${res.verificationCode}`
        );
        setTimeout(() => setActionSuccessMsg(null), 6000);
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to save KYC and generate verification code');
    } finally {
      setOwnerActionLoading(null);
    }
  };

  const handleVerifyAndGenerateCode = async (ownerId: string) => {
    setOwnerActionLoading(ownerId);
    try {
      // Uses the NIDA / TIN already on file; the server refuses if there is none
      const res = await verifyOwnerByAdmin(ownerId);
      if (res.success) {
        setOwners((prev) => prev.map((o) => (o.id === ownerId ? res.owner : o)));
        if (selectedKycOwnerId === ownerId) {
          selectOwnerForKycStudio(res.owner);
        }
        setActionSuccessMsg(`Owner verified successfully! Generated Authorization Code: ${res.verificationCode}`);
        setTimeout(() => setActionSuccessMsg(null), 5000);
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to verify owner');
    } finally {
      setOwnerActionLoading(null);
    }
  };

  const handleRegenerateCode = async (ownerId: string) => {
    setOwnerActionLoading(ownerId);
    try {
      const res = await generateOwnerCodeByAdmin(ownerId);
      if (res.success) {
        setOwners((prev) => prev.map((o) => (o.id === ownerId ? res.owner : o)));
        if (selectedKycOwnerId === ownerId) {
          setGeneratedCodeInput(res.verificationCode);
        }
        setActionSuccessMsg(`New Verification Code generated: ${res.verificationCode}`);
        setTimeout(() => setActionSuccessMsg(null), 5000);
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to regenerate code');
    } finally {
      setOwnerActionLoading(null);
    }
  };

  const handleRevokeOwnerVerification = async (ownerId: string) => {
    if (!confirm('Are you sure you want to revoke verified status for this owner? Their account will revert to Ordinary Owner tier.')) {
      return;
    }
    setOwnerActionLoading(ownerId);
    try {
      const res = await revokeOwnerVerification(ownerId);
      if (res.success) {
        setOwners((prev) => prev.map((o) => (o.id === ownerId ? res.owner : o)));
        setActionSuccessMsg('Owner status successfully revoked back to Ordinary Owner');
        setTimeout(() => setActionSuccessMsg(null), 5000);
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to revoke verification');
    } finally {
      setOwnerActionLoading(null);
    }
  };

  const copyToClipboard = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2500);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName || !newCatSlug) return;
    try {
      const created = await createCategory({
        name: newCatName,
        slug: newCatSlug,
        description: newCatDesc,
        iconName: 'Wrench',
      });
      setCategories([...categories, created]);
      setNewCatName('');
      setNewCatSlug('');
      setNewCatDesc('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleListingApproval = async (assetId: string, approvalStatus: string) => {
    try {
      const updated = await updateAssetStatus(assetId, { approvalStatus });
      setAssets(assets.map((a) => (a.id === assetId ? updated : a)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleResolveDispute = async (status: string) => {
    if (!selectedDispute) return;
    try {
      const resolved = await resolveDispute(selectedDispute.id, resolutionNotes, status);
      setDisputes(disputes.map((d) => (d.id === resolved.id ? resolved : d)));
      setSelectedDispute(null);
      setResolutionNotes('');
    } catch (err) {
      console.error(err);
    }
  };

  if (loading || !metrics || !config) {
    return (
      <div className="flex items-center justify-center p-24">
        <Loader2 className="w-8 h-8 animate-spin text-amber-700" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-stone-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight">
              RENTZ Administration Console
            </h1>
            <span className="px-2.5 py-0.5 text-[11px] font-bold rounded bg-stone-900 text-white font-mono">
              DIRECTOR LEVEL
            </span>
          </div>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Platform activity monitoring, owner verification, fleet governance, and audit trails.
          </p>
        </div>

        <button
          onClick={loadAll}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Navigation Sub-menu */}
      <div className="border-b border-stone-200 my-6">
        <div className="flex gap-6 overflow-x-auto">
          {[
            { id: 'overview', label: 'Platform Analytics & KPIs' },
            { id: 'users', label: `Users & Role Collection (${usersCollection.length})` },
            { id: 'owners', label: `Verification, KYC & Code Generator (${owners.length})` },
            { id: 'listings', label: `Fleet & Listings (${assets.length})` },
            { id: 'categories', label: `Category Manager (${categories.length})` },
            { id: 'disputes', label: `Disputes (${disputes.length})` },
            { id: 'audit', label: 'Audit Security Log' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id as any)}
              className={`pb-3 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors cursor-pointer ${
                activeSection === tab.id
                  ? 'border-b-2 border-amber-700 text-amber-800'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Action Toast Alert */}
      {actionSuccessMsg && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between text-xs text-emerald-900 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="font-semibold">{actionSuccessMsg}</span>
          </div>
          <button
            onClick={() => setActionSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold ml-4 text-xs cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Section 1: Overview & Financial Analytics (Master Prompt Section 11) */}
      {activeSection === 'overview' && (
        <div className="space-y-6">
          {/* Main KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-white rounded-xl border border-stone-200 shadow-2xs">
              <p className="text-[11px] text-stone-400 uppercase tracking-wider font-semibold">Estimated Hire Value</p>
              <p className="text-2xl font-black text-stone-900 font-mono tabular-nums mt-1">
                {formatTZS(metrics.grossRentalValue)}
              </p>
              <p className="text-[11px] text-stone-500 mt-0.5">Accepted bookings, settled directly between renters and owners</p>
            </div>

            <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 shadow-2xs">
              <p className="text-[11px] text-emerald-800 uppercase tracking-wider font-bold">Free Platform</p>
              <p className="text-2xl font-black text-emerald-900 font-mono tabular-nums mt-1">TSh 0</p>
              <p className="text-[11px] text-emerald-700 mt-0.5">No payments, commissions or deposits pass through RENTZ</p>
            </div>
          </div>

          {/* Operational Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-white rounded-xl border border-stone-200 text-center">
              <p className="text-xs text-stone-500">Total Bookings</p>
              <p className="text-xl font-bold font-mono text-stone-900 mt-1">{metrics.totalBookings}</p>
            </div>
            <div className="p-4 bg-white rounded-xl border border-stone-200 text-center">
              <p className="text-xs text-stone-500">Active on Hire</p>
              <p className="text-xl font-bold font-mono text-amber-700 mt-1">{metrics.activeRentals}</p>
            </div>
            <div className="p-4 bg-white rounded-xl border border-stone-200 text-center">
              <p className="text-xs text-stone-500">Average Booking Value</p>
              <p className="text-xl font-bold font-mono text-stone-900 mt-1">{formatTZS(metrics.averageBookingValue)}</p>
            </div>
            <div className="p-4 bg-white rounded-xl border border-stone-200 text-center">
              <p className="text-xs text-stone-500">Repeat Customer Rate</p>
              <p className="text-xl font-bold font-mono text-stone-900 mt-1">{metrics.repeatCustomerRate}%</p>
            </div>
          </div>

          {/* Category Breakdown Table */}
          <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800">
                Equipment Category Utilization & Revenue
              </h3>
              <span className="text-[11px] text-stone-500 font-mono">Tanzania Market Demand</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-stone-50 text-stone-500 border-b border-stone-200">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Category Name</th>
                    <th className="py-2.5 px-4 font-semibold text-center">Booking Count</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Gross Rental Volume</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {metrics.categoryBreakdown.map((c, idx) => (
                    <tr key={idx} className="hover:bg-stone-50/50">
                      <td className="py-3 px-4 font-semibold text-stone-800">{c.categoryName}</td>
                      <td className="py-3 px-4 text-center font-mono tabular-nums">{c.bookingCount}</td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-stone-900">
                        {formatTZS(c.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Section: Users Collection & Automatic Admin/Ops Role Access */}
      {activeSection === 'users' && (
        <div className="space-y-6">
          <div className="p-5 bg-stone-900 text-white rounded-2xl border border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm sm:text-base font-extrabold tracking-tight">
                  Users Collection — Role-Based Access Control (RBAC)
                </h3>
              </div>
              <p className="text-xs text-stone-300">
                Stores user roles (`admin`, `operations`, `owner`, `renter`) and automatically grants full Admin + Field Operations access to{' '}
                <span className="font-mono font-bold text-amber-300">safarigoodluck35@gmail.com</span> and{' '}
                <span className="font-mono font-bold text-amber-300">giftj964@gmail.com</span>.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-400/40 text-amber-300 font-mono text-xs font-bold">
                {usersCollection.filter((u) => u.hasAdminOpsAccess).length} Auto-Granted Admin/Ops
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-800">
                  Registered `users` Collection ({usersCollection.length} Documents)
                </h4>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Synchronized between `/users/&#123;userId&#125;` and RENTZ RBAC engine.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-stone-50 text-stone-500 border-b border-stone-200">
                  <tr>
                    <th className="py-3 px-4 font-semibold">User Identity & Email</th>
                    <th className="py-3 px-4 font-semibold">Active Role</th>
                    <th className="py-3 px-4 font-semibold">Allowed Roles (`allowedRoles`)</th>
                    <th className="py-3 px-4 font-semibold">Admin / Ops Auto-Grant</th>
                    <th className="py-3 px-4 font-semibold text-right">Role Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {usersCollection.map((u) => {
                    const isAutoAdminOps = !!u.hasAdminOpsAccess;
                    const isBusy = userRoleActionLoading === u.id;
                    return (
                      <tr key={u.id} className="hover:bg-stone-50/70">
                        <td className="py-3 px-4">
                          <p className="font-bold text-stone-900">{u.name}</p>
                          <p className="font-mono text-[11px] text-stone-600">{u.email}</p>
                          <p className="font-mono text-[10px] text-stone-400">
                            ID: {u.id} {u.phone ? `• ${u.phone}` : ''}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase font-mono ${
                              u.role === 'admin'
                                ? 'bg-stone-900 text-amber-300'
                                : u.role === 'operations'
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : u.role === 'owner'
                                ? 'bg-sky-100 text-sky-900'
                                : 'bg-stone-100 text-stone-700'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {(u.allowedRoles && u.allowedRoles.length > 0 ? u.allowedRoles : [u.role]).map((r) => (
                              <span
                                key={r}
                                className="px-2 py-0.5 rounded bg-stone-100 border border-stone-200 font-mono text-[10px] font-semibold text-stone-700"
                              >
                                {r}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {isAutoAdminOps ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-300 text-emerald-900 text-[11px] font-bold">
                              <BadgeCheck className="w-3.5 h-3.5 text-emerald-700" />
                              {u.hasAdminOpsAccess
                                ? 'Auto-Granted (Root Admin & Ops)'
                                : 'Admin & Ops Enabled'}
                            </span>
                          ) : (
                            <span className="text-[11px] text-stone-400">Standard Role Scope</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            <select
                              disabled={isBusy}
                              value={u.role}
                              onChange={(e) =>
                                handleUpdateUserRole(u, e.target.value as UserRole, isAutoAdminOps)
                              }
                              className="px-2.5 py-1.5 text-xs font-semibold bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-600 cursor-pointer"
                            >
                              <option value="renter">Renter</option>
                              <option value="owner">Owner</option>
                              <option value="operations">Field Ops</option>
                              <option value="admin">Admin</option>
                            </select>
                            {!u.hasAdminOpsAccess && (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleUpdateUserRole(u, u.role, !u.hasAdminOpsAccess)}
                                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border cursor-pointer transition-colors ${
                                  u.hasAdminOpsAccess
                                    ? 'bg-stone-100 text-stone-700 border-stone-300 hover:bg-stone-200'
                                    : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                                }`}
                              >
                                {u.hasAdminOpsAccess ? 'Revoke Admin/Ops' : 'Grant Admin/Ops'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Section: Owner Verification & Code Management */}
      {activeSection === 'owners' && (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-white rounded-xl border border-stone-200 shadow-2xs">
              <p className="text-[11px] text-stone-400 uppercase tracking-wider font-semibold">Total Registered Owners</p>
              <p className="text-2xl font-black text-stone-900 font-mono tabular-nums mt-1">{owners.length}</p>
              <p className="text-[11px] text-stone-500 mt-0.5">Fleet hosts & equipment suppliers</p>
            </div>

            <div className="p-4 bg-amber-50/70 rounded-xl border border-amber-300 shadow-2xs">
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-amber-800 uppercase tracking-wider font-bold">Verified Owners (Tier 1)</p>
                <BadgeCheck className="w-4 h-4 text-amber-700" />
              </div>
              <p className="text-2xl font-black text-amber-950 font-mono tabular-nums mt-1">
                {owners.filter((o) => o.ownerTier === 'verified').length}
              </p>
              <p className="text-[11px] text-amber-800 font-medium mt-0.5">Admin Verified (trust badge)</p>
            </div>

            <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 shadow-2xs">
              <p className="text-[11px] text-stone-500 uppercase tracking-wider font-semibold">Ordinary Owners (Tier 2)</p>
              <p className="text-2xl font-black text-stone-800 font-mono tabular-nums mt-1">
                {owners.filter((o) => o.ownerTier !== 'verified').length}
              </p>
              <p className="text-[11px] text-stone-500 mt-0.5">Not yet verified</p>
            </div>

            <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-emerald-800 uppercase tracking-wider font-bold">Active Auth Codes</p>
                <KeyRound className="w-4 h-4 text-emerald-700" />
              </div>
              <p className="text-2xl font-black text-emerald-950 font-mono tabular-nums mt-1">
                {owners.filter((o) => !!o.verificationCode).length}
              </p>
              <p className="text-[11px] text-emerald-700 mt-0.5">Unique RTZ-VER authorization keys</p>
            </div>
          </div>

          {/* Admin Business KYC (NIDA / TRA TIN / BRELA) & Verification Code Generator Studio */}
          <div className="bg-white rounded-2xl border-2 border-amber-700/80 overflow-hidden shadow-xs">
            <div className="px-5 py-4 bg-stone-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-600 text-stone-950 flex items-center justify-center shrink-0">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-extrabold tracking-tight">
                      Tanzania Business KYC (NIDA / TRA / BRELA) & Verification Code Generator
                    </h3>
                    <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded bg-amber-600 text-stone-950">
                      ADMIN EXCLUSIVE
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-300 mt-0.5">
                    Verify owner NIDA, TRA TIN, and BRELA business registration and generate official RTZ-VER-XXXX authorization codes.
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleAdminKycAndCodeSubmit} className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left 7 Cols: Business KYC Verification Form (Moved from Owner Portal) */}
              <div className="lg:col-span-7 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-1">
                    Select Asset Owner Account to Verify *
                  </label>
                  <select
                    value={selectedKycOwnerId}
                    onChange={(e) => {
                      const found = owners.find((o) => o.id === e.target.value);
                      if (found) selectOwnerForKycStudio(found);
                    }}
                    className="w-full px-3 py-2 text-xs font-semibold bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-600 cursor-pointer"
                  >
                    {owners.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name} ({o.email}) — {o.ownerTier === 'verified' ? 'Verified' : 'Ordinary'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      National Identification Authority (NIDA) Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={kycNidaNumber}
                      onChange={(e) => setKycNidaNumber(e.target.value)}
                      placeholder="19840219-21105-00003-12"
                      className="w-full px-3 py-2 text-xs font-mono bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Tanzania Revenue Authority (TRA) TIN *
                    </label>
                    <input
                      type="text"
                      required
                      value={kycTinNumber}
                      onChange={(e) => setKycTinNumber(e.target.value)}
                      placeholder="109-882-941"
                      className="w-full px-3 py-2 text-xs font-mono bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Registered Company Name (BRELA) *
                  </label>
                  <input
                    type="text"
                    required
                    value={kycCompanyName}
                    onChange={(e) => setKycCompanyName(e.target.value)}
                    placeholder="Simba Agro & Plant Services Limited"
                    className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-600"
                  />
                </div>
              </div>

              {/* Right 5 Cols: Interactive Verification Code Generator */}
              <div className="lg:col-span-5 bg-amber-50/70 border border-amber-300 rounded-xl p-4 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
                      <KeyRound className="w-4 h-4 text-amber-700" />
                      <span>Verification Code Generator</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleRollNewVerificationCode}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-bold cursor-pointer transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Generate New Code</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={generatedCodeInput}
                      onChange={(e) => setGeneratedCodeInput(e.target.value.toUpperCase())}
                      className="flex-1 px-3 py-2.5 bg-white border-2 border-amber-400 rounded-lg font-mono text-sm font-black tracking-widest text-amber-950 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => copyToClipboard(generatedCodeInput, 'studio-generator')}
                      className="px-3 py-2.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      {copiedCodeId === 'studio-generator' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-amber-400" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  <p className="text-[11px] text-stone-600 leading-relaxed">
                    Issuing this verification code authenticates the owner’s NIDA, TRA TIN & BRELA records, activates the <strong>Verified Owner trust badge</strong>, and authorizes their login code.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={ownerActionLoading === selectedKycOwnerId}
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-colors disabled:opacity-50"
                >
                  {ownerActionLoading === selectedKycOwnerId ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-4 h-4" />
                  )}
                  <span>Save KYC, Verify Owner & Issue Code</span>
                </button>
              </div>
            </form>
          </div>

          {/* Owners Management Table */}
          <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-stone-200 bg-stone-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800">
                  Asset Owners & Verification Code Directory
                </h3>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Manage owner tier upgrades, generate single-use authorization codes, and audit verification credentials.
                </p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-lg">
                <button
                  onClick={() => setOwnerFilter('all')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    ownerFilter === 'all'
                      ? 'bg-white text-stone-900 shadow-2xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  All ({owners.length})
                </button>
                <button
                  onClick={() => setOwnerFilter('verified')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    ownerFilter === 'verified'
                      ? 'bg-amber-700 text-white shadow-2xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Verified ({owners.filter((o) => o.ownerTier === 'verified').length})
                </button>
                <button
                  onClick={() => setOwnerFilter('ordinary')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    ownerFilter === 'ordinary'
                      ? 'bg-stone-800 text-white shadow-2xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Ordinary ({owners.filter((o) => o.ownerTier !== 'verified').length})
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-stone-50 text-stone-500 border-b border-stone-200">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Owner & Organization</th>
                    <th className="py-3 px-4 font-semibold">Account Tier</th>
                    <th className="py-3 px-4 font-semibold">TRA TIN / Registration</th>
                    <th className="py-3 px-4 font-semibold">Verification Code & Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {owners
                    .filter((o) => {
                      if (ownerFilter === 'verified') return o.ownerTier === 'verified';
                      if (ownerFilter === 'ordinary') return o.ownerTier !== 'verified';
                      return true;
                    })
                    .map((owner) => {
                      const isVerified = owner.ownerTier === 'verified';
                      const hasCode = !!owner.verificationCode;
                      const isActionBusy = ownerActionLoading === owner.id;

                      return (
                        <tr key={owner.id} className="hover:bg-stone-50/60 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-start gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center font-bold text-stone-700 text-xs shrink-0 mt-0.5">
                                {owner.name.charAt(0)}
                              </div>
                              <div>
                                <p className="font-bold text-stone-900">{owner.name}</p>
                                <p className="text-[11px] text-stone-500">
                                  {owner.companyName ? (
                                    <span className="font-medium text-stone-700">{owner.companyName}</span>
                                  ) : (
                                    <span className="italic text-stone-400">Individual (No company name)</span>
                                  )}
                                </p>
                                <div className="flex items-center gap-2 text-[10px] text-stone-400 mt-1 font-mono">
                                  <span>{owner.email}</span>
                                  <span>•</span>
                                  <span>{owner.phone}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            {isVerified ? (
                              <div>
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                  <BadgeCheck className="w-3.5 h-3.5 text-amber-700" />
                                  Verified Owner
                                </span>
                                {owner.verifiedByAdminAt && (
                                  <p className="text-[10px] text-stone-400 mt-0.5">
                                    Verified: {formatDate(owner.verifiedByAdminAt)}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <div>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-stone-100 text-stone-700 border border-stone-200">
                                  Ordinary Owner
                                </span>
                                <p className="text-[10px] text-stone-400 mt-0.5">
                                  Unverified / Free registration
                                </p>
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-mono text-[11px] space-y-0.5">
                              <div>
                                <span className="text-stone-400">TIN: </span>
                                <span className="font-semibold text-stone-800">{owner.tinNumber || 'None registered'}</span>
                              </div>
                              <div>
                                <span className="text-stone-400">NIDA: </span>
                                <span className="text-stone-600">{owner.nidaNumber || 'N/A'}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => selectOwnerForKycStudio(owner)}
                                className="mt-1 inline-flex items-center gap-1 text-[10px] font-sans font-bold text-amber-800 hover:text-amber-950 underline cursor-pointer"
                              >
                                Edit KYC & Generate Code ↑
                              </button>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            {hasCode ? (
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                  <span className="px-2.5 py-1 bg-amber-50 text-amber-950 border border-amber-400/80 font-mono text-xs font-black rounded tracking-wider shadow-2xs select-all">
                                    {owner.verificationCode}
                                  </span>

                                  <button
                                    onClick={() => copyToClipboard(owner.verificationCode!, owner.id)}
                                    className="flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded bg-stone-100 hover:bg-stone-200 text-stone-700 cursor-pointer transition-colors"
                                    title="Copy verification code to clipboard"
                                  >
                                    {copiedCodeId === owner.id ? (
                                      <>
                                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                                        <span className="text-emerald-700 font-bold">Copied</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3.5 h-3.5" />
                                        <span>Copy</span>
                                      </>
                                    )}
                                  </button>
                                </div>

                                <div className="flex items-center gap-3 text-[11px]">
                                  <button
                                    onClick={() => handleRegenerateCode(owner.id)}
                                    disabled={isActionBusy}
                                    className="text-amber-800 hover:text-amber-950 font-semibold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                    title="Issue a new code for this owner"
                                  >
                                    <RefreshCw className={`w-3 h-3 ${isActionBusy ? 'animate-spin' : ''}`} />
                                    Regenerate Code
                                  </button>

                                  <span className="text-stone-300">|</span>

                                  <button
                                    onClick={() => handleRevokeOwnerVerification(owner.id)}
                                    disabled={isActionBusy}
                                    className="text-rose-600 hover:text-rose-800 font-medium inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                    title="Revoke verified status"
                                  >
                                    <XCircle className="w-3 h-3" />
                                    Revoke
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <button
                                  onClick={() => handleVerifyAndGenerateCode(owner.id)}
                                  disabled={isActionBusy}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-bold shadow-2xs cursor-pointer transition-all disabled:opacity-50"
                                >
                                  {isActionBusy ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Sparkles className="w-3.5 h-3.5" />
                                  )}
                                  <span>Verify & Generate Code</span>
                                </button>
                                <p className="text-[10px] text-stone-400 mt-1">
                                  Admin-only action to generate code & upgrade tier
                                </p>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}

                  {owners.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-stone-400">
                        No asset owners found in the registry.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Section 2: Fleet & Listings Governance */}
      {activeSection === 'listings' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-stone-200 bg-stone-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800">
                  Master Fleet & Equipment Catalog ({assets.length} Listings)
                </h3>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Stored in the RENTZ server database (Cloud Firestore).
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-stone-50 text-stone-500 border-b border-stone-200">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Asset ID / Serial</th>
                    <th className="py-2.5 px-4 font-semibold">Equipment Title</th>
                    <th className="py-2.5 px-4 font-semibold">Ownership</th>
                    <th className="py-2.5 px-4 font-semibold">Daily Rate</th>
                    <th className="py-2.5 px-4 font-semibold">Location</th>
                    <th className="py-2.5 px-4 font-semibold">Status</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {assets.map((a) => (
                    <tr key={a.id} className="hover:bg-stone-50/50">
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-stone-900">{a.id}</div>
                        {a.serialNumber && (
                          <div className="font-mono text-[10px] text-stone-500">SN: {a.serialNumber}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-stone-800 font-medium truncate max-w-[220px]">{a.title}</td>
                      <td className="py-3 px-4">
                        {a.ownershipType === 'company' ? (
                          <span className="font-semibold text-amber-900 bg-amber-50 px-2 py-0.5 rounded text-[11px] border border-amber-200">RENTZ Fleet</span>
                        ) : a.ownerTier === 'ordinary' || (!a.isVerifiedOwner && a.ownerTier !== 'verified') ? (
                          <div className="flex flex-col">
                            <span className="font-medium text-stone-800 text-[11px]">{a.ownerName}</span>
                            <span className="text-[9.5px] font-mono text-stone-600 bg-stone-100 px-1.5 py-0.2 rounded w-fit mt-0.5">Ordinary Owner</span>
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            <span className="font-medium text-amber-950 text-[11px]">{a.ownerName}</span>
                            <span className="text-[9.5px] font-mono text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded w-fit mt-0.5 font-bold">Verified Owner</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums">{formatTZS(a.pricing.ratePerDay)}</td>
                      <td className="py-3 px-4 text-stone-600">{a.location.region}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${a.approvalStatus === 'approved' ? 'bg-amber-100 text-amber-900' : 'bg-amber-100 text-amber-800'}`}>
                          {a.approvalStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                        {a.approvalStatus !== 'approved' ? (
                          <button
                            onClick={() => handleListingApproval(a.id, 'approved')}
                            className="px-2 py-1 text-[11px] font-bold text-white bg-amber-700 hover:bg-amber-800 rounded cursor-pointer"
                          >
                            Approve
                          </button>
                        ) : (
                          <button
                            onClick={() => handleListingApproval(a.id, 'paused')}
                            className="px-2 py-1 text-[11px] text-stone-600 hover:bg-stone-100 border border-stone-200 rounded cursor-pointer"
                          >
                            Pause
                          </button>
                        )}
                        <button
                          onClick={async () => {
                            try {
                              await deleteAsset(a.id);
                              setAssets((prev) => prev.filter((item) => item.id !== a.id));
                              setActionSuccessMsg(`Deleted listing "${a.title}".`);
                              setTimeout(() => setActionSuccessMsg(null), 4000);
                            } catch (err) {
                              console.error(err);
                            }
                          }}
                          className="px-2 py-1 text-[11px] font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded cursor-pointer"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Section 3: Categories */}
      {activeSection === 'categories' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-7 bg-white rounded-xl border border-stone-200 overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-stone-200 bg-stone-50">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800">
                Active Equipment Categories
              </h3>
            </div>
            <div className="divide-y divide-stone-100">
              {categories.map((c) => (
                <div key={c.id} className="p-4 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-stone-900">{c.name}</h4>
                    <p className="text-[11px] text-amber-700 font-medium">{c.nameSwahili}</p>
                    <p className="text-[11px] text-stone-500 mt-0.5">{c.description}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-stone-700">{c.assetCount || 0} Assets</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="md:col-span-5 bg-white rounded-xl border border-stone-200 p-6 shadow-2xs h-fit">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800 mb-1">
              Add New Category
            </h3>
            <p className="text-xs text-stone-500 mb-4">
              Add a new equipment classification without modifying or rebuilding application code.
            </p>

            <form onSubmit={handleAddCategory} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Category Name (English)</label>
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => {
                    setNewCatName(e.target.value);
                    if (!newCatSlug) setNewCatSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-'));
                  }}
                  placeholder="e.g. Marine & Diving Gear"
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">URL Slug</label>
                <input
                  type="text"
                  value={newCatSlug}
                  onChange={(e) => setNewCatSlug(e.target.value)}
                  placeholder="marine-gear"
                  className="w-full px-3 py-2 text-xs font-mono bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  placeholder="Outboard engines, dive compressors, lifeboats..."
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-600"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 px-4 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-lg transition-colors cursor-pointer"
              >
                Create Category
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Section 5: Disputes */}
      {activeSection === 'disputes' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-stone-200 bg-stone-50">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800">
                Dispute & Damage Claims Queue
              </h3>
            </div>

            {disputes.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-500">
                No active disputes or damage claims filed.
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {disputes.map((d) => (
                  <div key={d.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-red-700">{d.id}</span>
                        <span className="text-stone-300">·</span>
                        <span className="text-xs font-semibold text-stone-900">{d.reason}</span>
                      </div>
                      <p className="text-xs text-stone-600">{d.description}</p>
                      <p className="text-[11px] text-stone-400">
                        Claimed by: {d.raisedByName} ({d.raisedByRole}) · Asset: {d.assetTitle}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-800 uppercase">
                        {d.status}
                      </span>
                      {d.status === 'open' && (
                        <button
                          onClick={() => setSelectedDispute(d)}
                          className="px-3 py-1.5 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-lg cursor-pointer"
                        >
                          Resolve Claim
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedDispute && (
            <div className="p-6 bg-stone-50 rounded-xl border border-stone-200 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-800">
                Adjudicate Dispute: {selectedDispute.id} ({selectedDispute.reason})
              </h4>
              <textarea
                rows={3}
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Document the resolution agreed between owner and renter..."
                className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-600"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleResolveDispute('resolved')}
                  className="px-4 py-2 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-lg cursor-pointer"
                >
                  Mark Dispute Resolved
                </button>
                <button
                  onClick={() => setSelectedDispute(null)}
                  className="px-4 py-2 text-xs font-medium text-stone-600 hover:bg-stone-200 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Section 6: Audit Security Log */}
      {activeSection === 'audit' && (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-stone-200 bg-stone-50">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800">
              Immutable System Audit Logs
            </h3>
          </div>
          <div className="divide-y divide-stone-100 max-h-[500px] overflow-y-auto font-mono text-xs">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-3 hover:bg-stone-50 flex items-start justify-between gap-4">
                <div>
                  <span className="font-bold text-amber-800">[{log.action}]</span>{' '}
                  <span className="text-stone-700">{log.details}</span>
                  <p className="text-[10px] text-stone-400 mt-0.5">
                    User: {log.userEmail} ({log.userRole})
                  </p>
                </div>
                <span className="text-[10px] text-stone-400 whitespace-nowrap">
                  {formatDateTime(log.timestamp)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
