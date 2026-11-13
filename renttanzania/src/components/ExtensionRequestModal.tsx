import React, { useState } from 'react';
import { Booking, AppLanguage } from '../types/index.js';
import { requestBookingExtension } from '../services/api.js';
import { formatTZS, formatDate } from '../utils/formatters.js';
import {
  Calendar,
  Clock,
  AlertTriangle,
  X,
  CheckCircle2,
  Loader2,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

interface ExtensionRequestModalProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedBooking: Booking) => void;
  language: AppLanguage;
}

export const ExtensionRequestModal: React.FC<ExtensionRequestModalProps> = ({
  booking,
  isOpen,
  onClose,
  onSuccess,
  language,
}) => {
  if (!isOpen || !booking) return null;

  // Calculate default new end date = current end date + 2 days
  const currentEnd = new Date(booking.endDate);
  const minDateObj = new Date(currentEnd);
  minDateObj.setDate(minDateObj.getDate() + 1);
  const minDateStr = minDateObj.toISOString().split('T')[0];

  const defaultNewEndObj = new Date(currentEnd);
  defaultNewEndObj.setDate(defaultNewEndObj.getDate() + 2);
  const defaultNewEndStr = defaultNewEndObj.toISOString().split('T')[0];

  const [requestedEndDate, setRequestedEndDate] = useState<string>(defaultNewEndStr);
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Live calculations
  const newEndObj = new Date(requestedEndDate);
  const diffMs = newEndObj.getTime() - currentEnd.getTime();
  const additionalDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

  const dailyRate = booking.priceBreakdown.rentalRate;
  // Estimate only; the extra hire is settled directly with the owner
  const additionalRentalAmount = additionalDays * dailyRate;

  const t = {
    en: {
      title: 'Request Rental Extension',
      subtitle: 'Extend your equipment hire period directly, pending owner schedule approval.',
      assetLabel: 'Equipment Asset',
      currentReturn: 'Current Return Date',
      newReturn: 'Requested New Return Date',
      additionalDaysLabel: 'Additional Days',
      dailyRateLabel: 'Base Daily Rate',
      additionalRentalSubtotal: 'Additional Rental Subtotal',
      additionalTotalLabel: 'Estimated Extra Hire (settled with owner)',
      reasonLabel: 'Reason for Extension (Optional)',
      reasonPlaceholder: 'e.g. Site concrete pour delayed by rain; need 2 extra days for curing...',
      submitBtn: 'Submit Extension Request',
      cancelBtn: 'Cancel',
      note: 'Note: The owner will review availability. Your booking dates and schedule will update upon owner confirmation.',
    },
    sw: {
      title: 'Omba Kuongeza Muda wa Ukodishaji',
      subtitle: 'Ongeza muda wako wa kutumia kifaa moja kwa moja, ukisubiri idhini ya mmiliki.',
      assetLabel: 'Kifaa / Mtambo',
      currentReturn: 'Tarehe ya Sasa ya Kurudisha',
      newReturn: 'Tarehe Mpya Inayoombwa',
      additionalDaysLabel: 'Siku za Ziada',
      dailyRateLabel: 'Bei ya Siku',
      additionalRentalSubtotal: 'Jumla Ndogo ya Ziada',
      additionalTotalLabel: 'Makadirio ya Gharama ya Ziada (hulipwa kwa mmiliki)',
      reasonLabel: 'Sababu ya Kuongeza (Sio Lazima)',
      reasonPlaceholder: 'mfano Kazi ya kumwaga zege imecheleweshwa na mvua; nahitaji siku 2 zaidi...',
      submitBtn: 'Tuma Ombi la Ziada',
      cancelBtn: 'Ghairi',
      note: 'Kumbuka: Mmiliki atakagua upatikanaji wa kifaa. Ratiba yako itasasishwa punde atakapoidhinisha.',
    },
    fr: {
      title: 'Demander une Prolongation de Location',
      subtitle: 'Prolongez votre période de location directement, sous réserve de l’approbation du propriétaire.',
      assetLabel: 'Équipement / Matériel',
      currentReturn: 'Date de Retour Actuelle',
      newReturn: 'Nouvelle Date de Retour Souhaitée',
      additionalDaysLabel: 'Jours Supplémentaires',
      dailyRateLabel: 'Tarif Journalier de Base',
      additionalRentalSubtotal: 'Sous-total Location Supplémentaire',
      additionalTotalLabel: 'Location Supplémentaire Estimée (réglée avec le propriétaire)',
      reasonLabel: 'Motif de la Prolongation (Facultatif)',
      reasonPlaceholder: 'ex. Coulage du béton retardé par la pluie ; besoin de 2 jours de séchage supplémentaires...',
      submitBtn: 'Envoyer la Demande de Prolongation',
      cancelBtn: 'Annuler',
      note: 'Remarque : Le propriétaire examinera la disponibilité. Les dates seront mises à jour dès confirmation.',
    },
  }[language];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (additionalDays <= 0) {
      setErrorMsg('Please select a date that is after the current booking end date.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const updated = await requestBookingExtension(booking.id, {
        requestedEndDate,
        reason: reason.trim() || undefined,
      });
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit extension request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-stone-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-900">
              <Calendar className="w-5 h-5" />
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {/* Asset Summary */}
          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs">
            <span className="text-stone-400 font-medium uppercase tracking-wider text-[10px]">
              {t.assetLabel}
            </span>
            <p className="font-bold text-stone-900 text-sm mt-0.5">{booking.assetTitle}</p>
            <div className="mt-2 flex items-center justify-between text-stone-600 font-mono">
              <span>{t.currentReturn}:</span>
              <strong className="text-stone-900">{formatDate(booking.endDate)}</strong>
            </div>
          </div>

          {/* New End Date Input */}
          <div>
            <label className="block text-xs font-semibold text-stone-800 mb-1">
              {t.newReturn} *
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="date"
                min={minDateStr}
                value={requestedEndDate}
                onChange={(e) => setRequestedEndDate(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2.5 text-xs font-mono font-bold bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-600 text-stone-900 cursor-pointer"
              />
            </div>
          </div>

          {/* Quotation Calculation Box */}
          <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-300 space-y-2 text-xs">
            <div className="flex justify-between text-stone-600">
              <span>{t.additionalDaysLabel}</span>
              <span className="font-mono font-bold text-stone-900">
                +{additionalDays} {booking.rentalUnit}s
              </span>
            </div>

            <div className="flex justify-between text-stone-600">
              <span>{t.dailyRateLabel}</span>
              <span className="font-mono text-stone-900">{formatTZS(dailyRate)} / day</span>
            </div>

            <div className="flex justify-between text-stone-600">
              <span>{t.additionalRentalSubtotal}</span>
              <span className="font-mono tabular-nums text-stone-900">
                {formatTZS(additionalRentalAmount)}
              </span>
            </div>

            <div className="pt-2 border-t border-amber-300 flex justify-between font-bold text-sm text-stone-900">
              <span>{t.additionalTotalLabel}</span>
              <span className="font-mono tabular-nums text-amber-800">
                {formatTZS(additionalRentalAmount)}
              </span>
            </div>
          </div>

          {/* Reason Input */}
          <div>
            <label className="block text-xs font-semibold text-stone-800 mb-1">
              {t.reasonLabel}
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t.reasonPlaceholder}
              className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-600 text-stone-900"
            />
          </div>

          {/* Explanatory Note */}
          <p className="text-[11px] text-stone-500 leading-relaxed flex items-start gap-1.5">
            <Clock className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
            <span>{t.note}</span>
          </p>

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-stone-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 cursor-pointer"
            >
              {t.cancelBtn}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || additionalDays <= 0}
              className="px-5 py-2.5 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 active:bg-amber-900 disabled:opacity-50 rounded-xl transition-colors cursor-pointer shadow-sm flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <span>{t.submitBtn}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
