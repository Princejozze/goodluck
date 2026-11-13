import React, { useState, useEffect } from 'react';
import { Booking, Asset } from '../types/index.js';
import {
  fetchIntegrationsStatus,
  sendWhatsAppSmsAlert,
  verifyGovernmentRegistry,
} from '../services/api.js';
import { formatTZS } from '../utils/formatters.js';
import {
  X,
  Globe,
  MessageSquare,
  Smartphone,
  FileSpreadsheet,
  Calendar,
  HardDrive,
  ShieldCheck,
  Radio,
  CheckCircle2,
  ExternalLink,
  Send,
  RefreshCw,
  Database,
} from 'lucide-react';

interface IntegrationsHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookings: Booking[];
  assets: Asset[];
}

export const IntegrationsHubModal: React.FC<IntegrationsHubModalProps> = ({
  isOpen,
  onClose,
  bookings,
  assets,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'whatsapp' | 'workspace' | 'registry' | 'telematics'>('overview');
  const [integrations, setIntegrations] = useState<any[]>([]);

  // WhatsApp / SMS Alert State
  const [alertPhone, setAlertPhone] = useState('255793481147');
  const [alertChannel, setAlertChannel] = useState<'whatsapp' | 'sms'>('whatsapp');
  const [alertTemplate, setAlertTemplate] = useState<'dispatch_waybill' | 'return_reminder'>('dispatch_waybill');
  const [alertResult, setAlertResult] = useState<any | null>(null);

  // Registry Validator State
  const [registryType, setRegistryType] = useState<'NIDA' | 'TRA_TIN' | 'BRELA'>('NIDA');
  const [registryInput, setRegistryInput] = useState('19880412112050000124');
  const [registryResult, setRegistryResult] = useState<any | null>(null);


  // Google Workspace Sync State
  const [workspaceAccessToken, setWorkspaceAccessToken] = useState<string>('');
  const [workspaceStatusMsg, setWorkspaceStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchIntegrationsStatus()
        .then(setIntegrations)
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSendAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const sampleBookingCode = bookings[0]?.bookingCode || 'RT-2026-8841';
      const res = await sendWhatsAppSmsAlert({
        phone: alertPhone,
        channel: alertChannel,
        templateType: alertTemplate,
        bookingCode: sampleBookingCode,
      });
      setAlertResult(res);
    } catch (err) {
      console.error(err);
    }
  };

  const handleVerifyRegistry = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await verifyGovernmentRegistry({
        registryType,
        identifier: registryInput,
      });
      setRegistryResult(res);
    } catch (err) {
      console.error(err);
    }
  };

  const handleGoogleSheetsExport = async () => {
    if (workspaceAccessToken) {
      try {
        const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${workspaceAccessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            properties: { title: `RENTZ Tanzania Bookings - ${new Date().toLocaleDateString()}` },
          }),
        });
        if (res.ok) {
          const sheet = await res.json();
          setWorkspaceStatusMsg(`Created live Google Sheet: ${sheet.spreadsheetUrl}`);
          return;
        }
      } catch (e) {
        console.error(e);
      }
    }
    // Also provide instant CSV ledger download compatible with Google Sheets import
    const headers = ['BookingCode', 'AssetTitle', 'Renter', 'StartDate', 'EndDate', 'EstimatedHireTZS', 'Status'];
    const rows = bookings.map((b) => [
      b.bookingCode,
      `"${b.assetTitle}"`,
      `"${b.renterName}"`,
      b.startDate,
      b.endDate,
      b.priceBreakdown.estimatedTotal,
      b.status,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RENTZ_Bookings_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setWorkspaceStatusMsg('Exported bookings (.csv for Google Sheets). Connect Google OAuth to push directly to Google Drive/Sheets.');
  };

  const handleGoogleCalendarSync = () => {
    const sample = bookings[0];
    const title = sample ? `RENTZ Hire: ${sample.assetTitle} (${sample.bookingCode})` : 'RENTZ Equipment Dispatch';
    const details = sample
      ? `Renter: ${sample.renterName} (${sample.renterPhone}) | Estimated hire: ${formatTZS(sample.priceBreakdown.estimatedTotal)} | QR Token: ${sample.qrHandoverToken}`
      : 'RENTZ Tanzania Equipment Hire Schedule';
    const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      title
    )}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(
      sample?.deliveryAddress || 'Dar es Salaam, Tanzania'
    )}`;
    window.open(gcalUrl, '_blank', 'noopener,noreferrer');
    setWorkspaceStatusMsg('Opened Google Calendar event creator for active equipment booking.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/75 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-stone-200 max-w-5xl w-full shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-stone-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight">
                Linked Apps & Tools
              </h2>
              <p className="text-xs text-stone-400">
                WhatsApp links, CSV export, ID format checks. No outside service is connected to a live API yet.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-stone-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-stone-100 px-6 py-2.5 border-b border-stone-200 flex flex-wrap items-center gap-1.5">
          {[
            { id: 'overview', label: 'Connection Status', icon: Globe },
            { id: 'whatsapp', label: 'WhatsApp Message Links', icon: MessageSquare },
            { id: 'workspace', label: 'Sheets & Calendar Export', icon: FileSpreadsheet },
            { id: 'registry', label: 'ID Format Check', icon: ShieldCheck },
            { id: 'telematics', label: 'Yard Locations & Offline', icon: Radio },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  activeTab === t.id
                    ? 'bg-stone-900 text-amber-400 shadow-2xs'
                    : 'text-stone-600 hover:bg-stone-200/70'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {integrations.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl border border-stone-200 bg-stone-50/70 space-y-2 flex flex-col justify-between"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-stone-200 text-stone-700">
                          {item.category}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                            item.status === 'not_connected'
                              ? 'text-stone-600 bg-stone-100 border-stone-300'
                              : 'text-amber-800 bg-amber-50 border-amber-200'
                          }`}
                        >
                          {item.status === 'manual'
                            ? 'MANUAL'
                            : item.status === 'format_check_only'
                            ? 'FORMAT CHECK ONLY'
                            : 'NOT CONNECTED'}
                        </span>
                      </div>
                      <h3 className="text-sm font-black text-stone-900">{item.name}</h3>
                      <p className="text-xs text-stone-600 leading-relaxed">{item.description}</p>
                    </div>
                    <div className="pt-2 border-t border-stone-200/80 flex items-center justify-between text-[11px] font-mono text-stone-500">
                      <span className="truncate max-w-[260px]">{item.endpoint}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'whatsapp' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <form onSubmit={handleSendAlert} className="space-y-4 bg-stone-50 p-5 rounded-2xl border border-stone-200">
                <h3 className="text-sm font-black text-stone-900">
                  Prepare a WhatsApp Message
                </h3>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Recipient Phone (+255...)
                  </label>
                  <input
                    type="text"
                    value={alertPhone}
                    onChange={(e) => setAlertPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono bg-white border border-stone-300 rounded-xl"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">Channel</label>
                    <select
                      value={alertChannel}
                      onChange={(e) => setAlertChannel(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-xl font-semibold"
                    >
                      <option value="whatsapp">WhatsApp (wa.me link, you press Send)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">Template</label>
                    <select
                      value={alertTemplate}
                      onChange={(e) => setAlertTemplate(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-xl font-semibold"
                    >
                      <option value="dispatch_waybill">Dispatch & Waybill Alert</option>
                      <option value="return_reminder">Hire Return Due Reminder</option>
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  Generate WhatsApp Link
                </button>
              </form>

              <div className="p-5 rounded-2xl border border-stone-200 bg-white space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400">
                  Message Preview (not sent yet)
                </h4>
                {alertResult ? (
                  <div className="space-y-3 text-xs">
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 font-mono">
                      <div>Recipient: <strong>{alertResult.recipient}</strong></div>
                    </div>
                    <p className="p-3 rounded-xl bg-stone-100 text-stone-800 italic">
                      "{alertResult.messageBody}"
                    </p>
                    <a
                      href={alertResult.whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs"
                    >
                      Launch Direct WhatsApp Chat
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ) : (
                  <p className="text-xs text-stone-500">
                    Test sending an automated booking, dispatch waybill, or return reminder alert to any Tanzanian phone number.
                  </p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'workspace' && (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl border border-stone-200 bg-stone-50 space-y-4">
                <h3 className="text-sm font-black text-stone-900">
                  Google Workspace Integration (Sheets, Calendar & Drive)
                </h3>
                <p className="text-xs text-stone-600">
                  Export RENTZ bookings to Google Sheets, push equipment dispatch windows to Google Calendar, and archive signed PDF contracts in Google Drive.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    onClick={handleGoogleSheetsExport}
                    className="p-4 rounded-xl bg-white border border-stone-200 hover:border-emerald-500 text-left space-y-1.5 transition-all"
                  >
                    <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                    <div className="text-xs font-black text-stone-900">Export to Google Sheets</div>
                    <div className="text-[11px] text-stone-500">
                      Export bookings and estimated hire values
                    </div>
                  </button>

                  <button
                    onClick={handleGoogleCalendarSync}
                    className="p-4 rounded-xl bg-white border border-stone-200 hover:border-blue-500 text-left space-y-1.5 transition-all"
                  >
                    <Calendar className="w-5 h-5 text-blue-600" />
                    <div className="text-xs font-black text-stone-900">Add to Google Calendar</div>
                    <div className="text-[11px] text-stone-500">
                      Schedule dispatch & return inspection reminders
                    </div>
                  </button>

                  <button
                    onClick={() =>
                      setWorkspaceStatusMsg(
                        'Use "Print / Save PDF" in the Document Center to save directly to Google Drive.'
                      )
                    }
                    className="p-4 rounded-xl bg-white border border-stone-200 hover:border-amber-500 text-left space-y-1.5 transition-all"
                  >
                    <HardDrive className="w-5 h-5 text-amber-600" />
                    <div className="text-xs font-black text-stone-900">Archive to Google Drive</div>
                    <div className="text-[11px] text-stone-500">
                      Store signed Hire Agreements & Gate Passes in Drive
                    </div>
                  </button>
                </div>

                {workspaceStatusMsg && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs font-semibold">
                    {workspaceStatusMsg}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'registry' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <form onSubmit={handleVerifyRegistry} className="p-5 rounded-2xl border border-stone-200 bg-stone-50 space-y-4">
                <h3 className="text-sm font-black text-stone-900">
                  ID Number Format Check (NIDA / BRELA / TRA)
                </h3>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Government Authority
                  </label>
                  <select
                    value={registryType}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      setRegistryType(val);
                      if (val === 'NIDA') setRegistryInput('19880412112050000124');
                      if (val === 'TRA_TIN') setRegistryInput('124-890-411');
                      if (val === 'BRELA') setRegistryInput('BRELA-ORS-149208');
                    }}
                    className="w-full px-3 py-2 text-xs font-bold bg-white border border-stone-300 rounded-xl"
                  >
                    <option value="NIDA">NIDA (20-Digit National ID)</option>
                    <option value="TRA_TIN">TRA Taxpayer Identification Number (9-Digit TIN)</option>
                    <option value="BRELA">BRELA Certificate of Incorporation</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Identifier / Receipt Number
                  </label>
                  <input
                    type="text"
                    value={registryInput}
                    onChange={(e) => setRegistryInput(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono bg-white border border-stone-300 rounded-xl"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-amber-400 text-xs font-bold"
                >
                  Check Format (not a registry lookup)
                </button>
              </form>

              <div className="p-5 rounded-2xl border border-stone-200 bg-white space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400">
                  Verification Result
                </h4>
                {registryResult ? (
                  <div className="space-y-2.5 text-xs">
                    <div
                      className={`p-3 rounded-xl border font-bold ${
                        registryResult.valid
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          : 'bg-amber-50 border-amber-200 text-amber-900'
                      }`}
                    >
                      {registryResult.status}
                    </div>
                    <div className="font-semibold text-stone-900">{registryResult.registry}</div>
                    <div className="font-mono text-stone-600">ID: {registryResult.identifier}</div>
                    <div className="text-stone-700">{registryResult.holderName}</div>
                  </div>
                ) : (
                  <p className="text-xs text-stone-500">
                    Select NIDA, TRA TIN, or BRELA to check the format of contractor and owner credentials.
                  </p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'telematics' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl border border-stone-200 bg-stone-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Database className="w-5 h-5 text-amber-600" />
                  <div>
                    <div className="text-xs font-black text-stone-900">
                      Offline Support
                    </div>
                    <div className="text-[11px] text-stone-600">
                      Service worker caches assets & categories for low-connectivity yards; Field Ops inspection queue syncs automatically when back online.
                    </div>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-mono text-[10px] font-bold">
                  ACTIVE
                </span>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase text-stone-500">
                  Equipment Yard Locations (no GPS trackers connected)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {assets.slice(0, 6).map((asset) => {
                    const lat = asset.location.coordinates?.lat ?? asset.location.lat ?? -6.8161;
                    const lng = asset.location.coordinates?.lng ?? asset.location.lng ?? 39.2803;
                    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
                    return (
                      <div
                        key={asset.id}
                        className="p-3.5 rounded-xl border border-stone-200 bg-white flex items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="font-bold text-stone-900">{asset.title}</div>
                          <div className="font-mono text-[11px] text-stone-500">
                            {asset.location.district}, {asset.location.region} • {lat.toFixed(4)}, {lng.toFixed(4)}
                          </div>
                        </div>
                        <a
                          href={mapUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 rounded-lg bg-stone-900 text-amber-400 font-bold text-[11px] flex items-center gap-1 shrink-0"
                        >
                          Yard on Map
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
