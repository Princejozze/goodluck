import React, { useState, useEffect, useRef } from 'react';
import { Booking, InspectionRecord, User, AppLanguage, Category } from '../types/index.js';
import { fetchBookings, fetchAllInspections, recordInspection } from '../services/api.js';
import { formatDate } from '../utils/formatters.js';
import {
  CheckCircle2,
  QrCode,
  FileCheck,
  AlertTriangle,
  Loader2,
  ArrowUpRight,
  ArrowDownLeft,
  Upload,
  Columns2,
  PackageCheck,
  ShieldCheck,
  Layers,
  Truck,
  ClipboardCheck,
} from 'lucide-react';

interface OperationsViewProps {
  currentUser: User;
  language: AppLanguage;
  categories?: Category[];
  onOpenDocumentModal?: (booking: Booking, tab: 'contract' | 'gatepass') => void;
}

const UNIVERSAL_CATEGORIES = [
  {
    id: 'cat-construction',
    name: 'Construction & Plant Hire',
    metricHint: 'Engine Hours / Odometer & Diesel/Hydraulic Level',
    defaultMeter: '2,418.5 Operating Hrs',
    defaultPower: '100% Full Tank / Charged',
    defaultQty: '1 Machine + Standard Bucket',
  },
  {
    id: 'cat-agriculture',
    name: 'Agriculture & Farming',
    metricHint: 'PTO / Tractor Hours & Fuel / Implement Readiness',
    defaultMeter: '1,180.0 Tractor Hrs',
    defaultPower: '100% Full Tank / Charged',
    defaultQty: '1 Unit + Hitch & Disc Attachment',
  },
  {
    id: 'cat-events',
    name: 'Events & Hospitality',
    metricHint: 'Total Piece / Seat Count & Structural / Fabric Cleanliness',
    defaultMeter: '100% Piece Count Verified',
    defaultPower: 'N/A — Non-Powered / Structural / Decor',
    defaultQty: '1 Complete Event Kit / 100 Pcs',
  },
  {
    id: 'cat-transport',
    name: 'Transport & Logistics',
    metricHint: 'Odometer Reading (km) & Fuel Tank / Roadworthiness',
    defaultMeter: '64,210 km Odometer',
    defaultPower: '100% Full Tank / Charged',
    defaultQty: '1 Vehicle + Tie-Down Ratchet Set',
  },
  {
    id: 'cat-media',
    name: 'Media & Creative Production',
    metricHint: 'Battery Charge Cycles, Sensor/Optics & Pelican Cases',
    defaultMeter: '0 Dead Pixels / 42h Runtime',
    defaultPower: '100% Full Tank / Charged',
    defaultQty: '1 Camera Body + 2 V-Mount Batteries + Case',
  },
  {
    id: 'cat-office',
    name: 'Office & Technology',
    metricHint: 'Lamp/System Hours, Power Cables & Port Functionality',
    defaultMeter: '310 Lamp Hrs / Diagnostics OK',
    defaultPower: 'AC Mains / Cable Powered (Tested OK)',
    defaultQty: '1 Unit + HDMI/Power Loom + Carry Case',
  },
  {
    id: 'cat-home',
    name: 'Home & Personal Work',
    metricHint: 'Motor/Nozzle Pressure Test & Cord/Safety Trigger Check',
    defaultMeter: 'Tested Operational',
    defaultPower: 'AC Mains / Cable Powered (Tested OK)',
    defaultQty: '1 Tool + Hose/Attachment Kit',
  },
  {
    id: 'cat-art-decor',
    name: 'Art & Decor',
    metricHint: 'Piece/Panel Count, Surface Finish, Fabric & Frame Condition',
    defaultMeter: 'All Pieces Counted & Unblemished',
    defaultPower: 'N/A — Non-Powered / Structural / Decor',
    defaultQty: '1 Complete Decor Set + Protective Wraps',
  },
  {
    id: 'cat-other',
    name: 'Specialized & Industrial Tools',
    metricHint: 'Calibration Status, Battery/Power & Transit Case Seal',
    defaultMeter: 'Calibrated & Verified',
    defaultPower: '100% Full Tank / Charged',
    defaultQty: '1 Complete Instrument Kit + Tripod',
  },
];

const POWER_READINESS_OPTIONS = [
  '100% Full Tank / Charged',
  '75% Fuel / Battery Charge',
  '50% Fuel / Battery Charge',
  '25% Low Fuel / Battery (Top-up Needed)',
  'AC Mains / Cable Powered (Tested OK)',
  'N/A — Non-Powered / Structural / Decor',
];

export const OperationsView: React.FC<OperationsViewProps> = ({
  currentUser,
  categories = [],
  onOpenDocumentModal,
}) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [inspections, setInspections] = useState<InspectionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // View layout toggle: 'split' shows both Dispatch and Return forms side-by-side
  const [layoutMode, setLayoutMode] = useState<'split' | 'dispatch_only' | 'return_only'>('split');

  // QR / Booking Quick Search
  const [qrSearchInput, setQrSearchInput] = useState('');
  const [bannerAlert, setBannerAlert] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ============================================================================
  // FORM 1 STATE: CONCENTRATED EQUIPMENT DISPATCH FORM (OUTWARD HANDOVER)
  // ============================================================================
  const [dispatchBookingId, setDispatchBookingId] = useState<string>('');
  const [dispatchCategoryId, setDispatchCategoryId] = useState<string>('cat-construction');
  const [dispatchCondition, setDispatchCondition] = useState<'pristine' | 'normal_wear' | 'minor_damage' | 'severe_damage'>('pristine');
  const [dispatchUnitQty, setDispatchUnitQty] = useState<string>('1 Complete Unit / Kit');
  const [dispatchMeterReading, setDispatchMeterReading] = useState<string>('2,418.5 Operating Hrs');
  const [dispatchPowerLevel, setDispatchPowerLevel] = useState<string>('100% Full Tank / Charged');
  const [dispatchLogisticsMode, setDispatchLogisticsMode] = useState<'Yard Collection' | 'Go & Return Site Delivery'>('Go & Return Site Delivery');
  const [dispatchHandlerName, setDispatchHandlerName] = useState<string>('');
  const [dispatchSignature, setDispatchSignature] = useState<string>('');
  const [dispatchNotes, setDispatchNotes] = useState<string>('');
  const [dispatchPhoto, setDispatchPhoto] = useState<string>('');
  const [dispatchChecklist, setDispatchChecklist] = useState([
    { item: 'Physical, structural, surface & finish integrity verified', verified: true },
    { item: 'Operational test passed (engine/motor, power, or locks/joints)', verified: true },
    { item: '100% of accessories, cables, attachments & set pieces counted', verified: true },
    { item: 'Safety guards, transit cases & protective packaging secured', verified: true },
  ]);
  const [isSubmittingDispatch, setIsSubmittingDispatch] = useState(false);
  const dispatchFileRef = useRef<HTMLInputElement | null>(null);

  // ============================================================================
  // FORM 2 STATE: CONCENTRATED EQUIPMENT RETURN FORM (INWARD CHECK-IN)
  // ============================================================================
  const [returnBookingId, setReturnBookingId] = useState<string>('');
  const [returnCategoryId, setReturnCategoryId] = useState<string>('cat-construction');
  const [returnCondition, setReturnCondition] = useState<'pristine' | 'normal_wear' | 'minor_damage' | 'severe_damage'>('pristine');
  const [returnUnitQty, setReturnUnitQty] = useState<string>('1 Complete Unit / Kit');
  const [returnMeterReading, setReturnMeterReading] = useState<string>('2,450.0 Operating Hrs');
  const [returnPowerLevel, setReturnPowerLevel] = useState<string>('100% Full Tank / Charged');
  const [returnTiming, setReturnTiming] = useState<'on_time' | 'late' | 'early'>('on_time');
  const [returnCleanliness, setReturnCleanliness] = useState<'clean_ready' | 'needs_cleaning' | 'needs_repair'>('clean_ready');
  const [returnMissingItems, setReturnMissingItems] = useState<string>('None — All parts & accessories intact');
  const [damageCostEstimate, setDamageCostEstimate] = useState<number>(0);
  const [returnSignature, setReturnSignature] = useState<string>('');
  const [returnNotes, setReturnNotes] = useState<string>('');
  const [returnPhoto, setReturnPhoto] = useState<string>('');
  const [returnChecklist, setReturnChecklist] = useState([
    { item: 'No new structural damage, cracks, tears, or surface defects', verified: true },
    { item: 'Post-hire functional test passed (mechanical/electronic/optical)', verified: true },
    { item: 'Full kit & piece count reconciled against dispatch manifest', verified: true },
    { item: 'Cleaned, decontaminated & cleared for depot storage', verified: true },
  ]);
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);
  const returnFileRef = useRef<HTMLInputElement | null>(null);

  const showNotice = (text: string, type: 'success' | 'error' = 'success') => {
    setBannerAlert({ text, type });
    setTimeout(() => setBannerAlert(null), 4500);
  };

  const applyBookingToDispatchForm = (b: Booking) => {
    setDispatchBookingId(b.id);
    const catId = b.categoryId || 'cat-construction';
    setDispatchCategoryId(catId);
    const preset = UNIVERSAL_CATEGORIES.find((c) => c.id === catId) || UNIVERSAL_CATEGORIES[0];
    setDispatchUnitQty(preset.defaultQty);
    setDispatchMeterReading(preset.defaultMeter);
    setDispatchPowerLevel(preset.defaultPower);
    setDispatchLogisticsMode(b.deliveryRequired ? 'Go & Return Site Delivery' : 'Yard Collection');
    setDispatchHandlerName(`${b.renterName} (${b.renterPhone})`);
    setDispatchSignature(`${b.renterName} & ${currentUser.name}`);
    setDispatchPhoto(b.assetImage || '');
  };

  const applyBookingToReturnForm = (b: Booking) => {
    setReturnBookingId(b.id);
    const catId = b.categoryId || 'cat-construction';
    setReturnCategoryId(catId);
    const preset = UNIVERSAL_CATEGORIES.find((c) => c.id === catId) || UNIVERSAL_CATEGORIES[0];
    setReturnUnitQty(preset.defaultQty);
    setReturnMeterReading(preset.defaultMeter);
    setReturnPowerLevel(preset.defaultPower);
    setReturnSignature(`${b.renterName} & ${currentUser.name}`);
    setReturnPhoto(b.assetImage || '');
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [bookingData, inspectionData] = await Promise.all([
        fetchBookings(),
        fetchAllInspections().catch(() => []),
      ]);
      setBookings(bookingData);
      setInspections(inspectionData);

      if (bookingData.length > 0) {
        const dispatchCandidate =
          bookingData.find((b) => ['confirmed', 'ready_for_collection'].includes(b.status)) ||
          bookingData[0];
        const returnCandidate =
          bookingData.find((b) => ['active', 'return_due', 'under_inspection'].includes(b.status)) ||
          bookingData[0];

        if (!dispatchBookingId) applyBookingToDispatchForm(dispatchCandidate);
        if (!returnBookingId) applyBookingToReturnForm(returnCandidate);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCategoryPresetChange = (target: 'dispatch' | 'return', catId: string) => {
    const preset = UNIVERSAL_CATEGORIES.find((c) => c.id === catId) || UNIVERSAL_CATEGORIES[0];
    if (target === 'dispatch') {
      setDispatchCategoryId(catId);
      setDispatchUnitQty(preset.defaultQty);
      setDispatchMeterReading(preset.defaultMeter);
      setDispatchPowerLevel(preset.defaultPower);
    } else {
      setReturnCategoryId(catId);
      setReturnUnitQty(preset.defaultQty);
      setReturnMeterReading(preset.defaultMeter);
      setReturnPowerLevel(preset.defaultPower);
    }
  };

  const handleImportPhotoFile = (target: 'dispatch' | 'return', files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (!dataUrl) return;
      if (target === 'dispatch') {
        setDispatchPhoto(dataUrl);
      } else {
        setReturnPhoto(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleQrLookup = () => {
    const token = qrSearchInput.trim().toLowerCase();
    if (!token) return;
    const found = bookings.find(
      (b) =>
        b.qrHandoverToken.toLowerCase().includes(token) ||
        b.bookingCode.toLowerCase().includes(token) ||
        b.assetTitle.toLowerCase().includes(token)
    );
    if (found) {
      applyBookingToDispatchForm(found);
      applyBookingToReturnForm(found);
      showNotice(
        `Loaded ${found.bookingCode} (${found.assetTitle}) into both Dispatch & Return forms.`,
        'success'
      );
    } else {
      showNotice('No matching booking found for that QR token or booking code.', 'error');
    }
  };

  const handleDispatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetBooking = bookings.find((b) => b.id === dispatchBookingId);
    if (!targetBooking) {
      showNotice('Please select a booking to dispatch.', 'error');
      return;
    }
    setIsSubmittingDispatch(true);
    const catMeta = UNIVERSAL_CATEGORIES.find((c) => c.id === dispatchCategoryId);
    const payload = {
      bookingId: targetBooking.id,
      type: 'handover',
      conditionRating: dispatchCondition,
      checklist: dispatchChecklist,
      meterReading: dispatchMeterReading,
      fuelLevel: dispatchPowerLevel,
      equipmentCategory: catMeta?.name || dispatchCategoryId,
      unitQuantity: dispatchUnitQty,
      logisticsMode: dispatchLogisticsMode,
      courierOrHandler: dispatchHandlerName || targetBooking.renterName,
      inspectionNotes:
        dispatchNotes ||
        `Outward dispatch completed [${catMeta?.name || 'All Categories'}]. Qty: ${dispatchUnitQty}. Mode: ${dispatchLogisticsMode}.`,
      photoUrls: [dispatchPhoto || targetBooking.assetImage],
      signatureName: dispatchSignature || `${targetBooking.renterName} & ${currentUser.name}`,
    };
    try {
      if (!navigator.onLine) {
        const queued = JSON.parse(localStorage.getItem('rentz_offline_inspections') || '[]');
        queued.push(payload);
        localStorage.setItem('rentz_offline_inspections', JSON.stringify(queued));
        showNotice(
          `Saved Dispatch Form for ${targetBooking.bookingCode} to Offline Queue (${queued.length} pending). Will sync automatically when online.`,
          'success'
        );
        return;
      }
      await recordInspection(payload);

      showNotice(
        `Equipment Dispatch Form recorded for ${targetBooking.bookingCode} (${targetBooking.assetTitle}). Status updated to ACTIVE.`,
        'success'
      );
      await loadData();
    } catch (err: any) {
      showNotice(err.message || 'Failed to submit Equipment Dispatch Form.', 'error');
    } finally {
      setIsSubmittingDispatch(false);
    }
  };

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetBooking = bookings.find((b) => b.id === returnBookingId);
    if (!targetBooking) {
      showNotice('Please select a booking for equipment return.', 'error');
      return;
    }
    setIsSubmittingReturn(true);
    try {
      const catMeta = UNIVERSAL_CATEGORIES.find((c) => c.id === returnCategoryId);
      await recordInspection({
        bookingId: targetBooking.id,
        type: 'return',
        conditionRating: returnCondition,
        checklist: returnChecklist,
        meterReading: returnMeterReading,
        fuelLevel: returnPowerLevel,
        equipmentCategory: catMeta?.name || returnCategoryId,
        unitQuantity: returnUnitQty,
        returnTiming,
        cleanlinessState: returnCleanliness,
        missingOrDamagedItems: returnMissingItems,
        inspectionNotes:
          returnNotes ||
          `Inward return check-in completed [${catMeta?.name || 'All Categories'}]. Timing: ${returnTiming.replace('_', ' ')}. Turnaround: ${returnCleanliness.replace('_', ' ')}.`,
        photoUrls: [returnPhoto || targetBooking.assetImage],
        signatureName: returnSignature || `${targetBooking.renterName} & ${currentUser.name}`,
        damageCostEstimate: damageCostEstimate > 0 ? Number(damageCostEstimate) : undefined,
      });

      showNotice(
        `Equipment Return Form recorded for ${targetBooking.bookingCode} (${targetBooking.assetTitle}).`,
        'success'
      );
      await loadData();
    } catch (err: any) {
      showNotice(err.message || 'Failed to submit Equipment Return Form.', 'error');
    } finally {
      setIsSubmittingReturn(false);
    }
  };

  const selectedDispatchBooking = bookings.find((b) => b.id === dispatchBookingId);
  const selectedReturnBooking = bookings.find((b) => b.id === returnBookingId);
  const dispatchCatMeta =
    UNIVERSAL_CATEGORIES.find((c) => c.id === dispatchCategoryId) || UNIVERSAL_CATEGORIES[0];
  const returnCatMeta =
    UNIVERSAL_CATEGORIES.find((c) => c.id === returnCategoryId) || UNIVERSAL_CATEGORIES[0];

  const categoryOptions =
    categories.length > 0
      ? categories.map((c) => ({ id: c.id, name: c.name }))
      : UNIVERSAL_CATEGORIES.map((c) => ({ id: c.id, name: c.name }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Portal Header */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-stone-900 tracking-tight">
                Field Operations Portal — Equipment Dispatch & Return Forms
              </h1>
              <span className="px-2.5 py-0.5 text-[11px] font-bold rounded bg-amber-100 text-amber-900 font-mono">
                ALL-CATEGORY PROTOCOL
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-1">
              Dedicated outward dispatch and inward return forms engineered with a concentrated universal schema fitting all 9 equipment categories.
            </p>
          </div>

          {/* QR Lookup & Layout Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            {selectedDispatchBooking && onOpenDocumentModal && (
              <button
                onClick={() => onOpenDocumentModal(selectedDispatchBooking, 'gatepass')}
                className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-amber-400 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <FileCheck className="w-3.5 h-3.5" />
                <span>Print Gate Pass</span>
              </button>
            )}
            <div className="relative">
              <QrCode className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={qrSearchInput}
                onChange={(e) => setQrSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleQrLookup()}
                placeholder="Scan QR token or booking code..."
                className="pl-9 pr-3 py-1.5 text-xs font-mono bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-600"
              />
            </div>
            <button
              type="button"
              onClick={handleQrLookup}
              className="px-3 py-1.5 text-xs font-bold text-white bg-stone-900 hover:bg-stone-800 rounded-lg cursor-pointer"
            >
              Load Booking
            </button>

            <div className="flex items-center bg-stone-100 p-1 rounded-lg border border-stone-200">
              <button
                type="button"
                onClick={() => setLayoutMode('split')}
                className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-md cursor-pointer transition-colors ${
                  layoutMode === 'split'
                    ? 'bg-white text-stone-900 shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Columns2 className="w-3.5 h-3.5 text-amber-700" />
                <span>Both Forms</span>
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode('dispatch_only')}
                className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-md cursor-pointer transition-colors ${
                  layoutMode === 'dispatch_only'
                    ? 'bg-amber-700 text-white shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Dispatch Form</span>
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode('return_only')}
                className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-md cursor-pointer transition-colors ${
                  layoutMode === 'return_only'
                    ? 'bg-stone-900 text-white shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span>Return Form</span>
              </button>
            </div>
          </div>
        </div>

        {/* Universal Multi-Category Coverage Strip */}
        <div className="pt-3 border-t border-stone-200/80 flex items-center gap-2 overflow-x-auto pb-1">
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-stone-700 shrink-0">
            <Layers className="w-3.5 h-3.5 text-amber-700" />
            Supported Categories:
          </span>
          {UNIVERSAL_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                handleCategoryPresetChange('dispatch', cat.id);
                handleCategoryPresetChange('return', cat.id);
              }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold shrink-0 border transition-colors cursor-pointer ${
                dispatchCategoryId === cat.id || returnCategoryId === cat.id
                  ? 'bg-amber-50 border-amber-300 text-amber-900 font-bold'
                  : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Feedback Banner */}
      {bannerAlert && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
            bannerAlert.type === 'success'
              ? 'bg-amber-50 border-amber-300 text-amber-950'
              : 'bg-red-50 border-red-300 text-red-900'
          }`}
        >
          {bannerAlert.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-amber-700" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
          )}
          <span>{bannerAlert.text}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center p-16">
          <Loader2 className="w-8 h-8 animate-spin text-amber-700" />
        </div>
      ) : (
        <>
          {/* Quick Active Bookings Bar to Load into Either Form */}
          <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Active Hire Queue ({bookings.length}) — Click to Load into Dispatch or Return Form
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {bookings.slice(0, 8).map((b) => {
                const isDispatchSelected = dispatchBookingId === b.id;
                const isReturnSelected = returnBookingId === b.id;
                return (
                  <div
                    key={b.id}
                    className={`p-3 rounded-xl border text-xs transition-all flex flex-col justify-between ${
                      isDispatchSelected || isReturnSelected
                        ? 'border-amber-600 bg-amber-50/30'
                        : 'border-stone-200 bg-stone-50/50 hover:border-stone-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-mono font-bold text-stone-900">{b.bookingCode}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-stone-200/80 text-stone-800 uppercase">
                          {b.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="font-bold text-stone-800 truncate">{b.assetTitle}</p>
                      <p className="text-[11px] text-stone-500 truncate">
                        {b.renterName} · {formatDate(b.startDate)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-stone-200/80">
                      <button
                        type="button"
                        onClick={() => applyBookingToDispatchForm(b)}
                        className={`flex-1 py-1 px-2 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                          isDispatchSelected
                            ? 'bg-amber-700 text-white'
                            : 'bg-white border border-stone-300 text-stone-700 hover:bg-amber-50'
                        }`}
                      >
                        ↗ Load Dispatch
                      </button>
                      <button
                        type="button"
                        onClick={() => applyBookingToReturnForm(b)}
                        className={`flex-1 py-1 px-2 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                          isReturnSelected
                            ? 'bg-stone-900 text-white'
                            : 'bg-white border border-stone-300 text-stone-700 hover:bg-stone-100'
                        }`}
                      >
                        ↙ Load Return
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ================================================================= */}
          {/* SEPARATE FORMS CONTAINER: 1. DISPATCH FORM  &  2. RETURN FORM     */}
          {/* ================================================================= */}
          <div
            className={`grid grid-cols-1 ${
              layoutMode === 'split' ? 'xl:grid-cols-2' : ''
            } gap-6 items-start`}
          >
            {/* =============================================================== */}
            {/* FORM 1: CONCENTRATED EQUIPMENT DISPATCH FORM (OUTWARD HANDOVER) */}
            {/* =============================================================== */}
            {(layoutMode === 'split' || layoutMode === 'dispatch_only') && (
              <div className="bg-white rounded-2xl border-2 border-amber-700/80 shadow-sm overflow-hidden">
                {/* Form 1 Header */}
                <div className="px-5 py-4 bg-amber-950 text-white flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-700 flex items-center justify-center shrink-0">
                      <ArrowUpRight className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm sm:text-base font-extrabold tracking-tight">
                          1. Equipment Dispatch Form
                        </h2>
                        <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded bg-amber-700 text-amber-100">
                          OUTWARD RELEASE
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-200/90">
                        Concentrated pre-hire handover & release checklist for all equipment categories
                      </p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleDispatchSubmit} className="p-5 space-y-4 text-xs">
                  {/* Row 1: Booking Selector & Universal Category Selector */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-amber-50/50 border border-amber-200/80 rounded-xl">
                    <div>
                      <label className="block font-bold text-stone-800 mb-1">
                        Booking to Dispatch *
                      </label>
                      <select
                        value={dispatchBookingId}
                        onChange={(e) => {
                          const found = bookings.find((b) => b.id === e.target.value);
                          if (found) applyBookingToDispatchForm(found);
                        }}
                        className="w-full px-2.5 py-2 bg-white border border-stone-300 rounded-lg font-medium text-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-600 cursor-pointer"
                      >
                        {bookings.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.bookingCode} — {b.assetTitle} ({b.renterName})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-stone-800 mb-1">
                        Equipment Category Profile *
                      </label>
                      <select
                        value={dispatchCategoryId}
                        onChange={(e) => handleCategoryPresetChange('dispatch', e.target.value)}
                        className="w-full px-2.5 py-2 bg-white border border-stone-300 rounded-lg font-medium text-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-600 cursor-pointer"
                      >
                        {categoryOptions.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedDispatchBooking && (
                      <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-amber-200/70 text-[11px] text-stone-700">
                        <span>
                          <strong>Renter:</strong> {selectedDispatchBooking.renterName} ({selectedDispatchBooking.renterPhone})
                        </span>
                        <span>
                          <strong>Hire Window:</strong> {formatDate(selectedDispatchBooking.startDate)} → {formatDate(selectedDispatchBooking.endDate)}
                        </span>
                        <span className="font-mono text-amber-900 font-bold">
                          Focus: {dispatchCatMeta.metricHint}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Row 2: Concentrated Universal Telemetry (Quantity, Meter/Counter, Power/Fuel) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">
                        Dispatched Qty / Kit Spec *
                      </label>
                      <input
                        type="text"
                        required
                        value={dispatchUnitQty}
                        onChange={(e) => setDispatchUnitQty(e.target.value)}
                        placeholder="e.g. 1 Unit or 100 Pcs Set"
                        className="w-full px-2.5 py-2 bg-stone-50 border border-stone-300 rounded-lg font-mono text-xs focus:outline-none focus:ring-1 focus:ring-amber-600"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-stone-700 mb-1">
                        Outward Meter / Counter / Count
                      </label>
                      <input
                        type="text"
                        value={dispatchMeterReading}
                        onChange={(e) => setDispatchMeterReading(e.target.value)}
                        placeholder="Hours / km / Cycles / Piece Count"
                        className="w-full px-2.5 py-2 bg-stone-50 border border-stone-300 rounded-lg font-mono text-xs focus:outline-none focus:ring-1 focus:ring-amber-600"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-stone-700 mb-1">
                        Power / Fuel / Readiness
                      </label>
                      <select
                        value={dispatchPowerLevel}
                        onChange={(e) => setDispatchPowerLevel(e.target.value)}
                        className="w-full px-2.5 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-amber-600 cursor-pointer"
                      >
                        {POWER_READINESS_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Row 3: Outward Condition Rating (Concentrated 4-Button Bar) */}
                  <div>
                    <label className="block font-bold text-stone-700 mb-1.5">
                      Pre-Hire Condition Grade
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: 'pristine', label: 'Pristine / Ready' },
                        { id: 'normal_wear', label: 'Good (Normal Wear)' },
                        { id: 'minor_damage', label: 'Minor Cosmetic' },
                        { id: 'severe_damage', label: 'Pre-Existing Defect' },
                      ].map((cond) => (
                        <button
                          key={cond.id}
                          type="button"
                          onClick={() => setDispatchCondition(cond.id as any)}
                          className={`py-2 px-2.5 rounded-lg border text-center font-semibold transition-all cursor-pointer ${
                            dispatchCondition === cond.id
                              ? 'bg-amber-700 text-white border-amber-700 shadow-2xs'
                              : 'bg-white text-stone-700 border-stone-200 hover:border-stone-300'
                          }`}
                        >
                          {cond.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Row 4: Universal 4-Point All-Category Dispatch Verification Matrix */}
                  <div>
                    <label className="block font-bold text-stone-700 mb-1.5">
                      Universal All-Category Dispatch Verification
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-stone-50 rounded-xl border border-stone-200">
                      {dispatchChecklist.map((item, idx) => (
                        <label
                          key={idx}
                          className="flex items-start gap-2 text-stone-800 cursor-pointer select-none p-1.5 rounded hover:bg-white"
                        >
                          <input
                            type="checkbox"
                            checked={item.verified}
                            onChange={() => {
                              const next = [...dispatchChecklist];
                              next[idx].verified = !next[idx].verified;
                              setDispatchChecklist(next);
                            }}
                            className="mt-0.5 h-3.5 w-3.5 text-amber-700 rounded border-stone-300 accent-amber-700 cursor-pointer"
                          />
                          <span className="text-[11px] leading-tight font-medium">{item.item}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Row 5: Dispatch Mode, Carrier/Receiver & Digital Sign-off */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">
                        Handover / Logistics Mode
                      </label>
                      <select
                        value={dispatchLogisticsMode}
                        onChange={(e) => setDispatchLogisticsMode(e.target.value as any)}
                        className="w-full px-2.5 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs cursor-pointer"
                      >
                        <option value="Go & Return Site Delivery">Go & Return Site Delivery</option>
                        <option value="Yard Collection">Customer Yard Collection</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-stone-700 mb-1">
                        Released To (Renter / Driver / Vehicle Reg)
                      </label>
                      <input
                        type="text"
                        value={dispatchHandlerName}
                        onChange={(e) => setDispatchHandlerName(e.target.value)}
                        placeholder="e.g. Juma Bakari / T 412 DKR"
                        className="w-full px-2.5 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs"
                      />
                    </div>
                  </div>

                  {/* Row 6: Dispatch Notes, Photo Import & Joint Sign-Off */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                    <div className="sm:col-span-7 space-y-2">
                      <div>
                        <label className="block font-bold text-stone-700 mb-1">
                          Dispatch Remarks & Special Handover Terms
                        </label>
                        <input
                          type="text"
                          value={dispatchNotes}
                          onChange={(e) => setDispatchNotes(e.target.value)}
                          placeholder="Log serial numbers, attachments, or site instructions..."
                          className="w-full px-2.5 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-stone-700 mb-1">
                          Joint Dispatch Sign-Off (Dispatcher & Receiver)
                        </label>
                        <input
                          type="text"
                          value={dispatchSignature}
                          onChange={(e) => setDispatchSignature(e.target.value)}
                          placeholder="Dispatcher & Client Full Names"
                          className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-300 rounded-lg font-mono text-xs"
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-5 p-2.5 bg-stone-50 border border-stone-200 rounded-xl flex items-center gap-2.5">
                      {dispatchPhoto && (
                        <img
                          src={dispatchPhoto}
                          alt="Dispatch preview"
                          className="w-14 h-14 rounded-lg object-cover border border-stone-300 shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold text-stone-800 truncate">
                          Dispatch Evidence Photo
                        </p>
                        <p className="text-[10px] text-stone-500">
                          Import pre-hire photo
                        </p>
                        <input
                          ref={dispatchFileRef}
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImportPhotoFile('dispatch', e.target.files)}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => dispatchFileRef.current?.click()}
                          className="mt-1 inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white border border-stone-300 hover:bg-stone-100 text-[11px] font-bold text-stone-800 cursor-pointer"
                        >
                          <Upload className="w-3 h-3 text-amber-700" />
                          <span>Import Photo</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Submit Dispatch Button */}
                  <button
                    type="submit"
                    disabled={isSubmittingDispatch}
                    className="w-full py-2.5 px-4 text-xs sm:text-sm font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSubmittingDispatch ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Truck className="w-4 h-4" />
                        <span>Authorize Equipment Dispatch & Issue Outward Certificate</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* =============================================================== */}
            {/* FORM 2: CONCENTRATED EQUIPMENT RETURN FORM (INWARD CHECK-IN)    */}
            {/* =============================================================== */}
            {(layoutMode === 'split' || layoutMode === 'return_only') && (
              <div className="bg-white rounded-2xl border-2 border-stone-800 shadow-sm overflow-hidden">
                {/* Form 2 Header */}
                <div className="px-5 py-4 bg-stone-900 text-white flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-600 flex items-center justify-center shrink-0">
                      <ArrowDownLeft className="w-5 h-5 text-stone-950" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm sm:text-base font-extrabold tracking-tight">
                          2. Equipment Return Form
                        </h2>
                        <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded bg-stone-700 text-amber-300">
                          INWARD CHECK-IN
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-300">
                        Concentrated post-hire return verification, quantity reconciliation & damage recording
                      </p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleReturnSubmit} className="p-5 space-y-4 text-xs">
                  {/* Row 1: Booking Selector & Universal Category Selector */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-stone-100/90 border border-stone-200 rounded-xl">
                    <div>
                      <label className="block font-bold text-stone-800 mb-1">
                        Booking Being Returned *
                      </label>
                      <select
                        value={returnBookingId}
                        onChange={(e) => {
                          const found = bookings.find((b) => b.id === e.target.value);
                          if (found) applyBookingToReturnForm(found);
                        }}
                        className="w-full px-2.5 py-2 bg-white border border-stone-300 rounded-lg font-medium text-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-600 cursor-pointer"
                      >
                        {bookings.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.bookingCode} — {b.assetTitle} ({b.renterName})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-stone-800 mb-1">
                        Equipment Category Profile *
                      </label>
                      <select
                        value={returnCategoryId}
                        onChange={(e) => handleCategoryPresetChange('return', e.target.value)}
                        className="w-full px-2.5 py-2 bg-white border border-stone-300 rounded-lg font-medium text-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-600 cursor-pointer"
                      >
                        {categoryOptions.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedReturnBooking && (
                      <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-200 text-[11px] text-stone-700">
                        <span>
                          <strong>Renter:</strong> {selectedReturnBooking.renterName} ({selectedReturnBooking.renterPhone})
                        </span>
                        <span className="font-mono text-amber-800 font-bold">
                          Check: {returnCatMeta.metricHint}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Row 2: Concentrated Universal Return Telemetry */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">
                        Returned Qty / Kit Count *
                      </label>
                      <input
                        type="text"
                        required
                        value={returnUnitQty}
                        onChange={(e) => setReturnUnitQty(e.target.value)}
                        placeholder="e.g. 1 Unit or 100/100 Pcs"
                        className="w-full px-2.5 py-2 bg-stone-50 border border-stone-300 rounded-lg font-mono text-xs focus:outline-none focus:ring-1 focus:ring-amber-600"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-stone-700 mb-1">
                        Inward Meter / Counter / Count
                      </label>
                      <input
                        type="text"
                        value={returnMeterReading}
                        onChange={(e) => setReturnMeterReading(e.target.value)}
                        placeholder="Closing Hours / km / Count"
                        className="w-full px-2.5 py-2 bg-stone-50 border border-stone-300 rounded-lg font-mono text-xs focus:outline-none focus:ring-1 focus:ring-amber-600"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-stone-700 mb-1">
                        Return Power / Fuel State
                      </label>
                      <select
                        value={returnPowerLevel}
                        onChange={(e) => setReturnPowerLevel(e.target.value)}
                        className="w-full px-2.5 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-amber-600 cursor-pointer"
                      >
                        {POWER_READINESS_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Row 3: Return Condition Rating (Concentrated 4-Button Bar) */}
                  <div>
                    <label className="block font-bold text-stone-700 mb-1.5">
                      Post-Hire Return Condition Grade
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: 'pristine', label: 'Pristine / Intact' },
                        { id: 'normal_wear', label: 'Normal Job Wear' },
                        { id: 'minor_damage', label: 'Minor Scratch/Wear' },
                        { id: 'severe_damage', label: 'Damaged / Missing' },
                      ].map((cond) => (
                        <button
                          key={cond.id}
                          type="button"
                          onClick={() => setReturnCondition(cond.id as any)}
                          className={`py-2 px-2.5 rounded-lg border text-center font-semibold transition-all cursor-pointer ${
                            returnCondition === cond.id
                              ? 'bg-stone-900 text-white border-stone-900 shadow-2xs'
                              : 'bg-white text-stone-700 border-stone-200 hover:border-stone-300'
                          }`}
                        >
                          {cond.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Row 4: Universal 4-Point All-Category Return Verification Matrix */}
                  <div>
                    <label className="block font-bold text-stone-700 mb-1.5">
                      Universal All-Category Return Reconciliation
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-stone-50 rounded-xl border border-stone-200">
                      {returnChecklist.map((item, idx) => (
                        <label
                          key={idx}
                          className="flex items-start gap-2 text-stone-800 cursor-pointer select-none p-1.5 rounded hover:bg-white"
                        >
                          <input
                            type="checkbox"
                            checked={item.verified}
                            onChange={() => {
                              const next = [...returnChecklist];
                              next[idx].verified = !next[idx].verified;
                              setReturnChecklist(next);
                            }}
                            className="mt-0.5 h-3.5 w-3.5 text-amber-700 rounded border-stone-300 accent-amber-700 cursor-pointer"
                          />
                          <span className="text-[11px] leading-tight font-medium">{item.item}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Row 5: Return Timing, Turnaround State & Missing/Damaged Variance */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">
                        Return Punctuality
                      </label>
                      <select
                        value={returnTiming}
                        onChange={(e) => setReturnTiming(e.target.value as any)}
                        className="w-full px-2.5 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs cursor-pointer"
                      >
                        <option value="on_time">On-Time Return</option>
                        <option value="early">Early Return</option>
                        <option value="late">Late / Overdue Return</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-stone-700 mb-1">
                        Turnaround Status
                      </label>
                      <select
                        value={returnCleanliness}
                        onChange={(e) => setReturnCleanliness(e.target.value as any)}
                        className="w-full px-2.5 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs cursor-pointer"
                      >
                        <option value="clean_ready">Clean & Ready for Hire</option>
                        <option value="needs_cleaning">Requires Wash / Cleaning</option>
                        <option value="needs_repair">Requires Maintenance / Repair</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-stone-700 mb-1">
                        Missing / Damaged Variance
                      </label>
                      <input
                        type="text"
                        value={returnMissingItems}
                        onChange={(e) => setReturnMissingItems(e.target.value)}
                        placeholder="None or specify items..."
                        className="w-full px-2.5 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs"
                      />
                    </div>
                  </div>

                  {/* Row 6: Damage cost (recorded only; settled directly between owner and renter) */}
                  {(returnCondition === 'minor_damage' || returnCondition === 'severe_damage') && (
                    <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200/90 space-y-1.5">
                      <label className="block font-bold uppercase tracking-wider text-amber-950 text-[11px]">
                        Estimated Repair Cost (TZS, optional)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={damageCostEstimate}
                        onChange={(e) => setDamageCostEstimate(Number(e.target.value))}
                        placeholder="e.g. 50000"
                        className="w-full px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg font-mono text-xs"
                      />
                      <p className="text-[10px] text-amber-900">
                        RENTZ records the damage and opens a dispute. Any repair cost is settled directly between the owner and the renter.
                      </p>
                    </div>
                  )}

                  {/* Row 7: Return Notes, Photo Import & Joint Sign-Off */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                    <div className="sm:col-span-7 space-y-2">
                      <div>
                        <label className="block font-bold text-stone-700 mb-1">
                          Return Inspection Observations
                        </label>
                        <input
                          type="text"
                          value={returnNotes}
                          onChange={(e) => setReturnNotes(e.target.value)}
                          placeholder="Log final condition notes, cleaning status, or client remarks..."
                          className="w-full px-2.5 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-stone-700 mb-1">
                          Joint Return Sign-Off (Receiving Officer & Client)
                        </label>
                        <input
                          type="text"
                          value={returnSignature}
                          onChange={(e) => setReturnSignature(e.target.value)}
                          placeholder="Inspector & Returning Client Full Names"
                          className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-300 rounded-lg font-mono text-xs"
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-5 p-2.5 bg-stone-50 border border-stone-200 rounded-xl flex items-center gap-2.5">
                      {returnPhoto && (
                        <img
                          src={returnPhoto}
                          alt="Return preview"
                          className="w-14 h-14 rounded-lg object-cover border border-stone-300 shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold text-stone-800 truncate">
                          Return Evidence Photo
                        </p>
                        <p className="text-[10px] text-stone-500">
                          Import post-hire photo
                        </p>
                        <input
                          ref={returnFileRef}
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImportPhotoFile('return', e.target.files)}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => returnFileRef.current?.click()}
                          className="mt-1 inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white border border-stone-300 hover:bg-stone-100 text-[11px] font-bold text-stone-800 cursor-pointer"
                        >
                          <Upload className="w-3 h-3 text-stone-800" />
                          <span>Import Photo</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Submit Return Button */}
                  <button
                    type="submit"
                    disabled={isSubmittingReturn}
                    className="w-full py-2.5 px-4 text-xs sm:text-sm font-bold text-white bg-stone-900 hover:bg-stone-800 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSubmittingReturn ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <FileCheck className="w-4 h-4 text-amber-400" />
                        <span>Complete Equipment Return</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Recorded Dispatch & Return Certificates Ledger */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-amber-700" />
                <h3 className="text-sm font-extrabold text-stone-900">
                  Recent Equipment Dispatch & Return Certificates ({inspections.length})
                </h3>
              </div>
              <span className="text-[11px] text-stone-500">
                Verified outward handovers and inward return settlements
              </span>
            </div>

            {inspections.length === 0 ? (
              <p className="text-xs text-stone-500 py-4 text-center">
                No dispatch or return forms submitted yet in this session. Use either form above to issue a digital certificate.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {inspections.slice(0, 6).map((rec) => {
                  const matchedBooking = bookings.find((b) => b.id === rec.bookingId);
                  const isDispatch = rec.type === 'handover';
                  return (
                    <div
                      key={rec.id}
                      className="p-3.5 rounded-xl border border-stone-200 bg-stone-50/60 space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            isDispatch
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-stone-900 text-amber-300'
                          }`}
                        >
                          {isDispatch ? (
                            <>
                              <PackageCheck className="w-3 h-3" />
                              <span>DISPATCH CERTIFICATE</span>
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="w-3 h-3" />
                              <span>RETURN CERTIFICATE</span>
                            </>
                          )}
                        </span>
                        <span className="font-mono text-[10px] text-stone-500">
                          {new Date(rec.timestamp).toLocaleDateString()}
                        </span>
                      </div>

                      <p className="font-bold text-stone-900 truncate">
                        {matchedBooking ? `${matchedBooking.bookingCode} · ${matchedBooking.assetTitle}` : rec.bookingId}
                      </p>

                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-stone-600 font-mono">
                        {rec.unitQuantity && <span>Qty: {rec.unitQuantity}</span>}
                        {rec.meterReading && <span>Metric: {rec.meterReading}</span>}
                        {rec.fuelLevel && <span>Power: {rec.fuelLevel}</span>}
                      </div>

                      {!isDispatch && rec.damageCostEstimate ? (
                        <div className="pt-1 text-[11px] font-semibold text-stone-800">
                          Estimated repair cost: TSh {rec.damageCostEstimate.toLocaleString()}
                        </div>
                      ) : null}

                      <p className="text-[11px] text-stone-500 line-clamp-1">
                        Signed: {rec.signatureName}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
