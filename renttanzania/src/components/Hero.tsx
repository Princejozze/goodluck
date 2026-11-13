import React from 'react';
import { Search, MapPin, SlidersHorizontal, ShieldCheck, Truck, Clock } from 'lucide-react';
import { Category, AppLanguage } from '../types/index.js';

interface HeroProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  selectedRegion: string;
  setSelectedRegion: (reg: string) => void;
  categories: Category[];
  supportedRegions: string[];
  onSearchSubmit: () => void;
  language: AppLanguage;
  // Only passed for signed-in sellers
  onListAssetClick?: () => void;
}

export const Hero: React.FC<HeroProps> = ({
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  selectedRegion,
  setSelectedRegion,
  categories,
  supportedRegions,
  onSearchSubmit,
  language,
  onListAssetClick,
}) => {
  const t = {
    en: {
      headline: 'Hire What You Need. Earn From What You Own.',
      subtitle:
        'Tanzania’s trusted equipment rental marketplace. Commercial plant hire, tractors, power generators, cinema gear, and events infrastructure. Free to use: request a booking and settle directly with the owner.',
      searchPlaceholder: 'Search equipment (e.g. 50kVA Generator, MF Tractor, FX3 Camera)...',
      allCategories: 'All Categories',
      allRegions: 'All Tanzania Regions',
      searchAction: 'Find Equipment',
      listCTA: 'List Your Equipment',
      trustEscrow: 'Free to Use',
      trustEscrowDesc: 'No fees, no in-app payments',
      trustInspect: 'Verified Handover & Return',
      trustInspectDesc: 'Digital QR checklists & condition reports',
      trustFleet: 'Multi-Tier Sourcing',
      trustFleetDesc: 'RENTZ Fleet, Verified Partners & Ordinary Owners',
      popular: 'Popular:',
    },
    sw: {
      headline: 'Kodisha Unachohitaji. Pata Mapato Kutoka Kwa Mali Yako.',
      subtitle:
        'Soko kuu la kuaminika la kukodisha mitambo, matrekta, jenereta, vifaa vya filamu na sherehe kote nchini Tanzania. Ni bure: omba oda na ulipane moja kwa moja na mmiliki.',
      searchPlaceholder: 'Tafuta vifaa (mfano Jenereta 50kVA, Trekta, Kamera FX3)...',
      allCategories: 'Makundi Yote',
      allRegions: 'Mikoa Yote ya Tanzania',
      searchAction: 'Tafuta Vifaa',
      listCTA: 'Weka Kifaa Chako',
      trustEscrow: 'Bure Kutumia',
      trustEscrowDesc: 'Hakuna ada wala malipo ndani ya programu',
      trustInspect: 'Ukaguzi wa Kukabidhi',
      trustInspectDesc: 'Ripoti za picha na nambari za QR',
      trustFleet: 'Upatikanaji wa Uhakika',
      trustFleetDesc: 'Meli ya RENTZ, Wamiliki Waliothibitishwa & Wamiliki wa Kawaida',
      popular: 'Maarufu:',
    },
    fr: {
      headline: 'Louez ce dont vous avez besoin. Gagnez grâce à ce que vous possédez.',
      subtitle:
        'La plateforme de confiance pour la location de matériel en Tanzanie. Engins de chantier, tracteurs agricoles, générateurs, matériel cinéma et événementiel. Gratuit : réservez et réglez directement avec le propriétaire.',
      searchPlaceholder: 'Rechercher du matériel (ex. Générateur 50kVA, Tracteur MF, Caméra FX3)...',
      allCategories: 'Toutes les Catégories',
      allRegions: 'Toutes les Régions de Tanzanie',
      searchAction: 'Trouver du Matériel',
      listCTA: 'Publier votre Équipement',
      trustEscrow: 'Gratuit',
      trustEscrowDesc: 'Aucun frais, aucun paiement dans l’application',
      trustInspect: 'Remise & Restitution Vérifiées',
      trustInspectDesc: 'Checklists QR numériques & rapports d’état',
      trustFleet: 'Approvisionnement Double Flotte',
      trustFleetDesc: 'Flotte Directe RENTZ & Propriétaires Vérifiés',
      popular: 'Populaire :',
    },
  }[language];

  return (
    <div className="relative bg-stone-900 text-white overflow-hidden">
      {/* Background Image with Measured Contrast Scrim */}
      <div className="absolute inset-0">
        <img
          src="/src/assets/images/hero_equipment_fleet_1792692516554.jpg"
          alt="RENTZ heavy equipment fleet"
          className="w-full h-full object-cover object-center opacity-35"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-900/80 to-stone-950/60" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-28">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-widest text-amber-400 font-semibold mb-3">
            RENTZ · Marketplace & Equipment Hire
          </p>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight text-balance">
            {t.headline}
          </h1>

          <p className="mt-4 text-base sm:text-lg text-stone-300 leading-relaxed max-w-2xl">
            {t.subtitle}
          </p>

          {/* Integrated Search Box */}
          <div className="mt-8 bg-white/95 backdrop-blur-md rounded-2xl p-2 sm:p-3 shadow-2xl border border-stone-200/40 text-stone-900">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
              {/* Search keyword input */}
              <div className="md:col-span-5 relative flex items-center">
                <Search className="w-5 h-5 text-stone-400 absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && onSearchSubmit()}
                  placeholder={t.searchPlaceholder}
                  className="w-full pl-10 pr-3 py-2.5 text-sm bg-transparent border-0 focus:ring-0 focus:outline-none text-stone-900 placeholder:text-stone-400"
                />
              </div>

              {/* Category selector */}
              <div className="md:col-span-3 border-t md:border-t-0 md:border-l border-stone-200 flex items-center px-2">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full py-2.5 text-xs sm:text-sm bg-transparent border-0 focus:ring-0 focus:outline-none text-stone-700 font-medium cursor-pointer"
                >
                  <option value="all">{t.allCategories}</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {language === 'sw'
                        ? c.nameSwahili
                        : language === 'fr'
                        ? c.nameFrench || c.name
                        : c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Region selector */}
              <div className="md:col-span-2 border-t md:border-t-0 md:border-l border-stone-200 flex items-center px-2">
                <MapPin className="w-4 h-4 text-amber-700 mr-1.5 shrink-0" />
                <select
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                  className="w-full py-2.5 text-xs sm:text-sm bg-transparent border-0 focus:ring-0 focus:outline-none text-stone-700 font-medium cursor-pointer"
                >
                  <option value="all">{t.allRegions}</option>
                  {supportedRegions.map((reg) => (
                    <option key={reg} value={reg}>
                      {reg}
                    </option>
                  ))}
                </select>
              </div>

              {/* Action Button */}
              <div className="md:col-span-2">
                <button
                  onClick={onSearchSubmit}
                  className="w-full h-full py-2.5 px-4 bg-amber-700 hover:bg-amber-800 active:bg-amber-900 text-white font-semibold text-xs sm:text-sm rounded-xl transition-colors shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Search className="w-4 h-4" />
                  <span>{t.searchAction}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Category / Action shortcuts */}
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-stone-300">
            <span className="text-stone-400">{t.popular}</span>
            {['50kVA Generator', 'Massey Ferguson Tractor', 'CAT Excavator', 'Sony FX3 Cinema'].map(
              (term) => (
                <button
                  key={term}
                  onClick={() => {
                    setSearchQuery(term);
                    onSearchSubmit();
                  }}
                  className="hover:text-amber-400 underline decoration-stone-500 hover:decoration-amber-400 transition-colors cursor-pointer"
                >
                  {term}
                </button>
              )
            )}
            {onListAssetClick && (
              <>
                <span className="text-stone-500">·</span>
                <button
                  onClick={onListAssetClick}
                  className="text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 cursor-pointer"
                >
                  + {t.listCTA}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 3-Column Trust Strip */}
      <div className="border-t border-stone-800 bg-stone-950/70 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-amber-500 shrink-0" />
              <div>
                <p className="font-semibold text-white">{t.trustEscrow}</p>
                <p className="text-stone-400 text-[11px]">{t.trustEscrowDesc}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 border-t md:border-t-0 md:border-l border-stone-800 pt-3 md:pt-0 md:pl-6">
              <Clock className="w-5 h-5 text-amber-500 shrink-0" />
              <div>
                <p className="font-semibold text-white">{t.trustInspect}</p>
                <p className="text-stone-400 text-[11px]">{t.trustInspectDesc}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 border-t md:border-t-0 md:border-l border-stone-800 pt-3 md:pt-0 md:pl-6">
              <Truck className="w-5 h-5 text-amber-500 shrink-0" />
              <div>
                <p className="font-semibold text-white">{t.trustFleet}</p>
                <p className="text-stone-400 text-[11px]">{t.trustFleetDesc}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
