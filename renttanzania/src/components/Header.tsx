import React, { useEffect, useState } from 'react';
import { User, UserRole, AppLanguage } from '../types/index.js';
import {
  Menu,
  X,
  ChevronDown,
  UserCheck,
  Shield,
  Briefcase,
  Wrench,
  Check,
  Globe,
  Bookmark,
  LogIn,
  LogOut,
  ShieldCheck,
  Eye,
  Lock,
  Truck,
  Link2,
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton.js';

interface HeaderProps {
  currentUser: User | null;
  activeTab: 'browse' | 'list' | 'renter' | 'owner' | 'admin' | 'operations' | 'logistics';
  setActiveTab: (tab: 'browse' | 'list' | 'renter' | 'owner' | 'admin' | 'operations' | 'logistics') => void;
  onSwitchRole: (role: UserRole) => void;
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  onOpenSavedSearches?: () => void;
  onOpenLoginModal?: (portal?: 'buyer' | 'seller' | 'staff') => void;
  onOpenIntegrationsHub?: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  activeTab,
  setActiveTab,
  onSwitchRole,
  language,
  setLanguage,
  onOpenSavedSearches,
  onOpenLoginModal,
  onOpenIntegrationsHub,
  onLogout,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  // Escape closes the account menu
  useEffect(() => {
    if (!roleDropdownOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setRoleDropdownOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [roleDropdownOpen]);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);

  const t = {
    en: {
      browse: 'Browse Gear',
      list: 'List Asset',
      renter: 'My Rentals',
      owner: 'Seller Centre',
      ops: 'Field Ops',
      admin: 'Admin Console',
      savedSearches: 'Saved Searches',
      role: 'Role',
      switchPersona: 'Switch View',
      viewOnly: 'Guest · View Only',
      signInSignUp: 'Log In / Sign Up',
      signOut: 'Sign Out',
    },
    sw: {
      browse: 'Tazama Vifaa',
      list: 'Weka Kifaa',
      renter: 'Kukodisha Kwangu',
      owner: 'Kituo cha Muuzaji',
      ops: 'Ukaguzi & Uwanjani',
      admin: 'Usimamizi',
      savedSearches: 'Utafutaji Uliohifadhiwa',
      role: 'Wadhifa',
      switchPersona: 'Badili Mwonekano',
      viewOnly: 'Mgeni · Kutazama Tu',
      signInSignUp: 'Ingia / Jisajili',
      signOut: 'Toka',
    },
    fr: {
      browse: 'Parcourir le Matériel',
      list: 'Publier un Actif',
      renter: 'Mes Locations',
      owner: 'Espace Vendeur',
      ops: 'Opérations Terrain',
      admin: 'Console Admin',
      savedSearches: 'Recherches Enregistrées',
      role: 'Rôle',
      switchPersona: 'Changer de vue',
      viewOnly: 'Invité · Lecture Seule',
      signInSignUp: 'Connexion / Inscription',
      signOut: 'Déconnexion',
    },
  }[language];

  const handleNavClick = (tab: 'browse' | 'list' | 'renter' | 'owner' | 'admin' | 'operations' | 'logistics') => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  // Buyers only rent; seller accounts can sell and rent; staff see the consoles
  const canSell = !!currentUser?.allowedRoles?.includes('owner');
  const isStaff = !!currentUser?.hasAdminOpsAccess;

  const handleProtectedNav = (
    tab: 'renter' | 'owner' | 'admin' | 'operations' | 'logistics',
    requiredRole?: UserRole
  ) => {
    setMobileMenuOpen(false);
    if (!currentUser) {
      if (onOpenLoginModal) onOpenLoginModal('buyer');
      return;
    }
    const isStaffTab = requiredRole === 'admin' || requiredRole === 'operations' || tab === 'logistics';
    if (isStaffTab && !isStaff) return;
    if (requiredRole === 'owner' && !canSell) return;
    if (requiredRole && currentUser.role !== requiredRole && currentUser.role !== 'admin') {
      onSwitchRole(requiredRole);
    }
    setActiveTab(tab);
  };

  const roleLabels: Record<UserRole, { label: { en: string; sw: string; fr: string }; icon: any; color: string; desc: { en: string; sw: string; fr: string } }> = {
    renter: {
      label: { en: 'Renter', sw: 'Mkodishaji', fr: 'Locataire' },
      icon: UserCheck,
      color: 'text-sky-600',
      desc: {
        en: 'Hire gear, see estimated cost, request bookings for free',
        sw: 'Kodisha vifaa, ona makadirio ya gharama, omba bure',
        fr: 'Louez du matériel, coût estimé, réservation gratuite',
      },
    },
    owner: {
      label: { en: 'Asset Owner', sw: 'Mmiliki wa Kifaa', fr: 'Propriétaire' },
      icon: Briefcase,
      color: 'text-amber-700',
      desc: {
        en: 'List assets, manage requests, track earnings & extensions',
        sw: 'Weka vifaa, simamia maombi, fuatilia mapato & nyongeza',
        fr: 'Publiez des équipements, gérez les demandes et prolongations',
      },
    },
    operations: {
      label: { en: 'Field Ops', sw: 'Ukaguzi Uwanjani', fr: 'Opérations Terrain' },
      icon: Wrench,
      color: 'text-amber-600',
      desc: {
        en: 'Handover checklist, QR check, return inspect',
        sw: 'Orodha ya kukabidhi, QR token, ukaguzi wa kurudi',
        fr: 'Checklists de remise, scans QR, rapports d’inspection',
      },
    },
    admin: {
      label: { en: 'Administrator', sw: 'Msimamizi Mkuu', fr: 'Administrateur' },
      icon: Shield,
      color: 'text-stone-900',
      desc: {
        en: 'Analytics, owner verification, dispute decisions & fleet',
        sw: 'Takwimu, uthibitisho wa wamiliki, maamuzi ya migogoro na meli',
        fr: 'Statistiques, vérification des propriétaires, litiges et politique',
      },
    },
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-6 h-16">
          {/* Zone 1: Single text element wordmark */}
          <button
            onClick={() => handleNavClick('browse')}
            className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-stone-900 whitespace-nowrap shrink-0 text-left cursor-pointer"
          >
            <span className="text-amber-700">RENT</span>Z
          </button>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-stone-600">
            <button
              onClick={() => handleNavClick('browse')}
              className={`hover:text-amber-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'browse'
                  ? 'text-amber-800 font-semibold border-b-2 border-amber-700 pb-0.5'
                  : ''
              }`}
            >
              {t.browse}
            </button>
            <button
              onClick={() => handleProtectedNav('renter')}
              className={`flex items-center gap-1 hover:text-amber-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'renter'
                  ? 'text-amber-800 font-semibold border-b-2 border-amber-700 pb-0.5'
                  : ''
              }`}
            >
              {!currentUser && <Lock className="w-3 h-3 text-stone-400" />}
              <span>{t.renter}</span>
            </button>
            {canSell && (
            <button
              onClick={() => handleProtectedNav('owner', 'owner')}
              className={`flex items-center gap-1 hover:text-amber-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'owner'
                  ? 'text-amber-800 font-semibold border-b-2 border-amber-700 pb-0.5'
                  : ''
              }`}
            >
              <span>{t.owner}</span>
            </button>
            )}
            {isStaff && (
            <button
              onClick={() => handleProtectedNav('operations', 'operations')}
              className={`flex items-center gap-1 hover:text-amber-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'operations'
                  ? 'text-amber-800 font-semibold border-b-2 border-amber-700 pb-0.5'
                  : ''
              }`}
            >
              <span>{t.ops}</span>
            </button>
            )}
            {isStaff && (
            <button
              onClick={() => handleProtectedNav('logistics')}
              className={`flex items-center gap-1 hover:text-amber-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'logistics'
                  ? 'text-amber-800 font-semibold border-b-2 border-amber-700 pb-0.5'
                  : ''
              }`}
            >
              <Truck className="w-3.5 h-3.5 text-amber-600" />
              <span>Dispatch</span>
            </button>
            )}
            {isStaff && (
            <button
              onClick={() => handleProtectedNav('admin', 'admin')}
              className={`flex items-center gap-1 hover:text-amber-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'admin'
                  ? 'text-amber-800 font-semibold border-b-2 border-amber-700 pb-0.5'
                  : ''
              }`}
            >
              <span>{t.admin}</span>
            </button>
            )}
          </nav>

          {/* Zone 3: Actions - PWA Install, Integrations Hub, Saved Searches, Language Switcher, Auth */}
          <div className="flex items-center gap-2 shrink-0">
            <PWAInstallButton />

            {onOpenIntegrationsHub && currentUser?.hasAdminOpsAccess && (
              <button
                onClick={onOpenIntegrationsHub}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-amber-400 bg-stone-900 hover:bg-stone-800 border border-stone-800 rounded-lg transition-colors cursor-pointer"
                title="Linked Apps & Tools"
              >
                <Link2 className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden xl:inline">Linked Apps</span>
              </button>
            )}

            {/* Saved Searches Quick Access Button */}
            {onOpenSavedSearches && (
              <button
                onClick={onOpenSavedSearches}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-lg transition-colors cursor-pointer"
                title={t.savedSearches}
              >
                <Bookmark className="w-3.5 h-3.5 text-amber-700" />
                <span className="hidden lg:inline">{t.savedSearches}</span>
              </button>
            )}

            {/* Trilingual Language Selector (EN / SW / FR) */}
            <div className="relative">
              <button
                onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-lg transition-colors cursor-pointer font-mono"
                title="Badili lugha / Changer de langue / Switch language"
              >
                <Globe className="w-3.5 h-3.5 text-stone-500" />
                <span className="uppercase">{language}</span>
                <ChevronDown className="w-3 h-3 text-stone-400" />
              </button>

              {langDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-50" onClick={() => setLangDropdownOpen(false)} />
                  <div className="absolute right-0 mt-2 w-36 bg-white rounded-xl shadow-xl border border-stone-200 py-1 z-50 text-xs">
                    {[
                      { code: 'en' as AppLanguage, label: 'English', flag: '🇬🇧' },
                      { code: 'sw' as AppLanguage, label: 'Kiswahili', flag: '🇹🇿' },
                      { code: 'fr' as AppLanguage, label: 'Français', flag: '🇫🇷' },
                    ].map((item) => (
                      <button
                        key={item.code}
                        onClick={() => {
                          setLanguage(item.code);
                          setLangDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-stone-50 transition-colors cursor-pointer ${
                          language === item.code ? 'font-bold text-amber-900 bg-amber-50/80' : 'text-stone-700'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span>{item.flag}</span>
                          <span>{item.label}</span>
                        </span>
                        {language === item.code && (
                          <Check className="w-3.5 h-3.5 text-amber-700" />
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {!currentUser ? (
              <button
                onClick={() => onOpenLoginModal && onOpenLoginModal('buyer')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 border border-amber-800 rounded-lg transition-colors cursor-pointer shadow-xs shrink-0"
                title="Log in or create an account"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{t.signInSignUp}</span>
              </button>
            ) : (
              <>
                {/* Role Switcher Menu */}
                <div className="relative">
                  <button
                    onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                    className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 text-xs font-medium text-stone-800 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        currentUser.role === 'owner'
                          ? currentUser.ownerTier === 'verified'
                            ? 'bg-amber-500'
                            : 'bg-stone-400'
                          : 'bg-amber-600'
                      }`}
                    />
                    <span className="font-semibold truncate max-w-[130px] sm:max-w-none">
                      {currentUser.role === 'owner'
                        ? currentUser.ownerTier === 'verified'
                          ? 'Verified Owner'
                          : 'Ordinary Owner'
                        : roleLabels[currentUser.role]?.label[language] || currentUser.role}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-stone-500" />
                  </button>

                  {roleDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-50" onClick={() => setRoleDropdownOpen(false)} />
                      <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-stone-200 py-2 z-50">
                        <div className="px-3.5 py-2 border-b border-stone-100">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
                                {t.switchPersona}
                              </p>
                              <p className="text-xs text-stone-800 font-bold truncate mt-0.5">
                                {currentUser.name}
                              </p>
                            </div>
                            {currentUser.role === 'owner' && (
                              <span
                                className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                                  currentUser.ownerTier === 'verified'
                                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                    : 'bg-stone-100 text-stone-700 border border-stone-300'
                                }`}
                              >
                                {currentUser.ownerTier === 'verified' ? 'Verified' : 'Ordinary'}
                              </span>
                            )}
                          </div>
                          {/* Sellers switch between renting and their Seller Centre; buyers have one view */}
                          {canSell && (
                          <div className="mt-2 grid grid-cols-2 gap-1.5">
                            <button
                              onClick={() => {
                                onSwitchRole('renter');
                                setRoleDropdownOpen(false);
                                setActiveTab('renter');
                              }}
                              className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                                currentUser.role === 'renter'
                                  ? 'bg-sky-700 text-white border-sky-800'
                                  : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                              }`}
                            >
                              Renter View
                            </button>
                            <button
                              onClick={() => {
                                onSwitchRole('owner');
                                setRoleDropdownOpen(false);
                                setActiveTab('owner');
                              }}
                              className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                                currentUser.role === 'owner'
                                  ? 'bg-amber-700 text-white border-amber-800'
                                  : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                              }`}
                            >
                              {t.owner}
                            </button>
                          </div>
                          )}
                        </div>

                        {/* Staff switch their own account into the Operations or Admin console */}
                        {currentUser.hasAdminOpsAccess && (
                          <div className="py-1">
                            <p className="px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                              Staff Consoles
                            </p>
                            <button
                              onClick={() => {
                                onSwitchRole('operations');
                                setRoleDropdownOpen(false);
                                setActiveTab('operations');
                              }}
                              className={`w-full flex items-center justify-between px-3.5 py-2 text-xs text-left hover:bg-stone-50 transition-colors cursor-pointer ${
                                currentUser.role === 'operations' ? 'bg-amber-50/60 font-semibold text-stone-900' : 'text-stone-600'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <Wrench className="w-4 h-4 text-amber-600 shrink-0" />
                                <div>
                                  <p className="font-medium text-stone-900">Field Operations View</p>
                                  <p className="text-[10px] text-stone-500">QR inspections & physical handover</p>
                                </div>
                              </div>
                              {currentUser.role === 'operations' && <Check className="w-4 h-4 text-amber-700 shrink-0" />}
                            </button>
                            <button
                              onClick={() => {
                                onSwitchRole('admin');
                                setRoleDropdownOpen(false);
                                setActiveTab('admin');
                              }}
                              className={`w-full flex items-center justify-between px-3.5 py-2 text-xs text-left hover:bg-stone-50 transition-colors cursor-pointer ${
                                currentUser.role === 'admin' ? 'bg-amber-50/60 font-semibold text-stone-900' : 'text-stone-600'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <Shield className="w-4 h-4 text-stone-900 shrink-0" />
                                <div>
                                  <p className="font-medium text-stone-900">Administrator View</p>
                                  <p className="text-[10px] text-stone-500">Owner verification, disputes & fleet governance</p>
                                </div>
                              </div>
                              {currentUser.role === 'admin' && <Check className="w-4 h-4 text-amber-700 shrink-0" />}
                            </button>
                          </div>
                        )}

                        {/* Launch Full Login Portal & Sign Out CTAs */}
                        <div className="pt-2 px-3 border-t border-stone-100 mt-1 space-y-1.5">
                          {onLogout && (
                            <button
                              onClick={() => {
                                setRoleDropdownOpen(false);
                                onLogout();
                              }}
                              className="w-full py-1.5 px-2.5 rounded-lg text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <LogOut className="w-3.5 h-3.5 text-stone-500" />
                              <span>{t.signOut} (Return to View-Only Mode)</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {onLogout && (
                  <button
                    onClick={onLogout}
                    className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-lg transition-colors cursor-pointer"
                    title="Sign out and return to View-Only mode"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="hidden lg:inline">{t.signOut}</span>
                  </button>
                )}
              </>
            )}

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-stone-600 hover:text-stone-900 rounded-lg hover:bg-stone-100 cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-stone-200 bg-white px-4 pt-2 pb-4 space-y-1">
          <button
            onClick={() => handleNavClick('browse')}
            className={`w-full text-left px-3 py-2 text-sm font-medium rounded-lg cursor-pointer ${
              activeTab === 'browse' ? 'bg-amber-50 text-amber-900' : 'text-stone-700 hover:bg-stone-50'
            }`}
          >
            {t.browse}
          </button>
          {canSell && (
          <button
            onClick={() => handleProtectedNav('owner', 'owner')}
            className={`w-full text-left px-3 py-2 text-sm font-medium rounded-lg flex items-center justify-between cursor-pointer ${
              activeTab === 'owner' ? 'bg-amber-50 text-amber-900' : 'text-stone-700 hover:bg-stone-50'
            }`}
          >
            <span>{t.owner}</span>
          </button>
          )}
          <button
            onClick={() => handleProtectedNav('renter')}
            className={`w-full text-left px-3 py-2 text-sm font-medium rounded-lg flex items-center justify-between cursor-pointer ${
              activeTab === 'renter' ? 'bg-amber-50 text-amber-900' : 'text-stone-700 hover:bg-stone-50'
            }`}
          >
            <span>{t.renter}</span>
            {!currentUser && <Lock className="w-3.5 h-3.5 text-stone-400" />}
          </button>
          {isStaff && (
          <button
            onClick={() => handleProtectedNav('operations', 'operations')}
            className={`w-full text-left px-3 py-2 text-sm font-medium rounded-lg flex items-center justify-between cursor-pointer ${
              activeTab === 'operations' ? 'bg-amber-50 text-amber-900' : 'text-stone-700 hover:bg-stone-50'
            }`}
          >
            <span>{t.ops}</span>
          </button>
          )}
          {isStaff && (
          <button
            onClick={() => handleProtectedNav('admin', 'admin')}
            className={`w-full text-left px-3 py-2 text-sm font-medium rounded-lg flex items-center justify-between cursor-pointer ${
              activeTab === 'admin' ? 'bg-amber-50 text-amber-900' : 'text-stone-700 hover:bg-stone-50'
            }`}
          >
            <span>{t.admin}</span>
          </button>
          )}
          {onOpenSavedSearches && (
            <button
              onClick={() => {
                onOpenSavedSearches();
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-sm font-semibold rounded-lg text-amber-900 hover:bg-amber-50 flex items-center gap-2 cursor-pointer"
            >
              <Bookmark className="w-4 h-4 text-amber-700" />
              <span>{t.savedSearches}</span>
            </button>
          )}

          <div className="pt-2 border-t border-stone-100 space-y-2">
            {!currentUser && (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                if (onOpenLoginModal) onOpenLoginModal('buyer');
              }}
              className="w-full py-2.5 px-3 rounded-lg text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>{t.signInSignUp}</span>
            </button>
            )}
            {currentUser && onLogout && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onLogout();
                }}
                className="w-full py-2 px-3 rounded-lg text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>{t.signOut}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
