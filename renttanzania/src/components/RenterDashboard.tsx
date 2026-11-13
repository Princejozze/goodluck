import React, { useState, useEffect } from 'react';
import { Booking, User, AppLanguage } from '../types/index.js';
import { fetchBookings } from '../services/api.js';
import { formatTZS, formatDate } from '../utils/formatters.js';
import { QRCodeDisplay } from './QRCodeDisplay.js';
import { ExtensionRequestModal } from './ExtensionRequestModal.js';
import {
  Calendar,
  Clock,
  ShieldCheck,
  AlertTriangle,
  FileText,
  QrCode,
  CheckCircle2,
  ChevronRight,
  Loader2,
  CalendarPlus,
  HelpCircle,
  XCircle,
} from 'lucide-react';

interface RenterDashboardProps {
  currentUser: User;
  onOpenDispute: (booking: Booking) => void;
  onOpenDocumentModal?: (booking: Booking, tab: 'contract' | 'gatepass') => void;
  language: AppLanguage;
}

export const RenterDashboard: React.FC<RenterDashboardProps> = ({
  currentUser,
  onOpenDispute,
  onOpenDocumentModal,
  language,
}) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showExtensionModal, setShowExtensionModal] = useState(false);

  const t = {
    en: {
      title: 'My Equipment Rentals',
      subtitle: 'Track booking requests, active hires, digital agreements, handover QR tokens, and extensions.',
      account: 'Account',
      noBookingsTitle: 'No equipment bookings yet',
      noBookingsDesc: 'Browse our catalog of construction machinery, tractors, generators, and cinema equipment to place your first booking.',
      rentalPeriod: 'Rental Period',
      deliverySite: 'Delivery & Site',
      selfPickup: 'Customer Self-Pickup',
      deliveryArranged: 'Delivery Arranged',
      operatorAssigned: 'Certified Operator Assigned',
      selfOperated: 'Self-Operated',
      financialTitle: 'Estimated Hire Cost (settled directly with the owner)',
      rentalSubtotal: 'Rental Subtotal',
      operatorFee: 'Operator Fee',
      totalDue: 'Estimated Total',
      ownerContactPending: 'The owner’s contact is shared once they accept your request.',
      handoverPassTitle: 'Equipment Handover & Check-in Pass',
      handoverPassDesc: 'Present this verification code or QR token to the inspector upon gear delivery or collection.',
      passToken: 'Pass Token',
      disputeBtn: 'Report Problem / Raise Claim',
      requestExtensionBtn: 'Request Rental Extension',
      extensionPending: 'Extension Request Pending Owner Approval',
      extensionApproved: 'Rental Extension Approved',
      extensionRejected: 'Extension Request Declined',
      requestedUntil: 'Requested until',
      additionalAmount: 'Estimated extra hire',
      ownerResponse: 'Owner note',
    },
    sw: {
      title: 'Kukodisha Kwangu',
      subtitle: 'Fuatilia maombi ya kukodi, vifaa vilivyopo kazini, mikataba ya kidijitali, pasi za QR, na nyongeza ya muda.',
      account: 'Akaunti',
      noBookingsTitle: 'Bado huna vifaa vilivyokodishwa',
      noBookingsDesc: 'Tazama orodha yetu ya mitambo ya ujenzi, matrekta, jenereta na kamera ili kuweka oda yako ya kwanza.',
      rentalPeriod: 'Muda wa Kukodisha',
      deliverySite: 'Usafirishaji & Eneo',
      selfPickup: 'Mteja Anachukua Mwenyewe',
      deliveryArranged: 'Usafirishaji Umepangwa',
      operatorAssigned: 'Opereta Mwenye Cheti Amepangwa',
      selfOperated: 'Inaendeshwa na Mteja',
      financialTitle: 'Makadirio ya Gharama ya Kukodi (hulipwa moja kwa moja kwa mmiliki)',
      rentalSubtotal: 'Jumla Ndogo ya Ukodishaji',
      operatorFee: 'Gharama ya Opereta',
      totalDue: 'Jumla ya Makadirio',
      ownerContactPending: 'Mawasiliano ya mmiliki yatatolewa akikubali ombi lako.',
      handoverPassTitle: 'Pasi ya Kukabidhi na Kupokea Kifaa',
      handoverPassDesc: 'Onyesha nambari hii au tokeni ya QR kwa mkaguzi wakati wa kupokea au kukabidhi kifaa.',
      passToken: 'Tokeni ya Pasi',
      disputeBtn: 'Ripoti Tatizo / Fungua Madai',
      requestExtensionBtn: 'Omba Kuongeza Muda',
      extensionPending: 'Ombi la Kuongeza Muda Linasubiri Idhini ya Mmiliki',
      extensionApproved: 'Muda wa Kukodisha Umeongezwa kwa Mafanikio',
      extensionRejected: 'Ombi la Kuongeza Muda Limekataliwa',
      requestedUntil: 'Imeombwa hadi',
      additionalAmount: 'Makadirio ya gharama ya ziada',
      ownerResponse: 'Maelezo ya mmiliki',
    },
    fr: {
      title: 'Mes Locations d’Équipements',
      subtitle: 'Suivez vos demandes, locations en cours, contrats numériques, pass QR et prolongations.',
      account: 'Compte',
      noBookingsTitle: 'Aucune réservation d’équipement pour le moment',
      noBookingsDesc: 'Parcourez notre catalogue d’engins de chantier, tracteurs, générateurs et matériel de tournage pour réserver.',
      rentalPeriod: 'Période de Location',
      deliverySite: 'Livraison & Chantier',
      selfPickup: 'Retrait par le Client',
      deliveryArranged: 'Livraison sur Site',
      operatorAssigned: 'Opérateur Certifié Inclus',
      selfOperated: 'Sans Opérateur',
      financialTitle: 'Coût Estimé de Location (réglé directement avec le propriétaire)',
      rentalSubtotal: 'Sous-total Location',
      operatorFee: 'Frais d’Opérateur',
      totalDue: 'Total Estimé',
      ownerContactPending: 'Le contact du propriétaire est partagé dès qu’il accepte votre demande.',
      handoverPassTitle: 'Pass de Remise & Réception du Matériel',
      handoverPassDesc: 'Présentez ce code de vérification ou QR code à l’inspecteur lors de la livraison ou du retrait.',
      passToken: 'Jeton de Pass',
      disputeBtn: 'Signaler un Problème / Déposer une Réclamation',
      requestExtensionBtn: 'Demander une Prolongation',
      extensionPending: 'Demande de Prolongation en Attente de l’Accord du Propriétaire',
      extensionApproved: 'Prolongation de Location Approuvée',
      extensionRejected: 'Demande de Prolongation Refusée',
      requestedUntil: 'Demandé jusqu’au',
      additionalAmount: 'Location supplémentaire estimée',
      ownerResponse: 'Remarque du propriétaire',
    },
  }[language];

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchBookings();
      setBookings(data);
      if (data.length > 0) {
        setSelectedBooking((prev) => {
          if (!prev) return data[0];
          const matched = data.find((b) => b.id === prev.id);
          return matched || data[0];
        });
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

  const getStatusBadge = (status: Booking['status']) => {
    const config: Record<string, { label: { en: string; sw: string; fr: string }; bg: string; text: string }> = {
      requested: {
        label: { en: 'Waiting for Owner to Accept', sw: 'Inasubiri Mmiliki Akubali', fr: 'En Attente du Propriétaire' },
        bg: 'bg-amber-50 border-amber-200',
        text: 'text-amber-800',
      },
      confirmed: {
        label: { en: 'Confirmed · Ready for Pickup', sw: 'Imethibitishwa · Tayari Kuchukuliwa', fr: 'Confirmé · Prêt au Retrait' },
        bg: 'bg-amber-50 border-amber-300',
        text: 'text-amber-800',
      },
      ready_for_collection: {
        label: { en: 'Ready for Collection', sw: 'Tayari Kuchukua', fr: 'Prêt pour la Collecte' },
        bg: 'bg-sky-50 border-sky-200',
        text: 'text-sky-800',
      },
      active: {
        label: { en: 'Active on Hire', sw: 'Inatumika Kazini', fr: 'En Cours d’Utilisation' },
        bg: 'bg-amber-100 border-amber-400',
        text: 'text-amber-950',
      },
      return_due: {
        label: { en: 'Return Due Today', sw: 'Inatakiwa Kurudishwa Leo', fr: 'Retour Prévu Aujourd’hui' },
        bg: 'bg-orange-50 border-orange-200',
        text: 'text-orange-800',
      },
      under_inspection: {
        label: { en: 'Under Return Inspection', sw: 'Inafanyiwa Ukaguzi wa Kurudi', fr: 'En Cours d’Inspection de Retour' },
        bg: 'bg-purple-50 border-purple-200',
        text: 'text-purple-800',
      },
      completed: {
        label: { en: 'Completed', sw: 'Imekamilika', fr: 'Terminée' },
        bg: 'bg-stone-100 border-stone-200',
        text: 'text-stone-700',
      },
      disputed: {
        label: { en: 'Dispute Under Review', sw: 'Mzozo Unachunguzwa', fr: 'Litige en Cours d’Examen' },
        bg: 'bg-red-50 border-red-200',
        text: 'text-red-800',
      },
      cancelled: {
        label: { en: 'Cancelled', sw: 'Imeghairiwa', fr: 'Annulée' },
        bg: 'bg-stone-50 border-stone-200',
        text: 'text-stone-500',
      },
    };
    const c = config[status] || {
      label: { en: status, sw: status, fr: status },
      bg: 'bg-stone-100 border-stone-200',
      text: 'text-stone-700',
    };
    return (
      <span className={`px-2.5 py-1 text-[11px] font-semibold rounded-md border ${c.bg} ${c.text}`}>
        {c.label[language] || c.label.en}
      </span>
    );
  };

  const canExtend =
    selectedBooking &&
    ['confirmed', 'ready_for_collection', 'active', 'return_due'].includes(selectedBooking.status);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Title Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight">{t.title}</h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">{t.subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 bg-stone-100 rounded-lg text-xs font-mono text-stone-700">
            {t.account}: {currentUser.name} ({currentUser.phone})
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-16">
          <Loader2 className="w-6 h-6 animate-spin text-amber-700" />
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-stone-200 p-8">
          <Clock className="w-10 h-10 text-stone-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-stone-800">{t.noBookingsTitle}</h3>
          <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">{t.noBookingsDesc}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Booking List */}
          <div className="lg:col-span-5 space-y-3">
            {bookings.map((b) => {
              const isSelected = selectedBooking?.id === b.id;
              return (
                <div
                  key={b.id}
                  onClick={() => setSelectedBooking(b)}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-amber-700 bg-white shadow-md ring-1 ring-amber-700'
                      : 'border-stone-200 bg-white hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-mono font-semibold text-stone-400">
                        {b.bookingCode}
                      </span>
                      <h4 className="text-sm font-bold text-stone-900 line-clamp-1 mt-0.5">
                        {b.assetTitle}
                      </h4>
                    </div>
                    {getStatusBadge(b.status)}
                  </div>

                  {/* Extension pending badge on card */}
                  {b.extensionRequest && b.extensionRequest.status === 'pending' && (
                    <div className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      <Clock className="w-3 h-3 text-amber-600" />
                      <span>
                        Extension pending (+{b.extensionRequest.additionalDays} days to{' '}
                        {formatDate(b.extensionRequest.requestedEndDate)})
                      </span>
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-between text-xs text-stone-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-stone-400" />
                      <span>
                        {formatDate(b.startDate)} → {formatDate(b.endDate)}
                      </span>
                    </span>
                    <span className="font-mono font-bold text-stone-900 tabular-nums">
                      {formatTZS(b.priceBreakdown.estimatedTotal)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Booking Details Pane */}
          {selectedBooking && (
            <div className="lg:col-span-7 bg-white rounded-2xl border border-stone-200 p-6 space-y-6 shadow-xs">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-200">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-amber-800">
                      {selectedBooking.bookingCode}
                    </span>
                    <span className="text-stone-300">·</span>
                    <span className="text-xs text-stone-500 capitalize">
                      {selectedBooking.rentalUnit} rental
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-stone-900 mt-1">
                    {selectedBooking.assetTitle}
                  </h3>
                </div>

                <div>{getStatusBadge(selectedBooking.status)}</div>
              </div>

              {/* Extension Banner (if present) */}
              {selectedBooking.extensionRequest && (
                <div
                  className={`p-4 rounded-xl border flex flex-col gap-1.5 text-xs ${
                    selectedBooking.extensionRequest.status === 'pending'
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : selectedBooking.extensionRequest.status === 'approved'
                      ? 'bg-amber-50 border-amber-300 text-amber-900'
                      : 'bg-red-50 border-red-200 text-red-900'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold">
                    {selectedBooking.extensionRequest.status === 'pending' ? (
                      <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                    ) : selectedBooking.extensionRequest.status === 'approved' ? (
                      <CheckCircle2 className="w-4 h-4 text-amber-700 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                    )}
                    <span>
                      {selectedBooking.extensionRequest.status === 'pending'
                        ? t.extensionPending
                        : selectedBooking.extensionRequest.status === 'approved'
                        ? t.extensionApproved
                        : t.extensionRejected}
                    </span>
                  </div>

                  <p className="text-[11px] text-stone-700">
                    {t.requestedUntil}:{' '}
                    <strong>{formatDate(selectedBooking.extensionRequest.requestedEndDate)}</strong>{' '}
                    (+{selectedBooking.extensionRequest.additionalDays} days) · {t.additionalAmount}:{' '}
                    <strong>{formatTZS(selectedBooking.extensionRequest.additionalRentalAmount)}</strong>
                  </p>

                  {selectedBooking.extensionRequest.reason && (
                    <p className="text-[11px] text-stone-600 italic">
                      "{selectedBooking.extensionRequest.reason}"
                    </p>
                  )}

                  {selectedBooking.extensionRequest.responseNotes && (
                    <p className="text-[11px] font-semibold">
                      {t.ownerResponse}: {selectedBooking.extensionRequest.responseNotes}
                    </p>
                  )}
                </div>
              )}

              {/* Handover QR Code Token Callout: only once the owner has accepted */}
              {!['draft', 'requested', 'cancelled'].includes(selectedBooking.status) && (
              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center sm:text-left">
                  <p className="text-xs font-bold uppercase tracking-wider text-stone-800 flex items-center gap-1.5 justify-center sm:justify-start">
                    <QrCode className="w-4 h-4 text-amber-700" />
                    <span>{t.handoverPassTitle}</span>
                  </p>
                  <p className="text-xs text-stone-500">{t.handoverPassDesc}</p>
                  <p className="text-xs font-mono font-bold text-stone-900">
                    {t.passToken}: {selectedBooking.qrHandoverToken}
                  </p>
                </div>

                <div className="shrink-0">
                  <QRCodeDisplay
                    value={selectedBooking.qrHandoverToken}
                    size={110}
                    label="HANDOVER PASS"
                  />
                </div>
              </div>
              )}

              {/* Booking Specifications & Dates */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-stone-50 rounded-lg border border-stone-100">
                  <span className="text-stone-500 font-medium">{t.rentalPeriod}</span>
                  <p className="font-bold text-stone-900 font-mono mt-0.5">
                    {formatDate(selectedBooking.startDate)} to {formatDate(selectedBooking.endDate)}
                  </p>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    ({selectedBooking.billableUnits} {selectedBooking.rentalUnit}s total)
                  </p>
                </div>

                <div className="p-3 bg-stone-50 rounded-lg border border-stone-100">
                  <span className="text-stone-500 font-medium">{t.deliverySite}</span>
                  <p className="font-bold text-stone-900 truncate mt-0.5">
                    {selectedBooking.deliveryRequired
                      ? selectedBooking.deliveryAddress || t.deliveryArranged
                      : t.selfPickup}
                  </p>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    Operator: {selectedBooking.operatorRequired ? t.operatorAssigned : t.selfOperated}
                  </p>
                </div>
              </div>

              {/* Price Breakdown Summary */}
              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 text-xs space-y-2">
                <p className="font-bold uppercase tracking-wider text-stone-800 text-[11px]">
                  {t.financialTitle}
                </p>

                <div className="flex justify-between text-stone-600">
                  <span>
                    {t.rentalSubtotal} ({selectedBooking.billableUnits} {selectedBooking.rentalUnit}s)
                  </span>
                  <span className="font-mono tabular-nums font-medium text-stone-900">
                    {formatTZS(selectedBooking.priceBreakdown.rentalSubtotal)}
                  </span>
                </div>

                {selectedBooking.priceBreakdown.operatorFee > 0 && (
                  <div className="flex justify-between text-stone-600">
                    <span>{t.operatorFee}</span>
                    <span className="font-mono tabular-nums font-medium text-stone-900">
                      {formatTZS(selectedBooking.priceBreakdown.operatorFee)}
                    </span>
                  </div>
                )}

                <div className="border-t border-stone-200 pt-2 flex justify-between font-bold text-stone-900 text-sm">
                  <span>{t.totalDue}</span>
                  <span className="font-mono tabular-nums text-amber-800">
                    {formatTZS(selectedBooking.priceBreakdown.estimatedTotal)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap gap-3">
                {/* Rental Extension Button */}
                {canExtend && (
                  <button
                    onClick={() => setShowExtensionModal(true)}
                    className="px-4 py-2.5 text-xs font-bold text-amber-900 bg-amber-50 border border-amber-300 rounded-xl hover:bg-amber-100 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <CalendarPlus className="w-4 h-4 text-amber-700" />
                    <span>{t.requestExtensionBtn}</span>
                  </button>
                )}

                <button
                  onClick={() => onOpenDispute(selectedBooking)}
                  className="px-4 py-2.5 text-xs font-semibold text-stone-700 bg-white border border-stone-300 rounded-xl hover:bg-stone-50 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>{t.disputeBtn}</span>
                </button>
              </div>

              {/* Official Printable PDF Documents & WhatsApp Handoff Bar */}
              <div className="pt-3 border-t border-stone-200 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                  Official Documents & Support:
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {onOpenDocumentModal && (
                    <>
                      <button
                        onClick={() => onOpenDocumentModal(selectedBooking, 'contract')}
                        className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5 text-amber-400" />
                        <span>Hire Contract PDF</span>
                      </button>
                      <button
                        onClick={() => onOpenDocumentModal(selectedBooking, 'gatepass')}
                        className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <QrCode className="w-3.5 h-3.5 text-amber-700" />
                        <span>Gate Pass</span>
                      </button>
                    </>
                  )}
                  {selectedBooking.ownerPhone ? (
                    <a
                      href={`https://wa.me/${selectedBooking.ownerPhone.replace(
                        /[^0-9]/g,
                        ''
                      )}?text=${encodeURIComponent(
                        `Habari ${selectedBooking.ownerName}, regarding RENTZ Booking ${selectedBooking.bookingCode} (${selectedBooking.assetTitle}).`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                    >
                      WhatsApp Owner
                    </a>
                  ) : (
                    <span className="text-[11px] text-stone-500 italic">{t.ownerContactPending}</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Extension Request Modal */}
      {showExtensionModal && selectedBooking && (
        <ExtensionRequestModal
          booking={selectedBooking}
          isOpen={showExtensionModal}
          onClose={() => setShowExtensionModal(false)}
          onSuccess={(updated) => {
            setSelectedBooking(updated);
            setBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
          }}
          language={language}
        />
      )}
    </div>
  );
};
