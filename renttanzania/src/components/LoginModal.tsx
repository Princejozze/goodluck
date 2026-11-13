import React, { useState } from 'react';
import { User, AppLanguage, SignInPortal } from '../types/index.js';
import { loginUser, registerUser, loginWithGoogle } from '../services/api.js';
import { signInWithGoogleForRentz } from '../services/firebase.js';
import {
  X,
  UserCheck,
  Lock,
  Mail,
  Phone,
  Building2,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Fingerprint,
  FileText,
  Store,
} from 'lucide-react';

// The public site opens 'buyer'; the Seller Centre (/seller) and staff page (/staff) open their own
export type LoginPortalType = SignInPortal;

type RedirectTab = 'browse' | 'list' | 'renter' | 'owner' | 'admin' | 'operations';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User, redirectTab: RedirectTab, message: string) => void;
  portal?: LoginPortalType;
  // Shown above the form, e.g. why sign-in is needed for the action the visitor tried
  reason?: string | null;
  language: AppLanguage;
}

const MIN_PASSWORD_LENGTH = 8;

function tabForRole(role: User['role']): RedirectTab {
  if (role === 'owner') return 'owner';
  if (role === 'admin') return 'admin';
  if (role === 'operations') return 'operations';
  return 'browse';
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  portal = 'buyer',
  reason,
  language,
}) => {
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  // Form states
  const [identifier, setIdentifier] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [tinNumber, setTinNumber] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Staff accounts are granted by an administrator, so the staff page only signs in
  const registering = isRegisterMode && portal !== 'staff';

  const t = {
    en: {
      titles: { buyer: 'Sign in to RENTZ', seller: 'RENTZ Seller Centre', staff: 'RENTZ Staff Sign-In' },
      registerTitles: { buyer: 'Create your RENTZ account', seller: 'Become a RENTZ seller', staff: '' },
      subtitles: {
        buyer: 'Hire machinery, vehicles and tools across Tanzania. Free to use.',
        seller: 'List your equipment and manage booking requests. Seller accounts can also rent.',
        staff: 'For RENTZ administrators and field operations only.',
      },
      sellerNote:
        'New sellers start as Ordinary Owners. RENTZ administrators award the Verified badge after checking your TRA TIN / BRELA registration.',
      googleTitle: 'Continue with Google',
      loginBtn: 'Sign In',
      registerBtn: 'Create Account',
      registerSellerBtn: 'Create Seller Account',
      needAccount: "Don't have an account? Create one",
      haveAccount: 'Already have an account? Sign in',
      orDivider: 'or',
      identifierLabel: 'Email or mobile number',
      identifierPlaceholder: 'name@example.com or +255 7XX XXX XXX',
      phoneLabel: 'Mobile number',
      emailLabel: 'Email (optional)',
      passwordLabel: 'Password',
      confirmLabel: 'Confirm password',
      passwordHint: `At least ${MIN_PASSWORD_LENGTH} characters`,
      nameLabel: 'Full name',
      businessLabel: 'Business / trade name (optional)',
      tinLabel: 'TRA TIN or BRELA No. (optional)',
      passwordMismatch: 'The two passwords do not match.',
      passwordTooShort: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    },
    sw: {
      titles: { buyer: 'Ingia RENTZ', seller: 'Kituo cha Wauzaji RENTZ', staff: 'Kuingia kwa Wafanyakazi wa RENTZ' },
      registerTitles: { buyer: 'Fungua akaunti ya RENTZ', seller: 'Kuwa muuzaji wa RENTZ', staff: '' },
      subtitles: {
        buyer: 'Kodisha mitambo, magari na vifaa kote Tanzania. Ni bure.',
        seller: 'Orodhesha vifaa vyako na simamia maombi. Akaunti za wauzaji zinaweza pia kukodi.',
        staff: 'Kwa wasimamizi na maafisa wa operesheni wa RENTZ tu.',
      },
      sellerNote:
        'Wauzaji wapya huanza kama Wamiliki wa Kawaida. Wasimamizi wa RENTZ hutoa beji ya Kuthibitishwa baada ya kukagua TIN ya TRA / usajili wa BRELA.',
      googleTitle: 'Endelea na Google',
      loginBtn: 'Ingia',
      registerBtn: 'Fungua Akaunti',
      registerSellerBtn: 'Fungua Akaunti ya Muuzaji',
      needAccount: 'Huna akaunti? Fungua moja',
      haveAccount: 'Tayari una akaunti? Ingia',
      orDivider: 'au',
      identifierLabel: 'Barua pepe au nambari ya simu',
      identifierPlaceholder: 'jina@mfano.com au +255 7XX XXX XXX',
      phoneLabel: 'Nambari ya simu',
      emailLabel: 'Barua pepe (hiari)',
      passwordLabel: 'Nenosiri',
      confirmLabel: 'Thibitisha nenosiri',
      passwordHint: `Angalau herufi ${MIN_PASSWORD_LENGTH}`,
      nameLabel: 'Jina kamili',
      businessLabel: 'Jina la biashara (hiari)',
      tinLabel: 'TIN ya TRA au Namba ya BRELA (hiari)',
      passwordMismatch: 'Manenosiri mawili hayalingani.',
      passwordTooShort: `Nenosiri liwe na angalau herufi ${MIN_PASSWORD_LENGTH}.`,
    },
    fr: {
      titles: { buyer: 'Se connecter à RENTZ', seller: 'Espace Vendeurs RENTZ', staff: 'Connexion Personnel RENTZ' },
      registerTitles: { buyer: 'Créer votre compte RENTZ', seller: 'Devenir vendeur RENTZ', staff: '' },
      subtitles: {
        buyer: 'Louez engins, véhicules et outils partout en Tanzanie. Gratuit.',
        seller: 'Publiez votre matériel et gérez les demandes. Les vendeurs peuvent aussi louer.',
        staff: 'Réservé aux administrateurs et aux opérations RENTZ.',
      },
      sellerNote:
        'Les nouveaux vendeurs sont « Ordinaires ». Les administrateurs RENTZ attribuent le badge Vérifié après contrôle du TIN TRA / BRELA.',
      googleTitle: 'Continuer avec Google',
      loginBtn: 'Se connecter',
      registerBtn: 'Créer un compte',
      registerSellerBtn: 'Créer un compte vendeur',
      needAccount: 'Pas de compte ? Créez-en un',
      haveAccount: 'Déjà un compte ? Connectez-vous',
      orDivider: 'ou',
      identifierLabel: 'Email ou numéro de téléphone',
      identifierPlaceholder: 'nom@exemple.com ou +255 7XX XXX XXX',
      phoneLabel: 'Numéro de téléphone',
      emailLabel: 'Email (optionnel)',
      passwordLabel: 'Mot de passe',
      confirmLabel: 'Confirmer le mot de passe',
      passwordHint: `Au moins ${MIN_PASSWORD_LENGTH} caractères`,
      nameLabel: 'Nom complet',
      businessLabel: "Nom de l'entreprise (optionnel)",
      tinLabel: 'TIN TRA ou BRELA (optionnel)',
      passwordMismatch: 'Les deux mots de passe ne correspondent pas.',
      passwordTooShort: `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`,
    },
  }[language];

  const finish = (user: User, message: string) => {
    onSuccess(user, tabForRole(user.role), message);
    onClose();
  };

  // Google sign-in: Firebase proves the Google account, the server verifies its ID token
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const { idToken } = await signInWithGoogleForRentz();
      const response = await loginWithGoogle(idToken, portal);
      finish(response.user, response.message);
    } catch (err: any) {
      setError(err.message || 'Google authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (registering) {
      if (password.length < MIN_PASSWORD_LENGTH) return setError(t.passwordTooShort);
      if (password !== confirmPassword) return setError(t.passwordMismatch);
    }

    setLoading(true);
    try {
      const response = registering
        ? await registerUser({
            name: fullName.trim(),
            phone: registerPhone.trim(),
            email: registerEmail.trim() || undefined,
            password,
            portal,
            companyName: portal === 'seller' ? companyName.trim() || undefined : undefined,
            tinNumber: portal === 'seller' ? tinNumber.trim() || undefined : undefined,
          })
        : await loginUser({ identifier: identifier.trim(), password, portal });
      finish(response.user, response.message || `Welcome, ${response.user.name}!`);
    } catch (err: any) {
      setError(err.message || 'Invalid credentials. Please verify your details.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full pl-9 pr-3 py-2.5 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none';
  const HeaderIcon = portal === 'seller' ? Store : portal === 'staff' ? ShieldCheck : UserCheck;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/70 backdrop-blur-sm flex items-start sm:items-center justify-center p-2 sm:p-4">
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[92vh] flex flex-col border border-stone-200 overflow-hidden relative my-auto animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div
          className={`px-6 py-5 flex items-start justify-between shrink-0 ${
            portal === 'buyer' ? 'bg-white border-b border-stone-200' : 'bg-stone-900 text-white'
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                portal === 'buyer' ? 'bg-amber-100 text-amber-800' : 'bg-amber-500/20 text-amber-400'
              }`}
            >
              <HeaderIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold tracking-tight">
                {registering ? t.registerTitles[portal] : t.titles[portal]}
              </h2>
              <p className={`text-xs mt-0.5 ${portal === 'buyer' ? 'text-stone-500' : 'text-stone-300'}`}>
                {t.subtitles[portal]}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              portal === 'buyer' ? 'text-stone-400 hover:text-stone-700 hover:bg-stone-100' : 'text-stone-400 hover:text-white hover:bg-stone-800'
            }`}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-5 space-y-4">
          {reason && !error && (
            <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-900">{reason}</div>
          )}
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          {portal === 'seller' && registering && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-xs text-amber-950">
              <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <span>{t.sellerNote}</span>
            </div>
          )}

          {/* Google */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-800 text-sm font-bold transition-colors cursor-pointer disabled:opacity-50"
          >
            <svg viewBox="0 0 48 48" className="w-4 h-4" aria-hidden="true">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
            </svg>
            <span>{t.googleTitle}</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-stone-200" />
            <span className="text-[11px] uppercase tracking-wider text-stone-400 font-semibold">{t.orDivider}</span>
            <div className="flex-1 h-px bg-stone-200" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {registering ? (
              <>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">{t.nameLabel}</label>
                  <div className="relative">
                    <UserCheck className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                    <input type="text" required autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Baraka Elias" className={inputClass} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">{t.phoneLabel}</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                    <input type="tel" required autoComplete="tel" value={registerPhone} onChange={(e) => setRegisterPhone(e.target.value)} placeholder="+255 7XX XXX XXX" className={inputClass} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">{t.emailLabel}</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                    <input type="email" autoComplete="email" value={registerEmail} onChange={(e) => setRegisterEmail(e.target.value)} placeholder="name@example.com" className={inputClass} />
                  </div>
                </div>
                {portal === 'seller' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">{t.businessLabel}</label>
                      <div className="relative">
                        <Building2 className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                        <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g. Mrema Tools" className={inputClass} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">{t.tinLabel}</label>
                      <div className="relative">
                        <FileText className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                        <input type="text" value={tinNumber} onChange={(e) => setTinNumber(e.target.value)} placeholder="e.g. 109-882-941" className={`${inputClass} font-mono`} />
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">{t.identifierLabel}</label>
                <div className="relative">
                  {identifier.includes('@') ? (
                    <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                  ) : (
                    <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                  )}
                  <input type="text" required autoComplete="username" value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder={t.identifierPlaceholder} className={inputClass} />
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-stone-700">{t.passwordLabel}</label>
                {registering && <span className="text-[10px] text-stone-400">{t.passwordHint}</span>}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={registering ? MIN_PASSWORD_LENGTH : undefined}
                  autoComplete={registering ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-9 py-2.5 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-stone-400 hover:text-stone-600 cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {registering && (
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">{t.confirmLabel}</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                  <input type={showPassword ? 'text' : 'password'} required autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" className={inputClass} />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl font-bold text-sm text-white bg-amber-700 hover:bg-amber-800 active:bg-amber-900 transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{registering ? (portal === 'seller' ? t.registerSellerBtn : t.registerBtn) : t.loginBtn}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {portal !== 'staff' && (
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(!isRegisterMode);
                setError(null);
              }}
              className="w-full text-center text-xs text-amber-800 hover:text-amber-950 font-bold hover:underline cursor-pointer"
            >
              {isRegisterMode ? t.haveAccount : t.needAccount}
            </button>
          )}
        </div>

        {portal === 'staff' && (
          <div className="bg-stone-50 border-t border-stone-200 px-6 py-3 text-[11px] text-stone-500 flex items-center gap-2 shrink-0">
            <Fingerprint className="w-4 h-4 text-amber-700 shrink-0" />
            <span>Staff access is granted by a RENTZ administrator.</span>
          </div>
        )}
      </div>
    </div>
  );
};
