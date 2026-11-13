import React, { useState, useEffect } from 'react';
import { SupportMessage, User } from '../types/index.js';
import { fetchSupportMessages, sendSupportMessage } from '../services/api.js';
import { MessageSquare, X, Send, ExternalLink, PhoneCall, ShieldCheck } from 'lucide-react';

interface SupportChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  activeBookingCode?: string;
}

export const SupportChatDrawer: React.FC<SupportChatDrawerProps> = ({
  isOpen,
  onClose,
  currentUser,
  activeBookingCode,
}) => {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [bookingCodeInput, setBookingCodeInput] = useState(activeBookingCode || '');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (activeBookingCode) setBookingCodeInput(activeBookingCode);
  }, [activeBookingCode]);

  const loadMessages = async () => {
    try {
      const data = await fetchSupportMessages();
      setMessages(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadMessages();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    setSending(true);
    try {
      const res = await sendSupportMessage({
        bookingCode: bookingCodeInput || undefined,
        text: inputText,
        channel: 'in_app',
        senderName: currentUser?.name || 'RENTZ Customer',
        senderRole: currentUser?.role || 'renter',
      });
      setMessages(res.messages);
      setInputText('');
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const handleWhatsAppHandoff = () => {
    const context = bookingCodeInput ? `[Booking ${bookingCodeInput}] ` : '';
    const lastText = inputText.trim() || `${context}Habari RENTZ Dispatch Desk, I need assistance with equipment hire / delivery.`;
    const waUrl = `https://wa.me/255793481147?text=${encodeURIComponent(lastText)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-stone-950/50 backdrop-blur-xs">
      <div className="bg-white w-full max-w-md h-full shadow-2xl border-l border-stone-200 flex flex-col">
        {/* Header */}
        <div className="bg-stone-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-600 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold">RENTZ Support & Dispatch Chat</h3>
              <p className="text-[11px] text-stone-400">
                Live Operations Desk + Direct WhatsApp Handoff
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-stone-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* WhatsApp Business Direct Handoff Banner */}
        <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-3 flex items-center justify-between gap-2">
          <div className="text-xs text-emerald-950">
            <div className="font-bold flex items-center gap-1">
              <PhoneCall className="w-3.5 h-3.5 text-emerald-700" />
              Need voice notes or live GPS pin drop?
            </div>
            <div className="text-[11px] text-emerald-800">
              Handoff to WhatsApp Business (255793481147 / 255743801992 • safarigoodluck35@gmail.com)
            </div>
          </div>
          <button
            onClick={handleWhatsAppHandoff}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shrink-0"
          >
            WhatsApp
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        {/* Booking Tag Input */}
        <div className="px-4 py-2 bg-stone-50 border-b border-stone-200 flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase text-stone-500 shrink-0">Booking Ref:</span>
          <input
            type="text"
            value={bookingCodeInput}
            onChange={(e) => setBookingCodeInput(e.target.value)}
            placeholder="Optional (e.g. RT-2026-8841)"
            className="w-full px-2.5 py-1 text-xs font-mono bg-white border border-stone-300 rounded-md"
          />
        </div>

        {/* Message List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-stone-50/50">
          {messages.map((msg) => {
            const isOpsOrAdmin = msg.senderRole === 'operations' || msg.senderRole === 'admin';
            return (
              <div
                key={msg.id}
                className={`p-3.5 rounded-2xl border text-xs space-y-1 ${
                  isOpsOrAdmin
                    ? 'bg-stone-900 text-white border-stone-800 mr-6'
                    : 'bg-white text-stone-900 border-stone-200 ml-6 shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold flex items-center gap-1">
                    {isOpsOrAdmin && <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />}
                    {msg.senderName}
                  </span>
                  <span className="text-[10px] opacity-60 font-mono uppercase">{msg.senderRole}</span>
                </div>
                {msg.bookingCode && (
                  <div className="inline-block px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-mono text-[10px] font-bold">
                    {msg.bookingCode}
                  </div>
                )}
                <p className="leading-relaxed">{msg.text || msg.message}</p>
                <div className="text-[10px] opacity-50 text-right font-mono">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Input Form */}
        <form onSubmit={handleSend} className="p-3 bg-white border-t border-stone-200 flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type message to Owner / RENTZ Dispatch..."
            className="flex-1 px-3.5 py-2.5 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-600"
          />
          <button
            type="submit"
            disabled={sending || !inputText.trim()}
            className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            Send
          </button>
        </form>
      </div>
    </div>
  );
};
