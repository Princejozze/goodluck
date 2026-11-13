import React from 'react';
import { Category, OwnershipType, AppLanguage } from '../types/index.js';
import {
  HardHat,
  Tractor,
  PartyPopper,
  Truck,
  Video,
  Laptop,
  Home,
  Palette,
  Wrench,
  Check,
} from 'lucide-react';

interface CategoryFilterProps {
  categories: Category[];
  selectedCategory: string;
  onSelectCategory: (id: string) => void;
  ownershipFilter: 'all' | 'company' | 'third_party';
  onSelectOwnership: (type: 'all' | 'company' | 'third_party') => void;
  language: AppLanguage;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  ownershipFilter,
  onSelectOwnership,
  language,
}) => {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'HardHat':
        return HardHat;
      case 'Tractor':
        return Tractor;
      case 'PartyPopper':
        return PartyPopper;
      case 'Truck':
        return Truck;
      case 'Video':
        return Video;
      case 'Laptop':
        return Laptop;
      case 'Home':
        return Home;
      case 'Palette':
        return Palette;
      default:
        return Wrench;
    }
  };

  const t = {
    en: {
      allGear: 'All Equipment',
      allFleets: 'All Fleets',
      companyFleet: 'RENTZ Fleet',
      verifiedOwners: 'Verified Owners',
    },
    sw: {
      allGear: 'Vifaa Vyote',
      allFleets: 'Meli Zote',
      companyFleet: 'RENTZ Fleet',
      verifiedOwners: 'Wamiliki Binafsi',
    },
    fr: {
      allGear: 'Tous les Équipements',
      allFleets: 'Toutes les Flottes',
      companyFleet: 'Flotte RENTZ',
      verifiedOwners: 'Propriétaires Vérifiés',
    },
  }[language];

  return (
    <div className="py-6 border-b border-stone-200">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Category Horizontal Scroll Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => onSelectCategory('all')}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-stone-900 text-white shadow-sm'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            {t.allGear}
          </button>

          {categories.map((c) => {
            const Icon = getIcon(c.iconName);
            const isSelected = selectedCategory === c.id;
            const categoryLabel =
              language === 'sw'
                ? c.nameSwahili
                : language === 'fr'
                ? c.nameFrench || c.name
                : c.name;

            return (
              <button
                key={c.id}
                onClick={() => onSelectCategory(c.id)}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-stone-900 text-white shadow-sm'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-400' : 'text-stone-500'}`} />
                <span>{categoryLabel}</span>
                {c.assetCount !== undefined && c.assetCount > 0 && (
                  <span
                    className={`text-[10px] tabular-nums ${
                      isSelected ? 'text-stone-300' : 'text-stone-400'
                    }`}
                  >
                    ({c.assetCount})
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Ownership Type Filter */}
        <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-lg self-start lg:self-auto shrink-0">
          <button
            onClick={() => onSelectOwnership('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              ownershipFilter === 'all'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            {t.allFleets}
          </button>
          <button
            onClick={() => onSelectOwnership('company')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              ownershipFilter === 'company'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
            <span>{t.companyFleet}</span>
          </button>
          <button
            onClick={() => onSelectOwnership('third_party')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              ownershipFilter === 'third_party'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            {t.verifiedOwners}
          </button>
        </div>
      </div>
    </div>
  );
};
