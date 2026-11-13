import React, { useState, useEffect } from 'react';
import { Asset, Booking, User, AppLanguage } from '../types/index.js';
import {
  fetchAssets,
  fetchBookings,
  updateAssetStatus,
  deleteAsset,
  updateBookingStatus,
  respondBookingExtension,
} from '../services/api.js';
import { formatTZS, formatDate } from '../utils/formatters.js';
import {
  Plus,
  Briefcase,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Pause,
  Play,
  Calendar,
  ShieldCheck,
  Building,
  Loader2,
  FileCheck,
  CalendarCheck,
  XCircle,
  UserCheck,
  Sparkles,
  QrCode,
  FileText,
  Pencil,
  Trash2,
} from 'lucide-react';

interface OwnerDashboardProps {
  currentUser: User;
  onOpenCreateAsset: () => void;
  onEditAsset?: (asset: Asset) => void;
  onAssetDeleted?: (assetId: string) => void;
  onOpenDocumentModal?: (booking: Booking, tab: 'contract' | 'gatepass') => void;
  onOpenQRSticker?: (asset: Asset) => void;
  language: AppLanguage;
}

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({
  currentUser,
  onOpenCreateAsset,
  onEditAsset,
  onAssetDeleted,
  onOpenDocumentModal,
  onOpenQRSticker,
  language,
}) => {
  const [myAssets, setMyAssets] = useState<Asset[]>([]);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'assets' | 'requests'>('assets');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const t = {
    en: {
      title: 'Owner Dashboard & Equipment Fleet',
      subtitle:
        'Manage your machinery inventory, accept hire requests and review extensions. RENTZ is free: you settle hire charges directly with each renter.',
      verifiedPartner: 'Verified Partner',
      listAssetBtn: 'List New Asset',
      kpiActiveFleet: 'Active Fleet Assets',
      kpiAvailable: 'available for hire',
      kpiGross: 'Estimated Hire Value',
      kpiGrossSub: 'Accepted hires, settled directly with renters',
      kpiPending: 'Requests Waiting',
      kpiPendingSub: 'Accept or decline them below',
      tabAssets: 'Listed Equipment',
      tabRequests: 'Hire Requests & Bookings',
      tabKyc: 'Verification & Business KYC',
      noAssets: 'No assets listed yet under this owner account.',
      listFirstAsset: '+ List your first machinery or tool',
      availableForHire: 'Available for Hire',
      paused: 'Paused / Inactive',
      pauseListing: 'Pause Listing',
      activateListing: 'Activate',
      totalHires: 'Total Hires',
      noBookings: 'No rental bookings recorded yet for your equipment.',
      renterLabel: 'Renter',
      periodLabel: 'Period',
      grossLabel: 'Estimated hire',
      acceptRequest: 'Accept Request',
      declineRequest: 'Decline',
      contactAfterAccept: 'contact shared after you accept',
      idVerified: 'ID verified',
      idNotVerified: 'ID not verified',
      completedHires: 'completed hires',
      disputesLabel: 'disputes',
      memberSince: 'member since',
      handoverComplete: 'Handover Complete',
      extensionAlertTitle: 'Incoming Extension Request',
      requestedReturn: 'Requested return date',
      extraPayout: 'Estimated extra hire',
      approveExtBtn: 'Approve Extension',
      declineExtBtn: 'Decline',
      kycTitle: 'Tanzania National Identity & Business Verification (BRELA / TRA)',
      kycSubtitle:
        'To ensure trust and asset security across Tanzania, asset owners must provide their NIDA number, Taxpayer Identification Number (TIN), or registered business name.',
      nidaLabel: 'National Identification Authority (NIDA) Number',
      tinLabel: 'Tanzania Revenue Authority (TRA) TIN',
      companyLabel: 'Registered Company Name (BRELA)',
      saveKycBtn: 'Save Verification Details',
      kycSuccessMsg: 'Verification details submitted successfully to RENTZ Compliance.',
    },
    sw: {
      title: 'Dawati la Mmiliki na Vifaa Vyangu',
      subtitle:
        'Simamia orodha ya vifaa vyako, pokea maombi ya kukodisha na kubali nyongeza ya muda. RENTZ ni bure: unalipwa moja kwa moja na mkodishaji.',
      verifiedPartner: 'Mshirika Aliyethibitishwa',
      listAssetBtn: 'Weka Kifaa Kipya',
      kpiActiveFleet: 'Vifaa Vilivyoorodheshwa',
      kpiAvailable: 'vipo tayari kukodishwa',
      kpiGross: 'Makadirio ya Thamani ya Ukodishaji',
      kpiGrossSub: 'Oda zilizokubaliwa, hulipwa moja kwa moja na wakodishaji',
      kpiPending: 'Maombi Yanayosubiri',
      kpiPendingSub: 'Kubali au kataa hapa chini',
      tabAssets: 'Vifaa Vilivyoorodheshwa',
      tabRequests: 'Maombi & Uhifadhi',
      tabKyc: 'Uthibitisho & Usajili wa Biashara',
      noAssets: 'Bado hujaorodhesha vifaa vyovyote.',
      listFirstAsset: '+ Weka mtambo au kifaa chako cha kwanza',
      availableForHire: 'Kipo Tayari',
      paused: 'Kimesimamishwa',
      pauseListing: 'Simamisha',
      activateListing: 'Washa',
      totalHires: 'Jumla ya Ukodishaji',
      noBookings: 'Bado hakuna oda za ukodishaji zilizorekodiwa kwa vifaa vyako.',
      renterLabel: 'Mkodishaji',
      periodLabel: 'Muda',
      grossLabel: 'Makadirio ya gharama',
      acceptRequest: 'Kubali Ombi',
      declineRequest: 'Kataa',
      contactAfterAccept: 'mawasiliano yatatolewa ukikubali',
      idVerified: 'Kitambulisho kimethibitishwa',
      idNotVerified: 'Kitambulisho hakijathibitishwa',
      completedHires: 'ukodishaji uliokamilika',
      disputesLabel: 'migogoro',
      memberSince: 'mwanachama tangu',
      handoverComplete: 'Makabidhiano Yamekamilika',
      extensionAlertTitle: 'Ombi la Kuongeza Muda Limewasili',
      requestedReturn: 'Tarehe mpya ya kurudisha',
      extraPayout: 'Makadirio ya gharama ya ziada',
      approveExtBtn: 'Idhinisha Nyongeza',
      declineExtBtn: 'Kataa',
      kycTitle: 'Uthibitisho wa NIDA na Usajili wa Biashara (BRELA / TRA)',
      kycSubtitle:
        'Kuhakikisha usalama wa vifaa nchini Tanzania, wamiliki wa vifaa wanatakiwa kutoa nambari ya NIDA, nambari ya TIN au jina la biashara lililosajiliwa BRELA.',
      nidaLabel: 'Nambari ya Kitambulisho cha Taifa (NIDA)',
      tinLabel: 'Nambari ya Mlipa Kodi (TIN)',
      companyLabel: 'Jina la Kampuni Lililosajiliwa (BRELA)',
      saveKycBtn: 'Hifadhi Taarifa za Uthibitisho',
      kycSuccessMsg: 'Taarifa za uthibitisho zimewasilishwa kwa Idara ya Sheria ya RENTZ.',
    },
    fr: {
      title: 'Espace Propriétaire & Flotte de Matériel',
      subtitle:
        'Gérez votre inventaire d’engins, acceptez les demandes et gérez les prolongations. RENTZ est gratuit : vous êtes réglé directement par le locataire.',
      verifiedPartner: 'Partenaire Vérifié',
      listAssetBtn: 'Publier un Équipement',
      kpiActiveFleet: 'Matériels en Flotte',
      kpiAvailable: 'disponibles à la location',
      kpiGross: 'Valeur de Location Estimée',
      kpiGrossSub: 'Locations acceptées, réglées directement par les locataires',
      kpiPending: 'Demandes en Attente',
      kpiPendingSub: 'Acceptez ou refusez-les ci-dessous',
      tabAssets: 'Matériels Répertoriés',
      tabRequests: 'Demandes & Réservations',
      tabKyc: 'Vérification d’Identité & Entreprise',
      noAssets: 'Aucun matériel répertorié sous ce compte.',
      listFirstAsset: '+ Répertorier votre premier engin ou outil',
      availableForHire: 'Disponible',
      paused: 'Suspendu / Inactif',
      pauseListing: 'Mettre en Pause',
      activateListing: 'Activer',
      totalHires: 'Total Locations',
      noBookings: 'Aucune réservation enregistrée pour le moment.',
      renterLabel: 'Locataire',
      periodLabel: 'Période',
      grossLabel: 'Location estimée',
      acceptRequest: 'Accepter la Demande',
      declineRequest: 'Refuser',
      contactAfterAccept: 'contact partagé après acceptation',
      idVerified: 'Identité vérifiée',
      idNotVerified: 'Identité non vérifiée',
      completedHires: 'locations terminées',
      disputesLabel: 'litiges',
      memberSince: 'membre depuis',
      handoverComplete: 'Remise Effectuée',
      extensionAlertTitle: 'Demande de Prolongation Reçue',
      requestedReturn: 'Nouvelle date de retour demandée',
      extraPayout: 'Location supplémentaire estimée',
      approveExtBtn: 'Approuver la Prolongation',
      declineExtBtn: 'Refuser',
      kycTitle: 'Vérification d’Identité Tanzanienne & Entreprise (BRELA / TRA)',
      kycSubtitle:
        'Afin d’assurer la sécurité des actifs en Tanzanie, les propriétaires doivent renseigner leur numéro NIDA, TIN ou raison sociale enregistrée.',
      nidaLabel: 'Numéro d’Identité Nationale (NIDA)',
      tinLabel: 'Numéro Fiscal TRA (TIN)',
      companyLabel: 'Nom de la Société Enregistrée (BRELA)',
      saveKycBtn: 'Enregistrer les Détails de Vérification',
      kycSuccessMsg: 'Informations de conformité soumises avec succès.',
    },
  }[language];

  const loadData = async () => {
    setLoading(true);
    try {
      const assets = await fetchAssets({ ownerId: currentUser.id });
      setMyAssets(assets);

      const bookings = await fetchBookings();
      setMyBookings(bookings.filter((b) => b.ownerId === currentUser.id));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser.id]);

  const handleToggleAvailability = async (asset: Asset) => {
    try {
      const updated = await updateAssetStatus(asset.id, { isAvailable: !asset.isAvailable });
      setMyAssets(myAssets.map((a) => (a.id === asset.id ? updated : a)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAsset = async (asset: Asset) => {
    try {
      setActionLoadingId(asset.id);
      await deleteAsset(asset.id);
      setMyAssets((prev) => prev.filter((a) => a.id !== asset.id));
      if (onAssetDeleted) onAssetDeleted(asset.id);
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleBookingAction = async (bookingId: string, newStatus: string) => {
    setActionLoadingId(bookingId);
    try {
      const updated = await updateBookingStatus(bookingId, newStatus);
      setMyBookings(myBookings.map((b) => (b.id === bookingId ? updated : b)));
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Could not update this booking');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleExtensionResponse = async (bookingId: string, action: 'approve' | 'reject') => {
    setActionLoadingId(bookingId);
    try {
      const updated = await respondBookingExtension(bookingId, { action });
      setMyBookings(myBookings.map((b) => (b.id === bookingId ? updated : b)));
    } catch (err: any) {
      console.error(err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const isVerified = currentUser.ownerTier === 'verified' || currentUser.verificationStatus === 'verified';

  // Estimated hire value of accepted bookings (settled directly with renters)
  const totalGrossEarnings = myBookings
    .filter((b) => !['requested', 'draft', 'cancelled'].includes(b.status))
    .reduce((sum, b) => sum + b.priceBreakdown.estimatedTotal, 0);

  const pendingRequests = myBookings.filter((b) => b.status === 'requested');

  const pendingExtensions = myBookings.filter(
    (b) => b.extensionRequest && b.extensionRequest.status === 'pending'
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-stone-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight">{t.title}</h1>
            {isVerified ? (
              <span className="flex items-center gap-1 text-[11px] font-bold text-amber-900 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-300 shadow-2xs">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                Verified Owner
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[11px] font-bold text-stone-700 bg-stone-100 px-2.5 py-0.5 rounded-full border border-stone-300 shadow-2xs">
                <UserCheck className="w-3.5 h-3.5 text-stone-500" />
                Ordinary Owner
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">{t.subtitle}</p>
        </div>

        <button
          onClick={onOpenCreateAsset}
          className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 active:bg-amber-900 rounded-xl transition-colors shadow-sm cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{t.listAssetBtn}</span>
        </button>
      </div>

      {/* Owner Tier Interactive Banner: Ordinary Owner vs Verified Owner */}
      <div className="my-6">
        {isVerified ? (
          <div className="bg-gradient-to-r from-amber-50 via-amber-100/50 to-amber-50 p-5 rounded-2xl border border-amber-300 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-amber-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-extrabold text-base text-amber-950">
                    Verified Owner Tier (Mmiliki Aliyethibitishwa)
                  </span>
                  <span className="text-[10px] font-bold font-mono uppercase bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full border border-amber-400">
                    Verified Badge Active
                  </span>
                </div>
                <p className="text-xs text-stone-600 mt-1 max-w-2xl leading-relaxed">
                  Your business credentials ({currentUser.companyName || 'Registered Equipment Enterprise'}) are authenticated. Your equipment carries the verified trust badge, which renters see before booking.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {currentUser.tinNumber && (
                <span className="text-xs font-mono font-bold text-amber-900 bg-white/90 border border-amber-300 px-3 py-1.5 rounded-lg shadow-2xs">
                  TRA TIN: {currentUser.tinNumber}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-stone-50 via-amber-50/40 to-stone-50 p-5 rounded-2xl border border-stone-300 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-stone-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-extrabold text-base text-stone-900">
                    Ordinary Owner Tier (Mmiliki wa Kawaida)
                  </span>
                  <span className="text-[10px] font-bold font-mono uppercase bg-stone-200 text-stone-800 px-2 py-0.5 rounded-full border border-stone-300">
                    Not Yet Verified
                  </span>
                </div>
                <p className="text-xs text-stone-600 mt-1 max-w-2xl leading-relaxed">
                  You are registered as an individual equipment owner. Business KYC (NIDA / TRA TIN / BRELA) verification and official <code className="font-mono font-bold text-amber-900">RTZ-VER-XXXX</code> authorization code issuance are managed exclusively by RENTZ Administrators in the Admin Console.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-mono font-semibold text-stone-600 bg-white border border-stone-300 px-3 py-1.5 rounded-lg shadow-2xs">
                Admin KYC Verification Required for Verified Badge
              </span>
            </div>
          </div>
        )}
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
        <div className="p-4 bg-white rounded-xl border border-stone-200 shadow-2xs">
          <p className="text-[11px] text-stone-400 uppercase tracking-wider font-semibold">
            {t.kpiActiveFleet}
          </p>
          <p className="text-2xl font-black text-stone-900 mt-1 font-mono tabular-nums">
            {myAssets.length}
          </p>
          <p className="text-[11px] text-stone-500 mt-0.5">
            {myAssets.filter((a) => a.isAvailable).length} {t.kpiAvailable}
          </p>
        </div>

        <div className="p-4 bg-white rounded-xl border border-stone-200 shadow-2xs">
          <p className="text-[11px] text-stone-400 uppercase tracking-wider font-semibold">
            {t.kpiGross}
          </p>
          <p className="text-2xl font-black text-stone-900 mt-1 font-mono tabular-nums">
            {formatTZS(totalGrossEarnings)}
          </p>
          <p className="text-[11px] text-stone-500 mt-0.5">{t.kpiGrossSub}</p>
        </div>

        <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-300 shadow-2xs">
          <p className="text-[11px] text-amber-800 uppercase tracking-wider font-bold">
            {t.kpiPending}
          </p>
          <p className="text-2xl font-black text-amber-950 mt-1 font-mono tabular-nums">
            {pendingRequests.length}
          </p>
          <p className="text-[11px] text-amber-700 mt-0.5">{t.kpiPendingSub}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-stone-200 mb-6">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('assets')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
              activeTab === 'assets'
                ? 'border-b-2 border-amber-700 text-amber-800'
                : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            {t.tabAssets} ({myAssets.length})
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'requests'
                ? 'border-b-2 border-amber-700 text-amber-800'
                : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            <span>
              {t.tabRequests} ({myBookings.length})
            </span>
            {pendingExtensions.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500" />
            )}
          </button>
        </div>
      </div>

      {/* Tab 1: Listed Equipment */}
      {activeTab === 'assets' && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="w-6 h-6 animate-spin text-amber-700" />
            </div>
          ) : myAssets.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-stone-200 p-6">
              <p className="text-stone-500 text-xs">{t.noAssets}</p>
              <button
                onClick={onOpenCreateAsset}
                className="mt-3 px-4 py-2 text-xs font-bold text-amber-900 bg-amber-50 rounded-lg hover:bg-amber-100 cursor-pointer"
              >
                {t.listFirstAsset}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myAssets.map((asset) => (
                <div
                  key={asset.id}
                  className="bg-white rounded-xl border border-stone-200 overflow-hidden flex flex-col shadow-2xs"
                >
                  <div className="relative aspect-4/3 bg-stone-100">
                    <img
                      src={asset.images[0] || '/src/assets/images/hero_equipment_fleet_1792692516554.jpg'}
                      alt={asset.title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-2.5 right-2.5">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                          asset.isAvailable
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-stone-200 text-stone-700'
                        }`}
                      >
                        {asset.isAvailable ? t.availableForHire : t.paused}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs text-stone-500 mb-1">
                        <span>
                          {asset.location.district}, {asset.location.region}
                        </span>
                        <span>·</span>
                        <span className="font-mono text-stone-400">{asset.serialNumber || asset.id}</span>
                      </div>
                      <h4 className="text-sm font-bold text-stone-900 line-clamp-2">
                        {asset.title}
                      </h4>
                      <p className="mt-2 text-sm font-extrabold text-stone-900 font-mono tabular-nums">
                        {formatTZS(asset.pricing.ratePerDay)}{' '}
                        <span className="text-xs font-normal text-stone-500">/ day</span>
                      </p>
                      {asset.pricing.purchaseValue && asset.pricing.dailyHirePercentage && (
                        <p className="text-[11px] text-stone-500 font-mono mt-0.5">
                          Value: {formatTZS(asset.pricing.purchaseValue)} × {asset.pricing.dailyHirePercentage}%/day
                        </p>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2">
                      <button
                        onClick={() => handleToggleAvailability(asset)}
                        className="text-xs font-medium text-stone-600 hover:text-stone-900 flex items-center gap-1 cursor-pointer"
                      >
                        {asset.isAvailable ? (
                          <Pause className="w-3.5 h-3.5" />
                        ) : (
                          <Play className="w-3.5 h-3.5" />
                        )}
                        <span>{asset.isAvailable ? t.pauseListing : t.activateListing}</span>
                      </button>
                      <div className="flex items-center gap-1.5">
                        {onEditAsset && (
                          <button
                            onClick={() => onEditAsset(asset)}
                            className="px-2 py-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-800 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                            title="Edit Listing in Firestore"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteAsset(asset)}
                          disabled={actionLoadingId === asset.id}
                          className="px-2 py-1 rounded bg-red-50 hover:bg-red-100 text-red-700 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                          title="Delete Listing from Firestore"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </button>
                        {onOpenQRSticker && (
                          <button
                            onClick={() => onOpenQRSticker(asset)}
                            className="px-2 py-1 rounded bg-stone-900 text-amber-400 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <QrCode className="w-3 h-3" />
                            <span>QR</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Hire Requests & Bookings (with Rental Extension Approvals) */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          {/* Highlight pending extension requests at top if any */}
          {pendingExtensions.length > 0 && (
            <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900 uppercase tracking-wider">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>
                  {t.extensionAlertTitle} ({pendingExtensions.length})
                </span>
              </div>

              <div className="space-y-2">
                {pendingExtensions.map((b) => {
                  const ext = b.extensionRequest!;

                  return (
                    <div
                      key={`ext-${b.id}`}
                      className="p-3 bg-white rounded-lg border border-amber-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-stone-900">{b.bookingCode}</span>
                          <span className="text-stone-300">·</span>
                          <span className="font-semibold text-stone-800">{b.assetTitle}</span>
                        </div>
                        <p className="text-stone-600">
                          {t.renterLabel}: <strong>{b.renterName}</strong> ({b.renterPhone || t.contactAfterAccept})
                        </p>
                        <p className="text-stone-700">
                          {t.requestedReturn}:{' '}
                          <strong className="text-amber-900">{formatDate(ext.requestedEndDate)}</strong>{' '}
                          (+{ext.additionalDays} days) · {t.extraPayout}:{' '}
                          <strong className="text-amber-800 font-mono font-bold">
                            +{formatTZS(ext.additionalRentalAmount)}
                          </strong>
                        </p>
                        {ext.reason && (
                          <p className="text-[11px] text-stone-500 italic">"{ext.reason}"</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleExtensionResponse(b.id, 'reject')}
                          disabled={actionLoadingId === b.id}
                          className="px-3 py-1.5 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg cursor-pointer transition-colors"
                        >
                          {t.declineExtBtn}
                        </button>
                        <button
                          onClick={() => handleExtensionResponse(b.id, 'approve')}
                          disabled={actionLoadingId === b.id}
                          className="px-3.5 py-1.5 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-lg cursor-pointer transition-colors flex items-center gap-1.5 shadow-2xs"
                        >
                          {actionLoadingId === b.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CalendarCheck className="w-3.5 h-3.5" />
                          )}
                          <span>{t.approveExtBtn}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {myBookings.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-stone-200 p-6">
              <p className="text-stone-500 text-xs">{t.noBookings}</p>
            </div>
          ) : (
            myBookings.map((b) => (
              <div
                key={b.id}
                className="p-4 bg-white rounded-xl border border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-amber-800">
                      {b.bookingCode}
                    </span>
                    <span className="text-stone-300">·</span>
                    <span className="text-xs text-stone-500">
                      {t.renterLabel}: {b.renterName} ({b.renterPhone || t.contactAfterAccept})
                    </span>
                  </div>
                  {b.renterProfile && (
                    <p
                      className={`text-[11px] ${
                        b.renterProfile.verificationStatus === 'verified' && b.renterProfile.disputes === 0
                          ? 'text-emerald-700'
                          : 'text-amber-800'
                      }`}
                    >
                      {b.renterProfile.verificationStatus === 'verified' ? t.idVerified : t.idNotVerified} ·{' '}
                      {b.renterProfile.completedHires} {t.completedHires} · {b.renterProfile.disputes} {t.disputesLabel}
                      {b.renterProfile.memberSince && <> · {t.memberSince} {formatDate(b.renterProfile.memberSince)}</>}
                    </p>
                  )}
                  <h4 className="text-sm font-bold text-stone-900">{b.assetTitle}</h4>
                  <p className="text-xs text-stone-500">
                    {t.periodLabel}: {formatDate(b.startDate)} to {formatDate(b.endDate)} (
                    {b.billableUnits} {b.rentalUnit}s)
                  </p>
                  <p className="text-xs text-stone-700">
                    {t.grossLabel}:{' '}
                    <span className="font-mono font-bold">
                      {formatTZS(b.priceBreakdown.estimatedTotal)}
                    </span>
                  </p>

                  {b.extensionRequest && (
                    <div className="pt-1 flex items-center gap-1.5 text-[11px]">
                      <span className="text-stone-400">Extension:</span>
                      <span
                        className={`font-semibold ${
                          b.extensionRequest.status === 'approved'
                            ? 'text-amber-800'
                            : b.extensionRequest.status === 'pending'
                            ? 'text-amber-700'
                            : 'text-stone-500'
                        }`}
                      >
                        {b.extensionRequest.status.toUpperCase()} (until{' '}
                        {formatDate(b.extensionRequest.requestedEndDate)})
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded bg-stone-100 text-stone-800 capitalize">
                    {b.status.replace(/_/g, ' ')}
                  </span>

                  {onOpenDocumentModal && (
                    <>
                      <button
                        onClick={() => onOpenDocumentModal(b, 'contract')}
                        className="px-2.5 py-1.5 text-xs font-bold text-stone-800 bg-stone-100 hover:bg-stone-200 rounded-lg flex items-center gap-1 cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5 text-amber-700" />
                        <span>Contract</span>
                      </button>
                    </>
                  )}

                  {b.status === 'requested' && (
                    <>
                      <button
                        onClick={() => handleBookingAction(b.id, 'cancelled')}
                        disabled={actionLoadingId === b.id}
                        className="px-3 py-1.5 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg cursor-pointer"
                      >
                        {t.declineRequest}
                      </button>
                      <button
                        onClick={() => handleBookingAction(b.id, 'confirmed')}
                        disabled={actionLoadingId === b.id}
                        className="px-3 py-1.5 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-lg cursor-pointer"
                      >
                        {t.acceptRequest}
                      </button>
                    </>
                  )}
                  {b.status === 'ready_for_collection' && (
                    <button
                      onClick={() => handleBookingAction(b.id, 'active')}
                      className="px-3 py-1.5 text-xs font-bold text-white bg-sky-700 hover:bg-sky-800 rounded-lg cursor-pointer"
                    >
                      {t.handoverComplete}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

    </div>
  );
};
