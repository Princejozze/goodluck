import React from 'react';
import { Asset, AppLanguage } from '../types/index.js';
import { formatTZS } from '../utils/formatters.js';
import { MapPin, ShieldCheck, CheckCircle2, Star, UserCheck } from 'lucide-react';

interface AssetCardProps {
  asset: Asset;
  onSelect: (asset: Asset) => void;
  language: AppLanguage;
}

export const AssetCard: React.FC<AssetCardProps> = ({ asset, onSelect, language }) => {
  const isCompany = asset.ownershipType === 'company';
  const isOrdinary = asset.ownerTier === 'ordinary' || (!asset.isVerifiedOwner && asset.ownerTier !== 'verified');
  const displayImage = asset.images && asset.images.length > 0 ? asset.images[0] : '/src/assets/images/hero_equipment_fleet_1792692516554.jpg';

  // Key specifications summary for clean unboxed metadata
  const specKeys = Object.keys(asset.specifications || {}).slice(0, 2);
  const specText = specKeys.map((k) => asset.specifications[k]).join(' · ');

  return (
    <div
      onClick={() => onSelect(asset)}
      className="group flex flex-col bg-white rounded-xl border border-stone-200 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
    >
      {/* 65-70% image aspect container */}
      <div className="relative aspect-4/3 w-full bg-stone-100 overflow-hidden">
        <img
          src={displayImage}
          alt={asset.title}
          className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
          referrerPolicy="no-referrer"
          loading="lazy"
          onError={(e) => {
            // Zero-broken image policy fallback
            (e.target as HTMLImageElement).src = '/src/assets/images/hero_equipment_fleet_1792692516554.jpg';
          }}
        />

        {/* Quiet ownership badge (single subtle tag, not pill spam) */}
        <div className="absolute top-3 left-3">
          {isCompany ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold bg-stone-900/90 text-white backdrop-blur-xs rounded-md shadow-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>RENTZ Fleet</span>
            </span>
          ) : isOrdinary ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium bg-stone-100/95 text-stone-700 backdrop-blur-xs rounded-md shadow-xs border border-stone-300/80">
              <UserCheck className="w-3.5 h-3.5 text-stone-500" />
              <span>Ordinary Owner</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold bg-amber-50/95 text-amber-900 backdrop-blur-xs rounded-md shadow-xs border border-amber-300">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
              <span>Verified Owner</span>
            </span>
          )}
        </div>

        {/* Quick location tag */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-[11px]">
          <span className="flex items-center gap-1 bg-stone-950/70 backdrop-blur-xs px-2 py-0.5 rounded text-stone-200">
            <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
            <span className="truncate max-w-[150px]">{asset.location.district}, {asset.location.region}</span>
          </span>
          {asset.rating > 0 && (
            <span className="flex items-center gap-1 bg-stone-950/70 backdrop-blur-xs px-2 py-0.5 rounded font-mono text-amber-300">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span>{asset.rating.toFixed(1)}</span>
            </span>
          )}
        </div>
      </div>

      {/* Card Content Area */}
      <div className="flex flex-col flex-1 p-4">
        {/* Unboxed clean metadata with subtle dot separators */}
        <div className="flex items-center gap-2 text-xs text-stone-500 mb-1.5">
          <span className="capitalize">{asset.condition} condition</span>
          {specText && (
            <>
              <span aria-hidden="true">·</span>
              <span className="truncate">{specText}</span>
            </>
          )}
        </div>

        {/* Title */}
        <h3 className="text-sm sm:text-base font-bold text-stone-900 line-clamp-2 leading-snug group-hover:text-amber-800 transition-colors">
          {asset.title}
        </h3>

        {/* Owner credit */}
        <p className="mt-1 text-xs text-stone-500 truncate">
          {isCompany ? 'Maintained by RENTZ Direct Fleet' : `Owner: ${asset.ownerName}`}
        </p>

        {/* Pricing & CTA Baseline */}
        <div className="mt-auto pt-4 border-t border-stone-100 flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] text-stone-400 uppercase tracking-wider font-medium">Rental Rate</p>
            <p className="text-base sm:text-lg font-extrabold text-stone-900 font-mono tabular-nums">
              {formatTZS(asset.pricing.ratePerDay)}
              <span className="text-xs font-normal text-stone-500 font-sans"> / day</span>
            </p>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect(asset);
            }}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 active:bg-amber-900 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-xs cursor-pointer"
          >
            {language === 'sw' ? 'Kodisha' : language === 'fr' ? 'Louer' : 'Hire Gear'}
          </button>
        </div>
      </div>
    </div>
  );
};
