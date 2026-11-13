import React, { useState } from 'react';
import { Booking } from '../types/index.js';
import { formatTZS, formatDate } from '../utils/formatters.js';
import {
  X,
  Printer,
  FileText,
  Receipt,
  Truck,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  Share2,
  ExternalLink,
  Building2,
  Scale,
} from 'lucide-react';

interface DocumentPreviewModalProps {
  booking: Booking | null;
  initialTab?: 'contract' | 'gatepass';
  onClose: () => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  booking,
  initialTab = 'contract',
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'contract' | 'gatepass'>(initialTab);

  if (!booking) return null;

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(
    `${window.location.origin}/?booking=${booking.bookingCode}&token=${booking.qrHandoverToken}`
  )}`;
  const isAccepted = booking.status !== 'requested' && booking.status !== 'draft' && booking.status !== 'cancelled';

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppShare = () => {
    const docLabel =
      activeTab === 'contract'
        ? 'Equipment Hire Contract'
        : `Official Yard Gate Pass (${booking.qrHandoverToken})`;
    const shareLink = `${window.location.origin}/?booking=${booking.bookingCode}`;
    const text = `RENTZ Official ${docLabel}\nBooking: ${booking.bookingCode}\nAsset: ${booking.assetTitle}\nEstimated hire (settled with owner): ${formatTZS(
      booking.priceBreakdown.estimatedTotal
    )}\nVerify / View: ${shareLink}`;
    const targetPhone = (booking.renterPhone || '255793481147').replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${targetPhone}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/75 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-stone-200 max-w-4xl w-full shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Top Action Bar (Hidden when printing) */}
        <div className="bg-stone-900 text-white px-5 py-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-amber-600 flex items-center justify-center font-black text-stone-950">
              RT
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">
                RENTZ Official Document & Print Center
              </h2>
              <p className="text-[11px] text-stone-400 font-mono">
                {booking.bookingCode} • {booking.assetTitle}
              </p>
            </div>
          </div>

          {/* Document Type Switcher */}
          <div className="flex items-center bg-stone-800 p-1 rounded-xl border border-stone-700">
            <button
              onClick={() => setActiveTab('contract')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'contract'
                  ? 'bg-amber-600 text-white'
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Hire Contract
            </button>
            <button
              onClick={() => setActiveTab('gatepass')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'gatepass'
                  ? 'bg-amber-600 text-white'
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              Gate Pass & Waybill
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleWhatsAppShare}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              WhatsApp
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white text-stone-900 hover:bg-stone-100 text-xs font-bold transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-6 sm:p-10 overflow-y-auto space-y-6 bg-white text-stone-900">
          {/* Official Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b-2 border-stone-900">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded bg-stone-900 text-amber-400 font-black text-xs tracking-wider">
                  RENTZ TANZANIA
                </span>
              </div>
              <h1 className="text-2xl font-black text-stone-900 mt-2 uppercase tracking-tight">
                {activeTab === 'contract' && 'Equipment & Plant Hire Agreement'}
                {activeTab === 'gatepass' && 'Official Depot Gate Pass & Transit Waybill'}
              </h1>
              <p className="text-xs text-stone-600 mt-0.5">
                Nyerere Road Industrial Area, Plot 44, Dar es Salaam • Tel: 255793481147 / 255743801992 • Email: safarigoodluck35@gmail.com
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right font-mono">
                <div className="text-xs text-stone-500">BOOKING REF</div>
                <div className="text-sm font-black text-stone-900">{booking.bookingCode}</div>
                <div className="text-[11px] text-stone-500 mt-1">
                  Issued: {formatDate(booking.createdAt)}
                </div>
                <div className="inline-block mt-1 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold uppercase">
                  {isAccepted ? 'ACCEPTED BY OWNER' : 'AWAITING OWNER ACCEPTANCE'}
                </div>
              </div>
              <img
                src={qrImageUrl}
                alt="Verification QR"
                className="w-20 h-20 rounded-lg border border-stone-200 p-1 bg-white"
              />
            </div>
          </div>

          {/* Parties Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-stone-50 p-4 rounded-xl border border-stone-200 text-xs">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                Equipment Owner / Lessor
              </div>
              <div className="font-bold text-stone-900 text-sm">{booking.ownerName}</div>
              <div className="text-stone-600 mt-0.5">
                Ownership Mode:{' '}
                <span className="font-semibold">
                  {booking.ownershipType === 'company'
                    ? 'RENTZ Direct Fleet Inventory'
                    : 'Verified Partner Fleet'}
                </span>
              </div>
              {booking.ownerPhone && (
                <div className="text-stone-600 font-mono mt-0.5">Tel: {booking.ownerPhone}</div>
              )}
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                Hirer / Customer (Lessee)
              </div>
              <div className="font-bold text-stone-900 text-sm">{booking.renterName}</div>
              <div className="text-stone-600 font-mono mt-0.5">Tel: {booking.renterPhone}</div>
              <div className="text-stone-600 mt-0.5">
                Site / Delivery: {booking.deliveryAddress || 'Self-Collection at Designated Depot'}
              </div>
            </div>
          </div>

          {/* TAB 1: HIRE CONTRACT */}
          {activeTab === 'contract' && (
            <div className="space-y-5 text-xs leading-relaxed text-stone-700">
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4">
                <div className="flex items-center gap-2 font-bold text-amber-950 text-sm mb-2">
                  <Scale className="w-4 h-4 text-amber-700" />
                  1. Schedule of Hired Equipment & Duration
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-stone-500 block">Equipment Title</span>
                    <span className="font-bold text-stone-900">{booking.assetTitle}</span>
                  </div>
                  <div>
                    <span className="text-stone-500 block">Hire Period</span>
                    <span className="font-bold text-stone-900 font-mono">
                      {formatDate(booking.startDate)} → {formatDate(booking.endDate)}
                    </span>
                  </div>
                  <div>
                    <span className="text-stone-500 block">Billable Duration</span>
                    <span className="font-bold text-stone-900 font-mono">
                      {booking.billableUnits} {booking.rentalUnit}(s)
                    </span>
                  </div>
                  <div>
                    <span className="text-stone-500 block">Estimated Hire</span>
                    <span className="font-bold text-emerald-800 uppercase font-mono">
                      {formatTZS(booking.priceBreakdown.estimatedTotal)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5">
                <h3 className="font-bold text-stone-900 uppercase text-xs tracking-wider">
                  2. Statutory Terms & Conditions (Law of Contract Act, Cap. 345 R.E. 2019)
                </h3>
                <p>
                  <strong>2.1 Hire Charges & Settlement:</strong> The hire charges, any deposit, delivery costs and any repair costs are agreed and settled directly between the Lessor and the Lessee. RENTZ is a free booking platform and does not collect, hold or transfer any money under this agreement.
                </p>
                <p>
                  <strong>2.2 Equipment Care & Maintenance Responsibility:</strong> The Lessee is responsible for daily lubrication, safe operation, and site security throughout the hire duration. Any physical damage or missing accessories noted during inward return inspection is recorded by RENTZ for both parties to resolve.
                </p>
                <p>
                  <strong>2.3 Handover & Return Protocol:</strong> Both outward dispatch and inward return must be logged via the RENTZ Field Operations Concentrated Inspection Form using QR Token{' '}
                  <span className="font-mono font-bold">{booking.qrHandoverToken}</span>.
                </p>
              </div>

              {/* Signatures Block */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-stone-200">
                <div className="p-4 rounded-xl border border-stone-200 bg-stone-50">
                  <div className="text-[10px] font-bold uppercase text-stone-400">
                    Digitally Signed by Hirer / Lessee
                  </div>
                  <div className="font-serif italic text-lg font-bold text-stone-900 mt-2">
                    {booking.renterName}
                  </div>
                  <div className="text-[11px] font-mono text-stone-500 mt-1">
                    Timestamp: {booking.signedAt ? new Date(booking.signedAt).toLocaleString() : new Date(booking.createdAt).toLocaleString()}
                  </div>
                </div>
                <div className="p-4 rounded-xl border border-stone-200 bg-stone-50">
                  <div className="text-[10px] font-bold uppercase text-stone-400">
                    Countersigned by Owner
                  </div>
                  <div className="font-serif italic text-lg font-bold text-stone-900 mt-2">
                    {booking.ownerName}
                  </div>
                  <div className="text-[11px] font-mono text-emerald-700 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Binding Digital Contract Active
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GATE PASS & WAYBILL */}
          {activeTab === 'gatepass' && (
            <div className="space-y-5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl border border-stone-200 bg-stone-50">
                  <div className="text-[10px] font-bold uppercase text-stone-400">QR Handover Token</div>
                  <div className="font-mono font-black text-sm text-stone-900 mt-1">
                    {booking.qrHandoverToken}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl border border-stone-200 bg-stone-50">
                  <div className="text-[10px] font-bold uppercase text-stone-400">Logistics Mode</div>
                  <div className="font-bold text-sm text-stone-900 mt-1">
                    {booking.deliveryRequired ? `Go & Return Site Delivery (${booking.deliveryDistanceKm || 5} km)` : 'Self-Collection at Yard'}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl border border-stone-200 bg-stone-50">
                  <div className="text-[10px] font-bold uppercase text-stone-400">Gate Clearance Status</div>
                  <div className="font-bold text-sm text-emerald-700 mt-1 uppercase">
                    {isAccepted ? 'CLEARED FOR DISPATCH' : 'HOLD — AWAITING OWNER ACCEPTANCE'}
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-stone-200 space-y-2">
                <div className="font-bold text-stone-900 uppercase text-xs">
                  Mandatory Yard Security & Field Ops Checklist
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-stone-700">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Physical, structural & surface integrity verified</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Engine hours / odometer / piece count logged</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>100% accessories, cables & safety guards checked</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Booking accepted by owner & digital hire contract verified</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-stone-200">
                <div className="border border-dashed border-stone-300 rounded-xl p-3.5">
                  <div className="text-[10px] font-bold uppercase text-stone-400">Depot Yard Officer</div>
                  <div className="h-8 border-b border-stone-300 mt-2"></div>
                  <div className="text-[10px] text-stone-500 mt-1">Name, Stamp & Time Out</div>
                </div>
                <div className="border border-dashed border-stone-300 rounded-xl p-3.5">
                  <div className="text-[10px] font-bold uppercase text-stone-400">Dispatch Driver / Carrier</div>
                  <div className="h-8 border-b border-stone-300 mt-2"></div>
                  <div className="text-[10px] text-stone-500 mt-1">Vehicle Plate & Signature</div>
                </div>
                <div className="border border-dashed border-stone-300 rounded-xl p-3.5">
                  <div className="text-[10px] font-bold uppercase text-stone-400">Customer / Site Receiver</div>
                  <div className="h-8 border-b border-stone-300 mt-2"></div>
                  <div className="text-[10px] text-stone-500 mt-1">Received in Good Order</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
