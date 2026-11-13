import React, { useState } from 'react';
import { usePWAInstall, useOnlineStatus } from '../hooks/usePWAInstall.js';
import { Download, Smartphone, X, WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  if (isInstalled) {
    return null;
  }

  return (
    <>
      <button
        onClick={async () => {
          if (isInstallable) {
            await install();
          } else {
            setShowGuideModal(true);
          }
        }}
        className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-amber-950 bg-amber-100/90 hover:bg-amber-200 border border-amber-300 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
        title="Install RENTZ Mobile & Field Ops App"
      >
        <Download className="w-3.5 h-3.5 text-amber-800" />
        <span className="hidden xl:inline">{isIOS ? 'Install on iOS' : 'Install App'}</span>
      </button>

      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-700 text-white">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-stone-900">
                    Install RENTZ Companion App (PWA)
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Offline Field Ops, QR Scanner & Driver Dispatch
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs text-stone-700">
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Works Offline in Remote Sites & Farms</span>
                </p>
                <p className="text-[11px] text-amber-900">
                  Field Operations officers and transport drivers can record equipment dispatch & return forms without cellular signal and auto-sync when back online.
                </p>
              </div>

              {isIOS ? (
                <div className="space-y-2 p-3 bg-stone-50 rounded-xl border border-stone-200">
                  <p className="font-bold text-stone-900">Install on iPhone / iPad (Safari):</p>
                  <ol className="list-decimal list-inside space-y-1 text-stone-600">
                    <li>Tap the <strong>Share</strong> icon in your Safari toolbar.</li>
                    <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
                    <li>Launch <strong>RENTZ</strong> directly from your home screen in standalone mode.</li>
                  </ol>
                </div>
              ) : (
                <div className="space-y-2 p-3 bg-stone-50 rounded-xl border border-stone-200">
                  <p className="font-bold text-stone-900">Install on Android / Desktop Chrome or Edge:</p>
                  <ol className="list-decimal list-inside space-y-1 text-stone-600">
                    <li>Click the <strong>Install App</strong> icon in your browser address bar or menu.</li>
                    <li>Confirm <strong>Install</strong> to add RENTZ to your home screen or desktop dock.</li>
                  </ol>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowGuideModal(false)}
              className="mt-5 w-full rounded-xl bg-stone-900 py-2.5 text-xs font-bold text-white hover:bg-stone-800 transition-colors cursor-pointer"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC<{
  queuedCount?: number;
  onSyncQueue?: () => void;
}> = ({ queuedCount = 0, onSyncQueue }) => {
  const isOnline = useOnlineStatus();

  if (isOnline && queuedCount === 0) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-3 rounded-xl bg-stone-900 border border-amber-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xl">
      {!isOnline ? (
        <>
          <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
          <div>
            <p className="font-bold text-amber-300">Offline Field Mode Active</p>
            <p className="text-[11px] text-stone-300">
              Cached catalog & local Field Ops inspection queue enabled ({queuedCount} queued)
            </p>
          </div>
        </>
      ) : (
        <>
          <RefreshCw className="w-4 h-4 text-amber-400 shrink-0" />
          <div>
            <p className="font-bold text-amber-300">Connection Restored ({queuedCount} Offline Forms Pending)</p>
          </div>
          {onSyncQueue && (
            <button
              onClick={onSyncQueue}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[11px] font-bold cursor-pointer"
            >
              Sync Now
            </button>
          )}
        </>
      )}
    </div>
  );
};
