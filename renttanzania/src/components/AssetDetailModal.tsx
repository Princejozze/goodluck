import React, { useState, useEffect } from 'react';
import { Asset, PriceBreakdown, RentalUnit, User, AppLanguage } from '../types/index.js';
import { calculatePrice } from '../services/api.js';
import { computePriceBreakdown, getRequiredVehicleClass, isHeavyMachineryAsset } from '../../server/pricingEngine.ts';
import { formatTZS } from '../utils/formatters.js';
import {
  X,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Truck,
  Wrench,
  AlertTriangle,
  Info,
  Check,
  FileText,
  Clock,
  ArrowRight,
  Loader2,
  UserCheck,
  Lock,
  LogIn,
  QrCode,
  Radio,
} from 'lucide-react';
import { GoogleMapsDestinationInput } from './GoogleMapsDestinationInput.js';


interface AssetDetailModalProps {
  asset: Asset | null;
  onClose: () => void;
  currentUser: User | null;
  onBookSuccess: (booking: any) => void;
  onRequireLogin: () => void;
  onOpenQRSticker?: (asset: Asset) => void;
  language: AppLanguage;
}

export const AssetDetailModal: React.FC<AssetDetailModalProps> = ({
  asset,
  onClose,
  currentUser,
  onBookSuccess,
  onRequireLogin,
  onOpenQRSticker,
  language,
}) => {
  if (!asset) return null;

  // Defaults: tomorrow for at least minimumRentalDays (or 3 days)
  const minRentalDays = Math.max(1, asset.pricing.minimumRentalDays || 1);
  const defaultDurationDays = Math.max(3, minRentalDays);
  const today = new Date();
  const defaultStart = new Date(today);
  defaultStart.setDate(defaultStart.getDate() + 2);
  const defaultEnd = new Date(defaultStart);
  defaultEnd.setDate(defaultEnd.getDate() + defaultDurationDays);

  const [startDate, setStartDate] = useState(defaultStart.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(defaultEnd.toISOString().split('T')[0]);
  const [rentalUnit, setRentalUnit] = useState<RentalUnit>('day');
  const [deliveryRequired, setDeliveryRequired] = useState(false);
  const [deliveryDistanceKm, setDeliveryDistanceKm] = useState<number>(1);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [operatorRequired, setOperatorRequired] = useState(false);
  const [customerName, setCustomerName] = useState(currentUser?.name || '');
  const [customerPhone, setCustomerPhone] = useState(currentUser?.phone || '+255 ');
  const [renterNotes, setRenterNotes] = useState('');
  const [contractAgreed, setContractAgreed] = useState(true);
  const [savedBooking, setSavedBooking] = useState<any | null>(null);
  const [whatsappNotified, setWhatsappNotified] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setCustomerName((prev) => prev || currentUser.name || '');
      setCustomerPhone((prev) =>
        !prev || prev === '+255 ' ? currentUser.phone || '+255 700 000 000' : prev
      );
    }
  }, [currentUser]);

  // Price breakdown state initialized immediately with deterministic RENTZ calculation logic
  const [breakdown, setBreakdown] = useState<PriceBreakdown>(() =>
    computePriceBreakdown(asset, defaultStart.toISOString().split('T')[0], defaultEnd.toISOString().split('T')[0], {
      rentalUnit: 'day',
      deliveryRequired: asset.deliveryOptions.deliveryAvailable,
      deliveryDistanceKm: 1,
      operatorRequired: false,
    })
  );
  const [hasConflict, setHasConflict] = useState(false);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Active photo gallery index
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  // Recalculate price whenever options change (instant local calculation + server engine verification)
  useEffect(() => {
    if (!startDate || !endDate) return;

    // Immediate deterministic calculation so UI never lags or loses breakdown offline
    const localBreakdown = computePriceBreakdown(asset, startDate, endDate, {
      rentalUnit,
      deliveryRequired,
      deliveryDistanceKm,
      operatorRequired,
    });
    setBreakdown(localBreakdown);

    let isCancelled = false;
    async function updateQuotation() {
      setIsCalculating(true);
      setErrorMsg(null);
      try {
        const res = await calculatePrice({
          assetId: asset!.id,
          startDate,
          endDate,
          rentalUnit,
          deliveryRequired,
          deliveryDistanceKm,
          operatorRequired,
        });
        if (!isCancelled) {
          setBreakdown(res.breakdown);
          setHasConflict(res.hasConflict);
          setConflictMessage(res.conflictMessage);
        }
      } catch (err: any) {
        // Keep localBreakdown active if network/server is unreachable
        if (!isCancelled) {
          setBreakdown(localBreakdown);
        }
      } finally {
        if (!isCancelled) setIsCalculating(false);
      }
    }

    updateQuotation();
    return () => {
      isCancelled = true;
    };
  }, [asset, startDate, endDate, rentalUnit, deliveryRequired, deliveryDistanceKm, operatorRequired]);

  const handleBookingSubmit = async () => {
    if (isSubmitting || savedBooking) return;
    if (!currentUser) {
      onRequireLogin();
      return;
    }
    if (hasConflict) {
      setErrorMsg('Cannot request booking: Equipment is booked for overlapping dates in Firestore.');
      return;
    }
    if (!startDate || !endDate || new Date(endDate) < new Date(startDate)) {
      setErrorMsg('Please select a valid Start Date and Scheduled Return Date.');
      return;
    }
    const cleanName = (customerName || currentUser.name || '').trim();
    const cleanPhone = (customerPhone || currentUser.phone || '').trim();
    if (!cleanName) {
      setErrorMsg('Please enter your Customer Full Name for the hire contract.');
      return;
    }
    if (cleanPhone.length < 6) {
      setErrorMsg('Please enter a valid Phone / WhatsApp number (e.g. +255 7XX XXX XXX).');
      return;
    }
    if (deliveryRequired && deliveryAddress.trim().length < 5) {
      setErrorMsg('Please enter the site address for delivery, or untick delivery to collect the equipment yourself.');
      return;
    }
    if (!contractAgreed) {
      setErrorMsg('Please review and accept the RentTanzania Equipment Rental Agreement terms.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const { createBooking } = await import('../services/api.js');
      const combinedNotes = renterNotes.trim()
        ? `${renterNotes.trim()} | Customer: ${cleanName}`
        : `Customer: ${cleanName}`;

      const booking = await createBooking({
        assetId: asset.id,
        startDate,
        endDate,
        rentalUnit,
        deliveryRequired,
        deliveryDistanceKm: deliveryRequired ? deliveryDistanceKm : undefined,
        deliveryAddress: deliveryRequired ? deliveryAddress : undefined,
        operatorRequired,
        notes: combinedNotes,
        customerName: cleanName,
        customerPhone: cleanPhone,
      });
      setSavedBooking(booking);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit rental request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getWhatsAppConfirmationUrl = (bookingObj: any) => {
    const refCode = bookingObj?.bookingCode || 'RT-2026';
    const text = [
      `Habari RENTZ Dispatch (+255793481147),`,
      `I have submitted a new equipment booking on RENTZ:`,
      `• Booking Reference: ${refCode}`,
      `• Equipment: ${asset.title} (${asset.serialNumber || asset.id})`,
      `• Customer: ${bookingObj?.customerName || customerName || currentUser?.name} (${bookingObj?.customerPhone || customerPhone || currentUser?.phone})`,
      `• Dates: ${startDate} to ${endDate} (${breakdown.billableUnits} ${breakdown.rentalUnit}(s))`,
      `• Delivery: ${deliveryRequired ? `${deliveryAddress} (${deliveryDistanceKm} km)` : 'Self-Pickup at Depot'}`,
      `• Estimated hire (settled with owner): ${formatTZS(breakdown.estimatedTotal)}`,
    ].join('\n');
    return `https://wa.me/255793481147?text=${encodeURIComponent(text)}`;
  };

  const isCompany = asset.ownershipType === 'company';
  const resolvedWeight = asset.weightKg || breakdown?.equipmentWeightKg || 25;
  const requiredVehicleClass = getRequiredVehicleClass(resolvedWeight);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50/80">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="text-xs uppercase font-mono tracking-wider text-stone-500">
              {asset.id}
            </span>
            {asset.qrCodeId && (
              <>
                <span aria-hidden="true" className="text-stone-300">·</span>
                <span className="text-[11px] font-mono text-stone-500">
                  {asset.qrCodeId}
                </span>
              </>
            )}
            <span aria-hidden="true" className="text-stone-300">·</span>
            {isCompany ? (
              <span className="flex items-center gap-1 text-xs font-semibold text-amber-800">
                <ShieldCheck className="w-3.5 h-3.5" />
                RENTZ Fleet Depot
              </span>
            ) : asset.ownerTier === 'ordinary' || (!asset.isVerifiedOwner && asset.ownerTier !== 'verified') ? (
              <span className="flex items-center gap-1 text-xs font-medium text-stone-700 bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                <UserCheck className="w-3.5 h-3.5 text-stone-500" />
                Owner: {asset.ownerName}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-300">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                Verified Owner (BRELA & TIN): {asset.ownerName}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onOpenQRSticker && (
              <button
                onClick={() => onOpenQRSticker(asset)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-amber-400 text-xs font-bold transition-colors cursor-pointer"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Share / QR Tag</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-6 space-y-6">
          {/* Top Section: Photo gallery & Title */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-6 space-y-2">
              <div className="aspect-4/3 w-full rounded-xl overflow-hidden bg-stone-100 border border-stone-200">
                <img
                  src={asset.images[activeImageIdx] || asset.images[0]}
                  alt={asset.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/src/assets/images/hero_equipment_fleet_1792692516554.jpg';
                  }}
                />
              </div>

              {asset.images.length > 1 && (
                <div className="flex gap-2">
                  {asset.images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIdx(idx)}
                      className={`w-16 h-12 rounded-lg overflow-hidden border-2 transition-colors cursor-pointer ${
                        activeImageIdx === idx ? 'border-amber-700' : 'border-stone-200 opacity-60'
                      }`}
                    >
                      <img src={img} alt="Thumbnail" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="md:col-span-6 flex flex-col justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 mb-1">
                  <MapPin className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span>
                    {asset.location.ward ? `${asset.location.ward}, ` : ''}
                    {asset.location.district}, {asset.location.region}
                    {asset.location.landmark ? ` (${asset.location.landmark})` : ''}
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl font-extrabold text-stone-900 leading-snug">
                  {asset.title}
                </h2>

                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-stone-500">
                  <span className="capitalize font-semibold text-stone-700">
                    Condition: {asset.condition}
                  </span>
                  <span>·</span>
                  <span>Min Hire: {asset.pricing.minimumRentalDays || 1} day(s)</span>
                  <span>·</span>
                  <span>Completed Hires: {asset.totalRentals}</span>
                  {asset.gpsTrackerUrl && (
                    <>
                      <span>·</span>
                      <a
                        href={asset.gpsTrackerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-amber-800 hover:underline font-semibold"
                      >
                        <Radio className="w-3 h-3" />
                        <span>GPS Tracker</span>
                      </a>
                    </>
                  )}
                </div>

                <p className="mt-2 text-xs sm:text-sm text-stone-600 leading-relaxed">
                  {asset.description}
                </p>
              </div>

              {/* Pricing Baseline Card with Rule-of-Thumb Asset Valuation Schema Fields */}
              <div className="mt-4 p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2.5">
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="text-[11px] text-stone-500 uppercase tracking-wider font-semibold">Standard Rate</p>
                    <p className="text-xl font-extrabold text-stone-900 font-mono tabular-nums">
                      {formatTZS(asset.pricing.ratePerDay)}
                      <span className="text-xs font-normal text-stone-500 font-sans"> / day</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-stone-500 uppercase tracking-wider font-semibold">Minimum Hire</p>
                    <p className="text-sm font-bold text-stone-700 font-mono tabular-nums">
                      {asset.pricing.minimumRentalDays || 1} day(s)
                    </p>
                  </div>
                </div>

                {/* Multi-Interval Rates set by the owner */}
                <div className="pt-2 border-t border-stone-200/80 grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-stone-400 block">Weekly Rate</span>
                    <span className="font-mono font-semibold text-stone-700">
                      {formatTZS(asset.pricing.ratePerWeek || asset.pricing.ratePerDay * 6)}
                    </span>
                  </div>
                  <div>
                    <span className="text-stone-400 block">Monthly Rate</span>
                    <span className="font-mono font-semibold text-stone-700">
                      {formatTZS(asset.pricing.ratePerMonth || asset.pricing.ratePerDay * 24)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Specifications & Accessories */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-stone-200">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-800 mb-3">
                Technical Specifications & Schema Metadata
              </h4>
              <dl className="space-y-2 text-xs">
                {Object.entries(asset.specifications || {}).map(([key, val]) => (
                  <div key={key} className="flex justify-between py-1 border-b border-stone-100">
                    <dt className="text-stone-500">{key}</dt>
                    <dd className="font-semibold text-stone-900 text-right font-mono">{val}</dd>
                  </div>
                ))}
                <div className="flex justify-between py-1 border-b border-stone-100">
                  <dt className="text-stone-500">Transport Weight Reference</dt>
                  <dd className="font-semibold text-amber-800 text-right font-mono">
                    {resolvedWeight} kg
                  </dd>
                </div>
                <div className="flex justify-between py-1 border-b border-stone-100">
                  <dt className="text-stone-500">Dispatch Vehicle Class</dt>
                  <dd className="font-semibold text-stone-800 text-right font-mono">
                    {requiredVehicleClass}
                  </dd>
                </div>
                <div className="flex justify-between py-1 border-b border-stone-100">
                  <dt className="text-stone-500">Serial / Asset ID</dt>
                  <dd className="font-semibold text-stone-900 font-mono">{asset.serialNumber || asset.id}</dd>
                </div>
              </dl>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-800 mb-3">
                Accessories & Safety Gear Included
              </h4>
              <ul className="space-y-2 text-xs">
                {asset.accessoriesIncluded.map((item, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-stone-700">
                    <Check className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Rental Duration & Options Configuration */}
          <div className="pt-4 border-t border-stone-200">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-800 mb-3">
              Rental Duration & Service Options
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Start Date</label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-stone-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Scheduled Return Date</label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-stone-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="date"
                    value={endDate}
                    min={startDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Billing Interval</label>
                <select
                  value={rentalUnit}
                  onChange={(e) => setRentalUnit(e.target.value as RentalUnit)}
                  className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-600 cursor-pointer"
                >
                  <option value="day">By Day (Standard)</option>
                  <option value="week">By Week (6x Daily Rate)</option>
                  <option value="month">By Month (24x Daily Rate)</option>
                  {asset.pricing.ratePerHour && <option value="hour">By Hour</option>}
                </select>
              </div>
            </div>

            {/* Delivery & Operator Options */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {asset.deliveryOptions.deliveryAvailable && (
                <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="deliveryToggle"
                    checked={deliveryRequired}
                    onChange={(e) => setDeliveryRequired(e.target.checked)}
                    className="mt-1 h-4 w-4 text-amber-700 rounded border-stone-300 focus:ring-amber-600 cursor-pointer"
                  />
                  <div className="text-xs flex-1">
                    <label htmlFor="deliveryToggle" className="font-semibold text-stone-900 cursor-pointer flex items-center justify-between">
                      <span>Go & Return Delivery</span>
                      <span className="font-mono font-bold text-amber-800">
                        {deliveryRequired ? 'Cost agreed with owner' : 'Yard Self-Pickup'}
                      </span>
                    </label>
                    <p className="text-stone-500 text-[11px] mt-0.5">
                      Dispatched from <span className="font-semibold text-stone-700">{asset.location.district}, {asset.location.region}</span> to your destination ({resolvedWeight} kg · {requiredVehicleClass}).
                    </p>
                    {deliveryRequired && (
                      <GoogleMapsDestinationInput
                        originAddress={`${asset.location.ward ? `${asset.location.ward}, ` : ''}${asset.location.district}, ${asset.location.region}`}
                        originCoords={asset.location.coordinates}
                        destinationAddress={deliveryAddress}
                        onDestinationChange={setDeliveryAddress}
                        onDistanceCalculated={setDeliveryDistanceKm}
                      />
                    )}
                  </div>
                </div>
              )}

              {asset.deliveryOptions.operatorAvailable && (
                <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="operatorToggle"
                    checked={operatorRequired}
                    onChange={(e) => setOperatorRequired(e.target.checked)}
                    className="mt-1 h-4 w-4 text-amber-700 rounded border-stone-300 focus:ring-amber-600 cursor-pointer"
                  />
                  <div className="text-xs flex-1">
                    <label htmlFor="operatorToggle" className="font-semibold text-stone-900 cursor-pointer flex items-center justify-between">
                      <span>Operator (supplied by the owner)</span>
                      <span className="font-mono text-stone-700">
                        {formatTZS(asset.deliveryOptions.operatorDailyRate || 30000)} / day
                      </span>
                    </label>
                    <p className="text-stone-500 text-[11px] mt-0.5">
                      RENTZ does not supply or vet operators. Ask the owner for the operator's licence and who is liable for site accidents.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Customer Name & Phone/WhatsApp Number (Saved to Firestore bookings collection) */}
            {currentUser && (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Customer Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Safari Goodluck"
                    className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Customer Phone / WhatsApp Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="e.g. +255 754 310 882"
                    className="w-full px-3 py-2 text-xs font-mono bg-white border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-600"
                  />
                </div>
              </div>
            )}

            {/* Renter Project / Site Notes (Booking.notes schema field) */}
            <div className="mt-3">
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Project / Site Handover Notes (Optional)
              </label>
              <input
                type="text"
                value={renterNotes}
                onChange={(e) => setRenterNotes(e.target.value)}
                placeholder="e.g. Site contact phone, gate clearance instructions, or preferred delivery hour..."
                className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-600"
              />
            </div>
          </div>

          {/* Conflict Warning Callout */}
          {hasConflict && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 flex items-start gap-3 text-xs">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Double-Booking Conflict Detected</p>
                <p className="text-amber-800 text-[11px] mt-0.5">
                  {conflictMessage || 'This asset is already booked and confirmed for overlapping dates. Please pick alternative dates.'}
                </p>
              </div>
            </div>
          )}

          {/* Transparent Live Price Breakdown */}
          {breakdown && (
            <div className="pt-4 border-t border-stone-200 bg-stone-50 -mx-6 -mb-6 p-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-800">
                  Estimated Hire Cost
                </h4>
                {isCalculating && <Loader2 className="w-3.5 h-3.5 animate-spin text-stone-400" />}
              </div>

              <div className="space-y-1.5 text-xs text-stone-600 border-b border-stone-200 pb-3">
                <div className="flex justify-between">
                  <span>
                    Rental ({breakdown.billableUnits} {breakdown.rentalUnit}(s) × {formatTZS(breakdown.rentalRate)})
                  </span>
                  <span className="font-semibold text-stone-900 font-mono tabular-nums">
                    {formatTZS(breakdown.rentalSubtotal)}
                  </span>
                </div>

                {breakdown.operatorFee > 0 && (
                  <div className="flex justify-between">
                    <span>Machine Operator</span>
                    <span className="font-semibold text-stone-900 font-mono tabular-nums">
                      {formatTZS(breakdown.operatorFee)}
                    </span>
                  </div>
                )}

                {deliveryRequired && (
                  <div className="flex justify-between">
                    <span>Go & Return Delivery ({breakdown.deliveryDistanceKm || deliveryDistanceKm} km)</span>
                    <span className="text-stone-500">Agreed with owner</span>
                  </div>
                )}
              </div>

              <div className="flex items-baseline justify-between pt-3">
                <div>
                  <p className="text-xs text-stone-500 font-medium">Estimated Total</p>
                  <p className="text-xs text-stone-400">Based on the owner's listed rates</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-extrabold text-stone-900 font-mono tabular-nums">
                    {formatTZS(breakdown.estimatedTotal)}
                  </p>
                </div>
              </div>

              <div className="mt-3 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-[11px] text-emerald-900">
                RENTZ is free to use. Nothing is paid in the app: you settle the hire directly with the owner after they accept your request.
                {isHeavyMachineryAsset(asset.categoryId, asset.weightKg) && (
                  <span className="block mt-1 text-amber-900">
                    Heavy plant: treat this as a starting estimate. Mobilisation, fuel, operator, site survey and any abnormal-load permit are agreed with the owner.
                  </span>
                )}
              </div>

              {/* Digital Contract Agreement */}
              {currentUser ? (
                <div className="mt-4 flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="contractCheckbox"
                    checked={contractAgreed}
                    onChange={(e) => setContractAgreed(e.target.checked)}
                    className="mt-0.5 h-4 w-4 text-amber-700 rounded border-stone-300 focus:ring-amber-600 cursor-pointer"
                  />
                  <label htmlFor="contractCheckbox" className="text-xs text-stone-600 cursor-pointer">
                    I agree to the <span className="underline font-medium text-stone-800">RENTZ Standard Hire Agreement</span> and to the handover and return inspections.
                  </label>
                </div>
              ) : (
                <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-300 flex items-start gap-2.5 text-xs text-amber-950">
                  <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">View-Only Mode Active</p>
                    <p className="text-[11px] text-amber-900 mt-0.5">
                      You can browse specifications and live quotations freely. To command a booking or reserve this equipment, please log in or create an account first.
                    </p>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {errorMsg && (
                <p className="mt-3 text-xs text-red-600 font-medium bg-red-50 p-2 rounded border border-red-200">
                  {errorMsg}
                </p>
              )}

              {/* Saved Booking Reference & WhatsApp Confirmation Banner */}
              {savedBooking ? (
                <div className="mt-4 p-4 bg-emerald-50 border border-emerald-300 rounded-xl space-y-3">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                    <div className="text-xs text-emerald-950">
                      <p className="font-extrabold text-sm">
                        Request sent to the owner! Reference: <span className="font-mono bg-white px-2 py-0.5 rounded border border-emerald-300">{savedBooking.bookingCode}</span>
                      </p>
                      <p className="text-[11px] text-emerald-800 mt-1">
                        Your request for <strong>{savedBooking.assetTitle}</strong> is waiting for the owner to accept. Once they accept, you will see their contact details in My Bookings.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                    <a
                      href={getWhatsAppConfirmationUrl(savedBooking)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition-colors"
                    >
                      <span>Send Booking Reference to WhatsApp (+255793481147)</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => onBookSuccess(savedBooking)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      <span>Go to My Bookings</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                /* Action Button */
                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 text-xs font-semibold text-stone-700 bg-white border border-stone-300 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                  {!currentUser ? (
                    <button
                      type="button"
                      onClick={onRequireLogin}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 px-5 text-xs sm:text-sm font-bold text-white bg-amber-700 hover:bg-amber-800 active:bg-amber-900 rounded-xl shadow-md transition-all cursor-pointer"
                    >
                      <LogIn className="w-4 h-4" />
                      <span>Log In or Sign Up to Book This Equipment</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={hasConflict || !contractAgreed || isSubmitting}
                      onClick={handleBookingSubmit}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-5 text-xs sm:text-sm font-bold text-white rounded-xl shadow-md transition-all cursor-pointer ${
                        hasConflict || !contractAgreed || isSubmitting
                          ? 'bg-stone-400 cursor-not-allowed'
                          : 'bg-amber-700 hover:bg-amber-800 active:bg-amber-900'
                      }`}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Sending Request...</span>
                        </>
                      ) : (
                        <>
                          <span>Send Booking Request to Owner</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
