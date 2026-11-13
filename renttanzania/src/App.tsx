import React, { useState, useEffect } from 'react';
import {
  Asset,
  Category,
  Booking,
  User,
  UserRole,
  PlatformConfig,
  AppLanguage,
  SavedSearch,
} from './types/index.js';
import {
  fetchCurrentUser,
  switchUserRole,
  logoutUser,
  fetchCategories,
  fetchAssets,
  fetchPlatformConfig,
  fetchBookings,
  recordInspection,
} from './services/api.js';
import { Header } from './components/Header.js';
import { Hero } from './components/Hero.js';
import { CategoryFilter } from './components/CategoryFilter.js';
import { AssetCard } from './components/AssetCard.js';
import { AssetDetailModal } from './components/AssetDetailModal.js';
import { RenterDashboard } from './components/RenterDashboard.js';
import { OwnerDashboard } from './components/OwnerDashboard.js';
import { AdminDashboard } from './components/AdminDashboard.js';
import { OperationsView } from './components/OperationsView.js';
import { LogisticsView } from './components/LogisticsView.js';
import { CreateAssetModal } from './components/CreateAssetModal.js';
import { DisputeModal } from './components/DisputeModal.js';
import { TanzaniaMapPlaceholder } from './components/TanzaniaMapPlaceholder.js';
import { SavedSearchesModal } from './components/SavedSearchesModal.js';
import { LoginModal, LoginPortalType } from './components/LoginModal.js';

// The seller and staff sign-in pages have their own addresses and are not linked from the public site
function portalForPath(pathname: string): LoginPortalType | null {
  if (pathname.startsWith('/seller')) return 'seller';
  if (pathname.startsWith('/staff')) return 'staff';
  return null;
}
import { EquipmentWatermarkBackground } from './components/EquipmentWatermarkBackground.js';
import { DocumentPreviewModal } from './components/DocumentPreviewModal.js';
import { QRAssetStickerModal } from './components/QRAssetStickerModal.js';
import { IntegrationsHubModal } from './components/IntegrationsHubModal.js';
import { SupportChatDrawer } from './components/SupportChatDrawer.js';
import { OfflineIndicator } from './components/PWAInstallButton.js';
import { Footer } from './components/Footer.js';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  SlidersHorizontal,
  Bookmark,
  LayoutGrid,
  Map as MapIcon,
  Eye,
  LogIn,
  MessageSquare,
} from 'lucide-react';
import { APIProvider } from '@vis.gl/react-google-maps';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [config, setConfig] = useState<PlatformConfig | null>(null);
  const [gmpQuotaExceeded, setGmpQuotaExceeded] = useState(false);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [ownershipFilter, setOwnershipFilter] = useState<'all' | 'company' | 'third_party'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'browse' | 'list' | 'renter' | 'owner' | 'admin' | 'operations' | 'logistics'>('browse');

  // Language toggle: English / Kiswahili / Français
  const [language, setLanguage] = useState<AppLanguage>('en');

  // Modals & Companion Drawers
  const [selectedAssetForDetail, setSelectedAssetForDetail] = useState<Asset | null>(null);
  const [selectedAssetForQR, setSelectedAssetForQR] = useState<Asset | null>(null);
  const [selectedBookingForDispute, setSelectedBookingForDispute] = useState<Booking | null>(null);
  const [selectedBookingForDocs, setSelectedBookingForDocs] = useState<Booking | null>(null);
  const [docModalTab, setDocModalTab] = useState<'contract' | 'gatepass'>('contract');
  const [showCreateAssetModal, setShowCreateAssetModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [showSavedSearchesModal, setShowSavedSearchesModal] = useState(false);
  const [showIntegrationsHub, setShowIntegrationsHub] = useState(false);
  const [showSupportChat, setShowSupportChat] = useState(false);
  const [allBookingsForHub, setAllBookingsForHub] = useState<Booking[]>([]);
  const [offlineQueueCount, setOfflineQueueCount] = useState<number>(0);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [initialLoginPortal, setInitialLoginPortal] = useState<LoginPortalType>('buyer');
  // Why sign-in is being asked for (shown in the sign-in dialog)
  const [loginReason, setLoginReason] = useState<string | null>(null);

  // Toast alert
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadingAssets, setLoadingAssets] = useState(false);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  useEffect(() => {
    const handleQuotaExceeded = () => setGmpQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuotaExceeded);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuotaExceeded);
  }, []);

  // Initial load + URL query parameter deep-linking (?asset=..., ?portal=...)
  useEffect(() => {
    async function init() {
      try {
        const [userData, catData, cfgData, initialAssets] = await Promise.all([
          fetchCurrentUser(),
          fetchCategories(),
          fetchPlatformConfig(),
          fetchAssets(),
        ]);
        setCurrentUser(userData.user);
        setCategories(catData);
        setConfig(cfgData);
        setAssets(initialAssets);

        // Deep-link support for shared QR codes & public links
        const params = new URLSearchParams(window.location.search);
        const deepAssetId = params.get('asset');
        const deepPortal = params.get('portal');
        if (deepAssetId) {
          const matchedAsset = initialAssets.find((a) => a.id === deepAssetId);
          if (matchedAsset) setSelectedAssetForDetail(matchedAsset);
        }
        if (deepPortal === 'logistics') {
          setActiveTab('logistics');
        }

        const pagePortal = portalForPath(window.location.pathname);
        const signedIn = userData.user;
        if (pagePortal === 'seller' && signedIn?.allowedRoles?.includes('owner')) {
          if (signedIn.role !== 'owner') handleRoleSwitch('owner');
          setActiveTab('owner');
          window.history.replaceState(null, '', '/');
        } else if (pagePortal === 'staff' && signedIn?.hasAdminOpsAccess) {
          setActiveTab(signedIn.role === 'operations' ? 'operations' : 'admin');
          window.history.replaceState(null, '', '/');
        } else if (pagePortal) {
          setInitialLoginPortal(pagePortal);
          setShowLoginModal(true);
        }
      } catch (err) {
        console.error('Initialization error:', err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  useEffect(() => {
    const updateQueue = () => {
      try {
        const q = JSON.parse(localStorage.getItem('rentz_offline_inspections') || '[]');
        setOfflineQueueCount(Array.isArray(q) ? q.length : 0);
      } catch {
        setOfflineQueueCount(0);
      }
    };
    updateQueue();
    window.addEventListener('online', updateQueue);
    return () => window.removeEventListener('online', updateQueue);
  }, []);

  const handleSyncOfflineQueue = async () => {
    try {
      const q = JSON.parse(localStorage.getItem('rentz_offline_inspections') || '[]');
      if (!Array.isArray(q) || q.length === 0) return;
      for (const item of q) {
        await recordInspection(item);
      }
      localStorage.removeItem('rentz_offline_inspections');
      setOfflineQueueCount(0);
      showToast(`Synced ${q.length} queued Field Ops inspection(s) to RENTZ server!`, 'success');
    } catch (err) {
      showToast('Failed to sync offline queue. Please verify connection.', 'error');
    }
  };

  const handleOpenDocumentModal = (booking: Booking, tab: 'contract' | 'gatepass' = 'contract') => {
    setSelectedBookingForDocs(booking);
    setDocModalTab(tab);
  };

  const loadAssets = async () => {
    setLoadingAssets(true);
    try {
      const data = await fetchAssets({
        categoryId: selectedCategory,
        region: selectedRegion,
        ownershipType: ownershipFilter === 'all' ? undefined : ownershipFilter,
        query: searchQuery,
      });
      setAssets(data);
    } catch (err) {
      console.error('Error fetching assets:', err);
    } finally {
      setLoadingAssets(false);
    }
  };

  // Re-fetch assets when filters change
  useEffect(() => {
    if (!loading) {
      loadAssets();
    }
  }, [selectedCategory, selectedRegion, ownershipFilter]);

  const handleSearchSubmit = () => {
    loadAssets();
    if (activeTab !== 'browse') {
      setActiveTab('browse');
    }
  };

  const handleRoleSwitch = async (role: UserRole) => {
    try {
      const res = await switchUserRole(role);
      setCurrentUser(res.user);
      const tierDesc = res.user.role === 'owner' ? ` [${res.user.ownerTier === 'verified' ? 'Verified Owner' : 'Ordinary Owner'}]` : '';
      showToast(`Switched to ${res.user.role.toUpperCase()} view${tierDesc}`, 'info');
    } catch (err: any) {
      showToast(err.message || 'Could not switch view', 'error');
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      setCurrentUser(null);
      setActiveTab('browse');
      setShowCreateAssetModal(false);
      setShowSavedSearchesModal(false);
      showToast('Signed out. You are now in View-Only mode. Log in or sign up to book or edit.', 'info');
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenLoginModal = (portal?: LoginPortalType) => {
    setInitialLoginPortal(portal || 'buyer');
    setLoginReason(null);
    setShowLoginModal(true);
  };

  // Browsing never needs an account; sign-in is asked for only when an action needs one
  const requireAuthForAction = (portal: LoginPortalType = 'buyer', reason?: string): boolean => {
    if (!currentUser) {
      setInitialLoginPortal(portal);
      setLoginReason(reason || 'Please sign in or create a free account to continue.');
      setShowLoginModal(true);
      return false;
    }
    return true;
  };

  const handleCloseLoginModal = () => {
    setShowLoginModal(false);
    // Leaving the seller / staff sign-in page returns to the public site
    if (portalForPath(window.location.pathname)) window.history.replaceState(null, '', '/');
  };

  const handleLoginSuccess = (
    user: User,
    redirectTab: 'browse' | 'list' | 'renter' | 'owner' | 'admin' | 'operations',
    message: string
  ) => {
    setCurrentUser(user);
    if (portalForPath(window.location.pathname)) window.history.replaceState(null, '', '/');
    // If the user had an asset detail modal open, keep them on browse so they can complete their booking immediately
    if (selectedAssetForDetail) {
      setActiveTab('browse');
    } else {
      setActiveTab(redirectTab);
    }
    showToast(message, 'success');
  };

  const handleBookingCreated = (booking: Booking) => {
    setSelectedAssetForDetail(null);
    showToast(`Booking request for ${booking.assetTitle} sent to the owner. You will be notified when they accept.`, 'success');
    setActiveTab('renter');
  };

  const handleApplySavedSearch = (search: SavedSearch) => {
    setSearchQuery(search.query || '');
    setSelectedCategory(search.categoryId || 'all');
    setSelectedRegion(search.region || 'all');
    setOwnershipFilter(search.ownershipFilter || 'all');
    setActiveTab('browse');
    showToast(`Applied saved search: "${search.name}"`, 'success');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-100 flex flex-col items-center justify-center p-6 text-stone-700">
        <Loader2 className="w-10 h-10 animate-spin text-amber-700 mb-4" />
        <h2 className="text-base font-extrabold text-stone-900 tracking-tight">RENTZ</h2>
        <p className="text-xs text-stone-500 mt-1">Starting server and initializing marketplace inventory...</p>
      </div>
    );
  }

  const supportedRegions = config?.supportedRegions || [
    'Dar es Salaam',
    'Arusha',
    'Mwanza',
    'Dodoma',
    'Zanzibar',
    'Mbeya',
    'Morogoro',
    'Tanga',
    'Moshi',
  ];

  const hasActiveFilters =
    Boolean(searchQuery) ||
    selectedCategory !== 'all' ||
    selectedRegion !== 'all' ||
    ownershipFilter !== 'all';

  const t = {
    en: {
      showing: 'Showing',
      listings: 'equipment listings across Tanzania',
      inRegion: 'in',
      clearFilters: 'Clear Filters',
      saveThisSearch: 'Save This Search',
      listView: 'List View',
      mapView: 'Map View',
      noMatchTitle: 'No equipment matched your filters',
      noMatchDesc: 'Try searching for different keywords or clear the category / region filter.',
      resetFilters: 'Reset Search Filters',
      guestBanner: 'View-Only Mode: You can browse equipment and live pricing freely. Log in or sign up to book, list, or edit assets.',
      guestCta: 'Log In / Sign Up',
    },
    sw: {
      showing: 'Inaonyesha',
      listings: 'vifaa vinavyopatikana kote nchini Tanzania',
      inRegion: 'katika',
      clearFilters: 'Futa Vichujio',
      saveThisSearch: 'Hifadhi Utafutaji Huu',
      listView: 'Orodha',
      mapView: 'Ramani ya Tanzania',
      noMatchTitle: 'Hakuna vifaa vilivyolingana na vichujio vyako',
      noMatchDesc: 'Jaribu kutafuta kwa maneno mengine au badili mkoa na kundi la vifaa.',
      resetFilters: 'Weka Upya Vichujio',
      guestBanner: 'Hali ya Kutazama Tu: Unaweza kutazama vifaa na bei. Ingia au jisajili ili kukodisha au kuweka vifaa.',
      guestCta: 'Ingia / Jisajili',
    },
    fr: {
      showing: 'Affichage de',
      listings: 'équipements répertoriés à travers la Tanzanie',
      inRegion: 'à',
      clearFilters: 'Effacer les Filtres',
      saveThisSearch: 'Enregistrer cette Recherche',
      listView: 'Vue Liste',
      mapView: 'Vue Carte',
      noMatchTitle: 'Aucun matériel ne correspond à vos filtres',
      noMatchDesc: 'Essayez d’autres mots-clés ou réinitialisez le filtre de région/catégorie.',
      resetFilters: 'Réinitialiser les Filtres',
      guestBanner: 'Mode Lecture Seule : Parcourez le catalogue librement. Connectez-vous ou inscrivez-vous pour réserver ou gérer des équipements.',
      guestCta: 'Connexion / Inscription',
    },
  }[language];

  return (
    <APIProvider
      apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}
      region="TZ"
      language="en"
    >
    <div className="min-h-screen bg-white relative flex flex-col text-stone-900 selection:bg-amber-600 selection:text-white">
      {gmpQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {/* Logos & Emblems of Hired Tools & Equipments Watermark Pattern (opacity-50) */}
      <EquipmentWatermarkBackground />

      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 max-w-md animate-in fade-in slide-in-from-top-4 duration-200">
          <div
            className={`p-3.5 rounded-xl shadow-xl border flex items-center gap-3 text-xs font-semibold ${
              toastMessage.type === 'success'
                ? 'bg-amber-950 text-amber-100 border-amber-700'
                : toastMessage.type === 'error'
                ? 'bg-red-900 text-white border-red-700'
                : 'bg-stone-900 text-white border-stone-700'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Top Bar Header */}
      <Header
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab !== 'browse' && tab !== 'logistics' && !currentUser) {
            const targetPortal: LoginPortalType =
              tab === 'owner' ? 'seller' : tab === 'admin' || tab === 'operations' ? 'staff' : 'buyer';
            requireAuthForAction(targetPortal, 'Please sign in to see your rentals.');
            return;
          }
          setActiveTab(tab);
        }}
        onSwitchRole={handleRoleSwitch}
        language={language}
        setLanguage={setLanguage}
        onOpenSavedSearches={() => {
          if (!requireAuthForAction('buyer', 'Please sign in to save and manage your searches.')) return;
          setShowSavedSearchesModal(true);
        }}
        onOpenLoginModal={handleOpenLoginModal}
        onOpenIntegrationsHub={() => {
          fetchBookings()
            .then(setAllBookingsForHub)
            .catch(() => {});
          setShowIntegrationsHub(true);
        }}
        onLogout={handleLogout}
      />

      {/* PWA Offline & Queued Field Ops Sync Banner */}
      <OfflineIndicator queuedCount={offlineQueueCount} onSyncQueue={handleSyncOfflineQueue} />

      {/* Main Content Area */}
      <main className="flex-1">
        {(activeTab === 'browse' || (!currentUser && activeTab !== 'logistics')) && (
          <>
            {/* Hero Section */}
            <Hero
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              selectedRegion={selectedRegion}
              setSelectedRegion={setSelectedRegion}
              categories={categories}
              supportedRegions={supportedRegions}
              onSearchSubmit={handleSearchSubmit}
              language={language}
              onListAssetClick={
                // Listing is offered only to signed-in sellers; others reach the Seller Centre via /seller
                currentUser?.allowedRoles?.includes('owner')
                  ? () => {
                      if (currentUser.role !== 'owner' && currentUser.role !== 'admin') {
                        handleRoleSwitch('owner');
                      }
                      setShowCreateAssetModal(true);
                    }
                  : undefined
              }
            />

            {/* Catalog Grid Section */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {/* Category Segmented Buttons */}
              <CategoryFilter
                categories={categories}
                selectedCategory={selectedCategory}
                onSelectCategory={(cat) => setSelectedCategory(cat)}
                ownershipFilter={ownershipFilter}
                onSelectOwnership={(o) => setOwnershipFilter(o)}
                language={language}
              />

              {/* Search Active Indicator / Results Count & View Mode Toggle */}
              <div className="mt-6 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-stone-500">
                <div className="flex flex-wrap items-center gap-3">
                  <p>
                    {t.showing}{' '}
                    <span className="font-bold text-stone-900 tabular-nums">{assets.length}</span>{' '}
                    {t.listings}
                    {selectedRegion !== 'all' && (
                      <span>
                        {' '}
                        {t.inRegion} <strong className="text-stone-800">{selectedRegion}</strong>
                      </span>
                    )}
                  </p>

                  {hasActiveFilters && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setSelectedCategory('all');
                          setSelectedRegion('all');
                          setOwnershipFilter('all');
                        }}
                        className="text-amber-800 hover:text-amber-900 font-semibold cursor-pointer underline"
                      >
                        {t.clearFilters}
                      </button>

                      <button
                        onClick={() => {
                          if (!requireAuthForAction('buyer', 'Please sign in to save this search.')) {
                            return;
                          }
                          setShowSavedSearchesModal(true);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 rounded-md border border-amber-300 transition-colors cursor-pointer"
                      >
                        <Bookmark className="w-3 h-3 text-amber-700" />
                        <span>{t.saveThisSearch}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* List View vs Map View Segmented Toggle */}
                <div className="flex items-center gap-1 p-1 bg-stone-100/90 rounded-lg self-start sm:self-auto shrink-0 border border-stone-200">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                      viewMode === 'list'
                        ? 'bg-white text-stone-900 shadow-xs font-bold'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>{t.listView}</span>
                  </button>
                  <button
                    onClick={() => setViewMode('map')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                      viewMode === 'map'
                        ? 'bg-white text-stone-900 shadow-xs font-bold text-amber-800'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <MapIcon className="w-3.5 h-3.5" />
                    <span>{t.mapView}</span>
                  </button>
                </div>
              </div>

              {/* View Mode Switching: Map View vs Grid View */}
              {viewMode === 'map' ? (
                <TanzaniaMapPlaceholder
                  assets={assets}
                  onSelectAsset={(a) => setSelectedAssetForDetail(a)}
                  selectedRegion={selectedRegion}
                  onSelectRegion={(reg) => setSelectedRegion(reg)}
                  language={language}
                />
              ) : loadingAssets ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-amber-700" />
                </div>
              ) : assets.length === 0 ? (
                <div className="text-center py-20 bg-white/95 rounded-2xl border border-stone-200 p-8 my-6 backdrop-blur-xs">
                  <SlidersHorizontal className="w-10 h-10 text-stone-300 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-stone-900">{t.noMatchTitle}</h3>
                  <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">{t.noMatchDesc}</p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('all');
                      setSelectedRegion('all');
                      setOwnershipFilter('all');
                    }}
                    className="mt-4 px-4 py-2 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-lg cursor-pointer transition-colors shadow-xs"
                  >
                    {t.resetFilters}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {assets.map((asset) => (
                    <AssetCard
                      key={asset.id}
                      asset={asset}
                      onSelect={(a) => setSelectedAssetForDetail(a)}
                      language={language}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Renter View */}
        {currentUser && activeTab === 'renter' && (
          <RenterDashboard
            currentUser={currentUser}
            onOpenDispute={(booking) => setSelectedBookingForDispute(booking)}
            onOpenDocumentModal={handleOpenDocumentModal}
            language={language}
          />
        )}

        {/* Owner View */}
        {currentUser && activeTab === 'owner' && (
          <OwnerDashboard
            currentUser={currentUser}
            onOpenCreateAsset={() => {
              setEditingAsset(null);
              setShowCreateAssetModal(true);
            }}
            onEditAsset={(asset) => {
              setEditingAsset(asset);
              setShowCreateAssetModal(true);
            }}
            onAssetDeleted={(assetId) => {
              setAssets((prev) => prev.filter((a) => a.id !== assetId));
              showToast('Equipment listing deleted.', 'info');
            }}
            onOpenDocumentModal={handleOpenDocumentModal}
            onOpenQRSticker={(asset) => setSelectedAssetForQR(asset)}
            language={language}
          />
        )}

        {/* Operations View */}
        {currentUser && activeTab === 'operations' && (
          <OperationsView
            currentUser={currentUser}
            language={language}
            categories={categories}
            onOpenDocumentModal={handleOpenDocumentModal}
          />
        )}

        {/* Dedicated Logistics & Delivery Driver Dispatch Portal */}
        {activeTab === 'logistics' && (
          <LogisticsView
            currentUser={currentUser}
            onOpenDocumentModal={handleOpenDocumentModal}
          />
        )}

        {/* Administrator View */}
        {currentUser && activeTab === 'admin' && (
          <AdminDashboard currentUser={currentUser} language={language} />
        )}
      </main>

      {/* Floating Support & WhatsApp Handoff Trigger */}
      <button
        onClick={() => setShowSupportChat(true)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 px-4 py-3 rounded-full bg-stone-900 hover:bg-stone-800 text-white shadow-xl border border-stone-700 text-xs font-bold cursor-pointer print:hidden"
        title="Open Live Support & WhatsApp Dispatch Desk"
      >
        <MessageSquare className="w-4 h-4 text-amber-400" />
        <span>Support & WhatsApp</span>
      </button>

      {/* Footer */}
      <Footer language={language} />

      {/* Modals */}
      {selectedAssetForDetail && (
        <AssetDetailModal
          asset={selectedAssetForDetail}
          onClose={() => setSelectedAssetForDetail(null)}
          currentUser={currentUser}
          onBookSuccess={handleBookingCreated}
          onRequireLogin={() => {
            requireAuthForAction('buyer', 'Please sign in or create a free account to send a booking request.');
          }}
          onOpenQRSticker={(asset) => setSelectedAssetForQR(asset)}
          language={language}
        />
      )}

      {selectedAssetForQR && (
        <QRAssetStickerModal
          asset={selectedAssetForQR}
          onClose={() => setSelectedAssetForQR(null)}
        />
      )}

      {selectedBookingForDocs && (
        <DocumentPreviewModal
          booking={selectedBookingForDocs}
          initialTab={docModalTab}
          onClose={() => setSelectedBookingForDocs(null)}
        />
      )}

      <IntegrationsHubModal
        isOpen={showIntegrationsHub}
        onClose={() => setShowIntegrationsHub(false)}
        bookings={allBookingsForHub}
        assets={assets}
      />

      <SupportChatDrawer
        isOpen={showSupportChat}
        onClose={() => setShowSupportChat(false)}
        currentUser={currentUser}
      />

      {currentUser && showCreateAssetModal && (
        <CreateAssetModal
          categories={categories}
          supportedRegions={supportedRegions}
          currentUser={currentUser}
          editingAsset={editingAsset}
          onClose={() => {
            setShowCreateAssetModal(false);
            setEditingAsset(null);
          }}
          onAssetCreated={(savedAsset) => {
            setAssets((prev) => {
              const exists = prev.some((a) => a.id === savedAsset.id);
              return exists
                ? prev.map((a) => (a.id === savedAsset.id ? savedAsset : a))
                : [savedAsset, ...prev];
            });
            showToast(
              editingAsset
                ? `Asset "${savedAsset.title}" updated in Cloud Firestore!`
                : `Asset "${savedAsset.title}" successfully added to RENTZ & Cloud Firestore!`,
              'success'
            );
          }}
        />
      )}

      {currentUser && selectedBookingForDispute && (
        <DisputeModal
          booking={selectedBookingForDispute}
          currentUser={currentUser}
          onClose={() => setSelectedBookingForDispute(null)}
          onDisputeRaised={() => {
            showToast('Dispute filed successfully with RENTZ Legal & Operations.', 'info');
          }}
        />
      )}

      {currentUser && showSavedSearchesModal && (
        <SavedSearchesModal
          isOpen={showSavedSearchesModal}
          onClose={() => setShowSavedSearchesModal(false)}
          onApplySearch={handleApplySavedSearch}
          language={language}
          categories={categories}
          currentQuery={searchQuery}
          currentCategoryId={selectedCategory}
          currentRegion={selectedRegion}
          currentOwnership={ownershipFilter}
        />
      )}

      {showLoginModal && (
        <LoginModal
          isOpen={showLoginModal}
          onClose={handleCloseLoginModal}
          onSuccess={handleLoginSuccess}
          portal={initialLoginPortal}
          reason={loginReason}
          language={language}
        />
      )}
    </div>
    </APIProvider>
  );
}
