import React, { useState } from 'react';
import { Booking, User } from '../types/index.js';
import { createDispute } from '../services/api.js';
import { X, AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react';

interface DisputeModalProps {
  booking: Booking | null;
  currentUser: User;
  onClose: () => void;
  onDisputeRaised: () => void;
}

export const DisputeModal: React.FC<DisputeModalProps> = ({
  booking,
  currentUser,
  onClose,
  onDisputeRaised,
}) => {
  if (!booking) return null;

  const [reason, setReason] = useState('Equipment Condition Discrepancy');
  const [description, setDescription] = useState('');
  const [claimAmount, setClaimAmount] = useState<number | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const reasons = [
    'Equipment Malfunction on Site',
    'Equipment Condition Discrepancy from Listing',
    'Late Return or Unauthorized Holdover',
    'Physical Damage or Broken Accessory',
    'Delivery Delay / Failure to Supply Operator',
    'Disagreement on Hire Charges or Repair Costs',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setErrorMsg('Please describe the problem details.');
      return;
    }
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await createDispute({
        bookingId: booking.id,
        reason,
        description,
        claimAmount: claimAmount ? Number(claimAmount) : undefined,
      });
      setSuccess(true);
      setTimeout(() => {
        onDisputeRaised();
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to file dispute');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50/80">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h3 className="text-base font-bold text-stone-900">
              Report Equipment Problem / Dispute
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs">
            <p className="font-semibold text-stone-900">{booking.assetTitle}</p>
            <p className="text-stone-500 font-mono mt-0.5">Booking Ref: {booking.bookingCode}</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Dispute Reason</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-600 cursor-pointer"
            >
              {reasons.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Detailed Description & Evidence Notes
            </label>
            <textarea
              rows={4}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain the specific issue, what went wrong, time of occurrence, and accessories affected..."
              className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Claim Amount (TZS, optional)
            </label>
            <input
              type="number"
              value={claimAmount || ''}
              onChange={(e) => setClaimAmount(e.target.value ? Number(e.target.value) : undefined)}
              placeholder="e.g. 150000"
              className="w-full px-3 py-2 text-xs font-mono bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-600"
            />
            <p className="text-[11px] text-stone-500 mt-1">
              Estimated repair cost or amount in dispute, to be settled directly between owner and renter.
            </p>
          </div>

          {errorMsg && (
            <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded border border-red-200">
              {errorMsg}
            </p>
          )}

          {success && (
            <p className="text-xs text-amber-900 bg-amber-50 p-2.5 rounded border border-amber-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-amber-700" />
              <span>Dispute submitted to RENTZ Legal & Resolution Team.</span>
            </p>
          )}

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || success}
              className="px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm flex items-center gap-2 cursor-pointer"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>File Formal Dispute</span>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
