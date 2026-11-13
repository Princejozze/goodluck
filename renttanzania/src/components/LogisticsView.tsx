import React, { useState, useEffect } from 'react';
import { LogisticsDispatchJob, LogisticsJobStatus, User, Booking } from '../types/index.js';
import { fetchLogisticsJobs, updateLogisticsJobStatus, fetchBookings } from '../services/api.js';
import { formatTZS } from '../utils/formatters.js';
import {
  Truck,
  MapPin,
  Navigation,
  Phone,
  CheckCircle2,
  Clock,
  Scale,
  FileText,
  RefreshCw,
  ShieldCheck,
  ExternalLink,
  PackageCheck,
} from 'lucide-react';

interface LogisticsViewProps {
  currentUser: User | null;
  onOpenDocumentModal?: (booking: Booking, tab: 'contract' | 'gatepass') => void;
}

const STATUS_STEPS: { id: LogisticsJobStatus; label: string; badgeClass: string }[] = [
  { id: 'pending_assignment', label: '0. Awaiting Carrier', badgeClass: 'bg-rose-50 text-rose-800 border-rose-300' },
  { id: 'assigned', label: '1. Assigned to Carrier', badgeClass: 'bg-stone-100 text-stone-800 border-stone-300' },
  { id: 'en_route_pickup', label: '2. En Route to Yard Pickup', badgeClass: 'bg-amber-50 text-amber-800 border-amber-300' },
  { id: 'in_transit_to_site', label: '3. In Transit to Customer Site', badgeClass: 'bg-blue-50 text-blue-800 border-blue-300' },
  { id: 'delivered_at_site', label: '4. Delivered at Site (Active)', badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300' },
  { id: 'return_pickup_en_route', label: '5. Return Pickup En Route', badgeClass: 'bg-purple-50 text-purple-800 border-purple-300' },
  { id: 'returned_to_yard', label: '6. Returned to Depot Yard', badgeClass: 'bg-stone-900 text-white border-stone-900' },
];

export const LogisticsView: React.FC<LogisticsViewProps> = ({
  currentUser,
  onOpenDocumentModal,
}) => {
  const [jobs, setJobs] = useState<LogisticsDispatchJob[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  // Carrier details typed by staff when assigning a delivery (RENTZ has no fleet of its own)
  const [carrierDrafts, setCarrierDrafts] = useState<Record<string, { name: string; phone: string; plate: string }>>({});
  const isStaff = !!currentUser?.hasAdminOpsAccess;

  const handleAssignCarrier = async (job: LogisticsDispatchJob) => {
    const draft = carrierDrafts[job.id] || { name: '', phone: '', plate: '' };
    setUpdatingId(job.id);
    try {
      const updated = await updateLogisticsJobStatus(job.id, {
        status: 'assigned',
        driverName: draft.name.trim(),
        driverPhone: draft.phone.trim(),
        vehiclePlate: draft.plate.trim() || undefined,
      });
      setJobs((prev) => prev.map((j) => (j.id === updated.id ? updated : j)));
      setNotice(`Waybill ${job.waybillCode} assigned to ${updated.driverName}`);
    } catch (err: any) {
      setNotice(err.message || 'Could not assign the carrier');
    } finally {
      setUpdatingId(null);
      setTimeout(() => setNotice(null), 4500);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [jobsData, bookingsData] = await Promise.all([
        fetchLogisticsJobs(),
        fetchBookings().catch(() => []),
      ]);
      setJobs(jobsData);
      setBookings(bookingsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStatusChange = async (job: LogisticsDispatchJob, nextStatus: LogisticsJobStatus) => {
    setUpdatingId(job.id);
    try {
      const updated = await updateLogisticsJobStatus(job.id, {
        status: nextStatus,
        recipientSignedBy:
          nextStatus === 'delivered_at_site' ? `${job.renterName} (Site Verified)` : job.recipientSignedBy,
      });
      setJobs((prev) => prev.map((j) => (j.id === updated.id ? updated : j)));
      setNotice(`Waybill ${job.waybillCode} updated to "${nextStatus.replace(/_/g, ' ').toUpperCase()}"`);
      setTimeout(() => setNotice(null), 4000);
    } catch (err: any) {
      setNotice(err.message || 'Please log in as Operations, Admin, or Owner to update dispatch status.');
      setTimeout(() => setNotice(null), 4500);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredJobs =
    filterStatus === 'all' ? jobs : jobs.filter((j) => j.status === filterStatus);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header Banner */}
      <div className="bg-stone-900 text-white rounded-2xl p-6 border border-stone-800 shadow-lg flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded bg-amber-500 text-stone-950 font-mono text-[11px] font-black uppercase">
              COMPANION DISPATCH PORTAL
            </span>
            <span className="px-2.5 py-0.5 rounded bg-stone-800 text-stone-300 font-mono text-[11px]">
              22 WEIGHT TIERS • GOOGLE MAPS ROUTING
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2.5">
            <Truck className="w-6 h-6 text-amber-400" />
            Logistics & Delivery Driver Dispatch Portal
          </h1>
          <p className="text-xs text-stone-400 max-w-2xl">
            Dedicated transport carrier & lowbed dispatch hub. Matches equipment weight (0–10,000+ kg) to the required vehicle class, provides 1-click Google Maps turn-by-turn navigation, and syncs live waybill status with Field Ops.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-xl bg-stone-800 border border-stone-700 text-xs font-bold text-white"
          >
            <option value="all">All Dispatch Jobs ({jobs.length})</option>
            {STATUS_STEPS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Board
          </button>
        </div>
      </div>

      {notice && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs font-bold flex items-center justify-between">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="text-amber-700 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-stone-200">
          <div className="text-[11px] font-bold uppercase text-stone-400">Active Waybills</div>
          <div className="text-2xl font-black text-stone-900 font-mono mt-1">{jobs.length}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-stone-200">
          <div className="text-[11px] font-bold uppercase text-stone-400">In Transit / Site Active</div>
          <div className="text-2xl font-black text-amber-600 font-mono mt-1">
            {jobs.filter((j) => ['en_route_pickup', 'in_transit_to_site', 'delivered_at_site'].includes(j.status)).length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-stone-200">
          <div className="text-[11px] font-bold uppercase text-stone-400">Heavy Lowbed / Crane</div>
          <div className="text-2xl font-black text-stone-900 font-mono mt-1">
            {jobs.filter((j) => j.weightKg >= 4000).length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-stone-200">
          <div className="text-[11px] font-bold uppercase text-stone-400">Go & Return Distance</div>
          <div className="text-lg font-black text-emerald-700 font-mono mt-1">
            {jobs.reduce((acc, j) => acc + (j.distanceKm || 0), 0).toLocaleString()} km
          </div>
        </div>
      </div>

      {/* Dispatch Cards */}
      <div className="space-y-4">
        {filteredJobs.map((job) => {
          const pickupAddr = job.pickupLocation || job.originAddress || 'RENTZ Depot Yard, Dar es Salaam';
          const dropoffAddr = job.dropoffLocation || job.destinationAddress || 'Customer Site, Dar es Salaam';
          const waybill = job.waybillCode || `WB-TZ-${job.id.slice(-4).toUpperCase()}`;
          const vehicleClassLabel = job.requiredVehicleClass || job.vehicleClass || 'Standard Transport Carrier';

          const googleDirectionsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
            pickupAddr
          )}&destination=${encodeURIComponent(dropoffAddr)}&travelmode=driving`;

          const renterWaUrl = `https://wa.me/${(job.renterPhone || '255793481147').replace(
            /[^0-9]/g,
            ''
          )}?text=${encodeURIComponent(
            `Habari ${job.renterName}, RENTZ Dispatch Driver (${job.driverName || 'Dispatch Team'}, Plate ${job.vehiclePlate || 'Assigned'}) for Waybill ${waybill} (${job.assetTitle}).`
          )}`;

          const linkedBooking = bookings.find((b) => b.id === job.bookingId || b.bookingCode === job.bookingCode);
          const currentStepMeta = STATUS_STEPS.find((s) => s.id === job.status) || STATUS_STEPS[0];

          return (
            <div
              key={job.id}
              className="bg-white rounded-2xl border border-stone-200 p-5 shadow-2xs space-y-4 hover:border-stone-300 transition-all"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-stone-100 pb-4">
                <div className="flex items-start gap-3.5">
                  <img
                    src={job.assetImage}
                    alt={job.assetTitle}
                    className="w-16 h-16 rounded-xl object-cover border border-stone-200 shrink-0"
                  />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-stone-900 text-amber-400 font-mono text-[11px] font-bold">
                        {waybill}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-700 font-mono text-[11px] font-bold">
                        Booking: {job.bookingCode}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded border text-[11px] font-bold ${currentStepMeta.badgeClass}`}>
                        {currentStepMeta.label}
                      </span>
                    </div>
                    <h3 className="text-base font-black text-stone-900 mt-1">{job.assetTitle}</h3>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-stone-600 mt-1">
                      <span className="inline-flex items-center gap-1 font-mono font-bold text-stone-800">
                        <Scale className="w-3.5 h-3.5 text-amber-600" />
                        {job.weightKg.toLocaleString()} kg
                      </span>
                      <span>•</span>
                      <span className="font-semibold text-amber-800">{vehicleClassLabel}</span>
                      <span>•</span>
                      <span className="font-mono font-bold text-emerald-700">
                        Go & Return: {job.distanceKm} km (cost agreed with owner)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick External Actions */}
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={googleDirectionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    Google Maps Route
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <a
                    href={renterWaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    WhatsApp Renter
                  </a>
                  {linkedBooking && onOpenDocumentModal && (
                    <button
                      onClick={() => onOpenDocumentModal(linkedBooking, 'gatepass')}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5 text-amber-400" />
                      Print Gate Pass
                    </button>
                  )}
                </div>
              </div>

              {/* Route & Driver Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                  <div className="text-[10px] font-bold uppercase text-stone-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-amber-600" /> Origin Depot / Pickup
                  </div>
                  <div className="font-bold text-stone-900 mt-1">{pickupAddr}</div>
                  <div className="text-[11px] text-stone-500 mt-0.5">Owner: {job.ownerName}</div>
                </div>

                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                  <div className="text-[10px] font-bold uppercase text-stone-400 flex items-center gap-1">
                    <Navigation className="w-3 h-3 text-emerald-600" /> Customer Site Dropoff
                  </div>
                  <div className="font-bold text-stone-900 mt-1">{dropoffAddr}</div>
                  <div className="text-[11px] text-stone-500 mt-0.5">
                    Receiver: {job.renterName} ({job.renterPhone})
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                  <div className="text-[10px] font-bold uppercase text-stone-400 flex items-center gap-1">
                    <Truck className="w-3 h-3 text-blue-600" /> Assigned Driver & Carrier
                  </div>
                  <div className="font-bold text-stone-900 mt-1">{job.driverName || 'Awaiting Carrier Assignment'}</div>
                  <div className="text-[11px] font-mono text-stone-600 mt-0.5">
                    Plate: <strong>{job.vehiclePlate || 'TBA'}</strong> • Tel: {job.driverPhone || 'not set'}
                  </div>
                  {job.status === 'pending_assignment' && isStaff && (
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                      {(['name', 'phone', 'plate'] as const).map((field) => (
                        <input
                          key={field}
                          type={field === 'phone' ? 'tel' : 'text'}
                          placeholder={field === 'name' ? 'Driver name' : field === 'phone' ? 'Driver phone' : 'Plate (optional)'}
                          value={carrierDrafts[job.id]?.[field] || ''}
                          onChange={(e) =>
                            setCarrierDrafts((prev) => ({
                              ...prev,
                              [job.id]: { ...(prev[job.id] || { name: '', phone: '', plate: '' }), [field]: e.target.value },
                            }))
                          }
                          className="px-2 py-1 text-[11px] border border-stone-300 rounded-lg bg-white"
                        />
                      ))}
                      <button
                        type="button"
                        onClick={() => handleAssignCarrier(job)}
                        disabled={updatingId === job.id}
                        className="sm:col-span-3 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-stone-900 text-amber-400 disabled:opacity-50"
                      >
                        Assign Carrier
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Driver Status Progression Bar */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
                <div className="text-[11px] font-bold uppercase text-stone-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  Driver Status Check-In Controls:
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {STATUS_STEPS.map((step) => {
                    const isCurrent = job.status === step.id;
                    return (
                      <button
                        key={step.id}
                        disabled={updatingId === job.id || isCurrent}
                        onClick={() => handleStatusChange(job, step.id)}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                          isCurrent
                            ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                            : 'bg-white hover:bg-stone-100 text-stone-700 border-stone-200'
                        }`}
                      >
                        {step.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
