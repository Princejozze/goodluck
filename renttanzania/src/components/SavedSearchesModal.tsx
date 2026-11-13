import React, { useState, useEffect } from 'react';
import { SavedSearch, AppLanguage, Category } from '../types/index.js';
import { fetchSavedSearches, createSavedSearch, deleteSavedSearch } from '../services/api.js';
import {
  Bookmark,
  X,
  Search,
  MapPin,
  Trash2,
  ArrowRight,
  Plus,
  CheckCircle2,
  Layers,
  Loader2,
} from 'lucide-react';

interface SavedSearchesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplySearch: (search: SavedSearch) => void;
  language: AppLanguage;
  categories: Category[];
  currentQuery?: string;
  currentCategoryId?: string;
  currentRegion?: string;
  currentOwnership?: 'all' | 'company' | 'third_party';
}

export const SavedSearchesModal: React.FC<SavedSearchesModalProps> = ({
  isOpen,
  onClose,
  onApplySearch,
  language,
  categories,
  currentQuery = '',
  currentCategoryId = 'all',
  currentRegion = 'all',
  currentOwnership = 'all',
}) => {
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSaveCurrentForm, setShowSaveCurrentForm] = useState(false);
  const [newSearchName, setNewSearchName] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const t = {
    en: {
      title: 'Saved Searches & Custom Filters',
      subtitle: 'Quickly access and re-run your frequent machinery searches across Tanzania.',
      noSaved: 'No saved searches yet. Save your current filter setup to re-run it with one click anytime.',
      saveCurrentBtn: 'Save Current Filters',
      saveFormTitle: 'Name this search setup',
      namePlaceholder: 'e.g., Arusha Tractors, Dar Generators...',
      saveSubmit: 'Save Search',
      cancel: 'Cancel',
      apply: 'Apply Filter',
      deleteTooltip: 'Delete saved search',
      keyword: 'Keyword',
      category: 'Category',
      region: 'Region',
      fleet: 'Fleet',
      allFleet: 'All Fleets',
      companyFleet: 'RENTZ Fleet',
      thirdPartyFleet: 'Verified Owners',
      anyCategory: 'All Categories',
      anyRegion: 'All Tanzania',
    },
    sw: {
      title: 'Utafutaji Uliohifadhiwa',
      subtitle: 'Fungua kwa urahisi vichujio vyako vya mara kwa mara vya mitambo kote Tanzania.',
      noSaved: 'Bado hujaweka utafutaji wowote. Hifadhi vichujio vyako vya sasa kwa kubofya mara moja.',
      saveCurrentBtn: 'Hifadhi Vichujio vya Sasa',
      saveFormTitle: 'Taja mpangilio huu wa utafutaji',
      namePlaceholder: 'mfano Matrekta Arusha, Jenereta Dar...',
      saveSubmit: 'Hifadhi Utafutaji',
      cancel: 'Ghairi',
      apply: 'Tumia Kichujio',
      deleteTooltip: 'Futa utafutaji huu',
      keyword: 'Neno kuu',
      category: 'Kundi',
      region: 'Mkoa',
      fleet: 'Meli',
      allFleet: 'Meli Zote',
      companyFleet: 'RENTZ Fleet',
      thirdPartyFleet: 'Wamiliki Binafsi',
      anyCategory: 'Makundi Yote',
      anyRegion: 'Tanzania Nzima',
    },
    fr: {
      title: 'Recherches Enregistrées',
      subtitle: 'Accédez rapidement et relancez vos filtres de matériel favoris en Tanzanie.',
      noSaved: 'Aucune recherche enregistrée. Enregistrez votre configuration actuelle pour la relancer en un clic.',
      saveCurrentBtn: 'Enregistrer les Filtres Actuels',
      saveFormTitle: 'Nommez cette configuration de recherche',
      namePlaceholder: 'ex. Tracteurs Arusha, Générateurs Dar...',
      saveSubmit: 'Enregistrer',
      cancel: 'Annuler',
      apply: 'Appliquer le Filtre',
      deleteTooltip: 'Supprimer cette recherche',
      keyword: 'Mot-clé',
      category: 'Catégorie',
      region: 'Région',
      fleet: 'Flotte',
      allFleet: 'Toutes les Flottes',
      companyFleet: 'Flotte RENTZ',
      thirdPartyFleet: 'Propriétaires Vérifiés',
      anyCategory: 'Toutes Catégories',
      anyRegion: 'Toute la Tanzanie',
    },
  }[language];

  const loadSearches = async () => {
    setLoading(true);
    try {
      const data = await fetchSavedSearches();
      setSavedSearches(data);
    } catch (err) {
      console.error('Failed to load saved searches', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadSearches();
      setErrorMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentCategoryObj = categories.find((c) => c.id === currentCategoryId);
  const currentCategoryName =
    currentCategoryObj
      ? language === 'sw'
        ? currentCategoryObj.nameSwahili
        : language === 'fr'
        ? currentCategoryObj.nameFrench || currentCategoryObj.name
        : currentCategoryObj.name
      : undefined;

  const handleSaveCurrent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSearchName.trim()) {
      setErrorMsg('Please give your search a title');
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    try {
      const saved = await createSavedSearch({
        name: newSearchName.trim(),
        query: currentQuery || undefined,
        categoryId: currentCategoryId !== 'all' ? currentCategoryId : undefined,
        categoryName: currentCategoryName,
        region: currentRegion !== 'all' ? currentRegion : undefined,
        ownershipFilter: currentOwnership,
      });
      setSavedSearches([saved, ...savedSearches]);
      setNewSearchName('');
      setShowSaveCurrentForm(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSavedSearch(id);
      setSavedSearches(savedSearches.filter((s) => s.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-xl w-full border border-stone-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-900">
              <Bookmark className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-stone-900 tracking-tight">{t.title}</h3>
              <p className="text-xs text-stone-500 mt-0.5">{t.subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Quick Save Current Bar */}
          {!showSaveCurrentForm ? (
            <button
              onClick={() => setShowSaveCurrentForm(true)}
              className="w-full p-3 rounded-xl border border-dashed border-amber-300 bg-amber-50/50 hover:bg-amber-50 text-amber-900 flex items-center justify-between text-xs font-semibold transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                <span>{t.saveCurrentBtn}</span>
              </div>
              <span className="text-[11px] text-amber-700 font-mono">
                {currentQuery ? `"${currentQuery}"` : ''}{' '}
                {currentRegion !== 'all' ? `· ${currentRegion}` : ''}
              </span>
            </button>
          ) : (
            <form onSubmit={handleSaveCurrent} className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">{t.saveFormTitle}</h4>
                <button
                  type="button"
                  onClick={() => setShowSaveCurrentForm(false)}
                  className="text-stone-400 hover:text-stone-700 text-xs cursor-pointer"
                >
                  {t.cancel}
                </button>
              </div>

              <input
                type="text"
                value={newSearchName}
                onChange={(e) => setNewSearchName(e.target.value)}
                placeholder={t.namePlaceholder}
                autoFocus
                className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-600 text-stone-900"
              />

              <div className="flex flex-wrap gap-2 text-[11px] text-stone-500">
                {currentQuery && (
                  <span className="px-2 py-0.5 bg-white border border-stone-200 rounded">
                    {t.keyword}: <strong>{currentQuery}</strong>
                  </span>
                )}
                {currentCategoryId !== 'all' && currentCategoryName && (
                  <span className="px-2 py-0.5 bg-white border border-stone-200 rounded">
                    {t.category}: <strong>{currentCategoryName}</strong>
                  </span>
                )}
                {currentRegion !== 'all' && (
                  <span className="px-2 py-0.5 bg-white border border-stone-200 rounded">
                    {t.region}: <strong>{currentRegion}</strong>
                  </span>
                )}
                {currentOwnership !== 'all' && (
                  <span className="px-2 py-0.5 bg-white border border-stone-200 rounded">
                    {t.fleet}:{' '}
                    <strong>
                      {currentOwnership === 'company' ? t.companyFleet : t.thirdPartyFleet}
                    </strong>
                  </span>
                )}
              </div>

              {errorMsg && <p className="text-xs text-red-600">{errorMsg}</p>}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowSaveCurrentForm(false)}
                  className="px-3 py-1.5 text-xs text-stone-600 hover:text-stone-900 cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{t.saveSubmit}</span>
                </button>
              </div>
            </form>
          )}

          {/* List of Saved Searches */}
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-amber-700" />
            </div>
          ) : savedSearches.length === 0 ? (
            <div className="text-center py-10 px-4 bg-stone-50 rounded-xl border border-stone-200">
              <Bookmark className="w-8 h-8 text-stone-300 mx-auto mb-2" />
              <p className="text-xs text-stone-500 max-w-sm mx-auto leading-relaxed">{t.noSaved}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {savedSearches.map((search) => (
                <div
                  key={search.id}
                  className="p-4 bg-white rounded-xl border border-stone-200 hover:border-amber-300 hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  <div className="space-y-1.5">
                    <h4 className="text-sm font-bold text-stone-900 group-hover:text-amber-800 transition-colors">
                      {search.name}
                    </h4>

                    {/* Filter Badges */}
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                      {search.query && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-stone-100 text-stone-700 rounded font-medium">
                          <Search className="w-3 h-3 text-stone-400" />
                          <span>{search.query}</span>
                        </span>
                      )}

                      {search.categoryId && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-900 rounded font-medium border border-amber-200">
                          <Layers className="w-3 h-3 text-amber-700" />
                          <span>{search.categoryName || search.categoryId}</span>
                        </span>
                      )}

                      {search.region && search.region !== 'all' && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-stone-100 text-stone-700 rounded font-medium">
                          <MapPin className="w-3 h-3 text-stone-400" />
                          <span>{search.region}</span>
                        </span>
                      )}

                      {search.ownershipFilter && search.ownershipFilter !== 'all' && (
                        <span className="px-2 py-0.5 bg-stone-100 text-stone-700 rounded font-medium">
                          {search.ownershipFilter === 'company' ? t.companyFleet : t.thirdPartyFleet}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      onClick={() => handleDelete(search.id)}
                      className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title={t.deleteTooltip}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => {
                        onApplySearch(search);
                        onClose();
                      }}
                      className="px-3.5 py-1.5 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                    >
                      <span>{t.apply}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
