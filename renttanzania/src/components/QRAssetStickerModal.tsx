import React, { useState } from 'react';
import { Asset } from '../types/index.js';
import { formatTZS } from '../utils/formatters.js';
import { X, QrCode, Copy, Check, Printer, Share2, MapPin, ShieldCheck } from 'lucide-react';

interface QRAssetStickerModalProps {
  asset: Asset | null;
  onClose: () => void;
}

export const QRAssetStickerModal: React.FC<QRAssetStickerModalProps> = ({ asset, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!asset) return null;

  const shareUrl = `${window.location.origin}/?asset=${encodeURIComponent(asset.id)}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(shareUrl)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleWhatsAppShare = () => {
    const text = `Hire "${asset.title}" (${asset.location.district}, ${asset.location.region}) on RENTZ Tanzania!\nRate: ${formatTZS(
      asset.pricing.ratePerDay
    )}/day\nBook or inspect specs: ${shareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/75 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl border border-stone-200 max-w-md w-full shadow-2xl overflow-hidden">
        <div className="bg-stone-900 text-white px-5 py-4 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold">Public Share Link & QR Asset Tag</h3>
          </div>
          <button onClick={onClose} className="p-1 text-stone-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Weatherproof Printable Sticker Card */}
          <div className="border-2 border-stone-900 rounded-2xl p-5 bg-stone-50 text-center space-y-3">
            <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-wider text-stone-600 border-b border-stone-200 pb-2">
              <span>RENTZ EQUIPMENT ASSET TAG</span>
              <span className="text-amber-700">ID: {asset.id.toUpperCase()}</span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-stone-200 inline-block mx-auto shadow-2xs">
              <img src={qrUrl} alt={asset.title} className="w-40 h-40 mx-auto" />
            </div>

            <div>
              <h4 className="font-black text-stone-900 text-base leading-snug">{asset.title}</h4>
              <p className="text-xs text-stone-600 flex items-center justify-center gap-1 mt-1">
                <MapPin className="w-3.5 h-3.5 text-amber-600" />
                {asset.location.district}, {asset.location.region} • {formatTZS(asset.pricing.ratePerDay)}/day
              </p>
            </div>

            <div className="bg-stone-900 text-white py-1.5 px-3 rounded-lg text-[10px] font-mono flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              SCAN FOR INSTANT BOOKING OR YARD HANDOVER
            </div>
          </div>

          {/* Public Deep Link Copy Box */}
          <div className="space-y-1.5 print:hidden">
            <label className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
              Direct Listing Share URL
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="w-full px-3 py-2 text-xs font-mono bg-stone-100 border border-stone-300 rounded-lg text-stone-700"
              />
              <button
                onClick={handleCopy}
                className="px-3 py-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold flex items-center gap-1.5 shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2.5 print:hidden">
            <button
              onClick={handleWhatsAppShare}
              className="flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors"
            >
              <Share2 className="w-4 h-4" />
              Share on WhatsApp
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print Asset Sticker
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
