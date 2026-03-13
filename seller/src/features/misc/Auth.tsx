import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { needsOnboarding, onboardingPathForRole, recordOnboardingStatus } from "./onboardingStatus";
import { useLocalization } from '../../localization/LocalizationProvider';
import type { Session } from "../../types/session";
import type { UserRole } from "../../types/roles";
import { getCurrentRole } from "../../auth/roles";
import { readSession, writeSession } from "../../auth/session";
import { authClient } from "../../lib/authApi";
import { sellerBackendApi } from "../../lib/backendApi";
import { useThemeMode } from "../../theme/themeMode";

// EVzone — Auth Pro v4.4 — JS only (modern, relatable, mobile-first, role-aware)
// Route: /auth
// Visual goals:
//  • Soft gradient background • Centered card on desktop, full-bleed on mobile
//  • Familiar social buttons row + password visibility toggle + input icons
//  • Segmented tab pills (Signin / Register); other options moved below to reduce scroll/clutter
// Features:
//  • Role selector (Seller / Service Provider)
//  • Password • Magic Link • OTP • Passkeys (stubs) • 2FA • Recovery
// Changes in v4.4:
//  • Removed “what do you sell/provide” field
//  • Larger checkboxes for easier tapping
//  • Refined “More options” (bottom) card styling
type AuthTab = "signin" | "signup" | "passwordless" | "2fa" | "recovery";
const AUTH_TABS: Array<AuthTab> = ["signin", "signup"];

export type AuthProps = {
  defaultTab?: "signin" | "signup";
  onClose?: () => void;
  variant?: "default" | "modal";
};

type AuthSecuritySession = {
  id: string;
  device?: string;
  ip?: string;
  lastActiveAt?: string;
  metadata?: Record<string, unknown>;
};

type AuthPasskey = {
  id: string;
  identifier: string;
  createdAt: string;
  lastUsedAt?: string;
  label?: string;
};

type AuthSecurityState = {
  twoFactor?: boolean;
  twoFactorMethod?: string;
  twoFactorConfig?: { enabled?: boolean; verified?: boolean; secret?: string | null };
  passkeys?: AuthPasskey[];
  sessions?: AuthSecuritySession[];
  trustedDevices?: Array<Record<string, unknown>>;
};

const ONBOARDING_STORAGE_KEYS = {
  seller: ["seller_onb_pro_v4", "seller_onb_pro_v3", "seller_onb_review_v1", "seller_onb_ui_v1"],
  provider: ["provider_onb_pro_v4", "provider_onb_pro_v31", "provider_onb_review_v1", "provider_onb_ui_v1"],
} as const;

const ONBOARDING_SCREEN_KEYS = {
  seller: "seller-onboarding",
  provider: "provider-onboarding",
} as const;

function readUserAgentDeviceLabel() {
  if (typeof window === "undefined") return "Browser session";
  const ua = window.navigator.userAgent || "";
  if (/iphone|ipad|ios/i.test(ua)) return "Safari / iOS";
  if (/android/i.test(ua)) return "Chrome / Android";
  if (/windows/i.test(ua)) return "Browser / Windows";
  if (/macintosh|mac os/i.test(ua)) return "Browser / macOS";
  if (/linux/i.test(ua)) return "Browser / Linux";
  return "Browser session";
}

function buildAuthSecuritySession(user: Session, trusted: boolean): AuthSecuritySession {
  return {
    id: `auth_${user.userId || user.email || "guest"}`,
    device: readUserAgentDeviceLabel(),
    ip: "Unknown",
    lastActiveAt: new Date().toISOString(),
    metadata: {
      trusted,
      current: true,
      userAgent: typeof window !== "undefined" ? window.navigator.userAgent : "",
      email: user.email || null,
      role: user.role || "seller",
    },
  };
}

export default function EVAuthProV4({ defaultTab = "signin", onClose, variant = "default" }: AuthProps = {}) {
  const brand = useMemo(() => ({ green: '#03CD8C', orange: '#F77F00', ink: '#111827', mist: '#F7F7F7', bg1: '#FDFCFB', bg2: '#F3FAF8' }), []);
  const { t } = useLocalization();
  const { resolvedMode } = useThemeMode();
  const location = useLocation();

  // Upper card now only shows Sign In and Register
  const resolvedDefaultTab = useMemo<AuthTab>(() => {
    const params = new URLSearchParams(location.search);
    const intentParam = params.get("intent") || params.get("tab");
    const stateDefault = (location.state as { defaultTab?: string } | null)?.defaultTab;
    const candidate = stateDefault || intentParam || defaultTab;
    return candidate === "signup" ? "signup" : "signin";
  }, [location.search, location.state, defaultTab]);
  const initialTab: AuthTab = AUTH_TABS.includes(resolvedDefaultTab) ? resolvedDefaultTab : "signin";
  const [tab, setTab] = useState<AuthTab>(initialTab);
  useEffect(() => {
    setTab(AUTH_TABS.includes(resolvedDefaultTab) ? resolvedDefaultTab : "signin");
  }, [resolvedDefaultTab]);
  const [toast, setToast] = useState("");
  const say = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(""), 1500);
  };

  // Global role selection
  const [userType, setUserType] = useState<UserRole>('seller'); // 'seller' | 'provider'

  // Policy
  const policy = { allowedDomains: ["", "@gmail.com", "@outlook.com", "@evzonecharging.com"] };

  // Session
  const [session, setSession] = useState<Session | null>(null);
  useEffect(() => { setSession(readSession()); }, []);
  const broadcastSessionChange = () => {
    try { window.dispatchEvent(new Event("session-changed")); } catch { }
  };
  const saveSession = (u: Session) => { writeSession(u); setSession(u); broadcastSessionChange(); };
  const [securityState, setSecurityState] = useState<AuthSecurityState | null>(null);
  useEffect(() => {
    if (!session?.accessToken && !session?.token) return;
    let active = true;
    void sellerBackendApi
      .getSecuritySettings()
      .then((payload) => {
        if (!active) return;
        setSecurityState(payload as AuthSecurityState);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [session?.accessToken, session?.token]);

  const goLanding = () => {
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  };
  const resolvePostAuthRedirect = (user: Session | null, redirectPath?: string) => {
    if (redirectPath) return redirectPath;
    const role = getCurrentRole(user);
    if (needsOnboarding(role, user)) {
      return onboardingPathForRole(role);
    }
    return "/dashboard";
  };

  const handleAuthSuccess = (
    user: Session,
    message?: string,
    options: { redirectPath?: string; onboardingRequired?: boolean } = {}
  ) => {
    const persistSecurityState = async () => {
      const sessionUser = {
        ...user,
        onboardingRequired: Boolean(options.onboardingRequired),
      };
      saveSession(sessionUser);
      const security = (await sellerBackendApi.getSecuritySettings().catch(() => ({}))) as AuthSecurityState;
      const nextSession = buildAuthSecuritySession(sessionUser, Boolean(sessionUser.remember));
      const sessions = Array.isArray(security.sessions) ? security.sessions.filter((entry) => entry?.id !== nextSession.id) : [];
      const nextSecurity: Record<string, unknown> = {
        ...security,
        sessions: [nextSession, ...sessions].slice(0, 20),
      };
      if (sessionUser.remember) {
        const trustedDevices = Array.isArray(security.trustedDevices) ? security.trustedDevices : [];
        nextSecurity.trustedDevices = [
          {
            id: nextSession.id,
            name: nextSession.device,
            trusted: true,
            trustedAt: new Date().toISOString(),
            lastSeen: nextSession.lastActiveAt,
          },
          ...trustedDevices.filter((entry) => entry?.id !== nextSession.id),
        ].slice(0, 20);
      }
      const persisted = await sellerBackendApi.patchSecuritySettings(nextSecurity).catch(() => security);
      setSecurityState(persisted as AuthSecurityState);
      if (message) say(message);
      if (typeof onClose === "function") onClose();
      const target = resolvePostAuthRedirect(sessionUser, options.redirectPath);
      setTimeout(() => {
        if (typeof window !== "undefined") {
          window.location.href = target;
        }
      }, 120);
    };

    void persistSecurityState();
  };

  const resetFreshOnboardingState = async (role: UserRole, user: Session) => {
    saveSession(user);
    try {
      recordOnboardingStatus(role, user, "DRAFT");
    } catch {
      // ignore local status write failures
    }
    if (typeof window !== "undefined") {
      for (const key of ONBOARDING_STORAGE_KEYS[role]) {
        window.localStorage.removeItem(key);
      }
    }
    await Promise.allSettled([
      sellerBackendApi.resetOnboarding(),
      sellerBackendApi.patchWorkflowScreenState(ONBOARDING_SCREEN_KEYS[role], {
        ui: { step: 1 },
        review: {},
      }),
    ]);
  };

  const handleSocialSignIn = async (provider: "google" | "apple") => {
    say(t(`${provider === "google" ? "Google" : "Apple"} sign-in is not configured yet.`));
  };

  const handleSocialSignUp = async (provider: "google" | "apple") => {
    say(t(`${provider === "google" ? "Google" : "Apple"} sign-up is not configured yet.`));
  };

  // Rate-limit / captcha
  const [tries, setTries] = useState(0); const bump = () => setTries(n => n + 1);
  const needCaptcha = tries >= 4;

  // Passkeys (stubs)
  const hasWebAuthn = typeof window !== "undefined" && !!(window.PublicKeyCredential);
  const registerPasskey = async (user: Session) => {
    if (!hasWebAuthn) return say(t("Passkeys not supported"));
    try {
      const identifier = (user.userId || user.email || user.phone || "guest").toString();
      let activeUser = user;
      if (!activeUser.accessToken && !activeUser.token) {
        say(t("Sign in first before registering a passkey"));
        return;
      }
      const current = (await sellerBackendApi.getSecuritySettings().catch(() => ({}))) as AuthSecurityState;
      const nextPasskey: AuthPasskey = {
        id: "pk_" + Math.random().toString(36).slice(2, 10),
        identifier,
        label: readUserAgentDeviceLabel(),
        createdAt: new Date().toISOString(),
        lastUsedAt: new Date().toISOString(),
      };
      const passkeys = Array.isArray(current.passkeys) ? current.passkeys.filter((entry) => entry.identifier !== identifier) : [];
      const persisted = await sellerBackendApi.patchSecuritySettings({
        ...current,
        passkeys: [nextPasskey, ...passkeys].slice(0, 12),
      });
      setSecurityState(persisted as AuthSecurityState);
      say(t("Passkey registered"));
    } catch {
      say(t("Passkey setup failed"));
    }
  };
  const signInPasskey = async (identifier) => {
    if (!hasWebAuthn) return say(t("Passkeys not supported"));
    try {
      const key = String(identifier || "guest");
      const current = (await sellerBackendApi.getSecuritySettings().catch(() => ({}))) as AuthSecurityState;
      const match = Array.isArray(current.passkeys)
        ? current.passkeys.find((entry) => entry.identifier === key)
        : null;
      if (!match) return say(t("No passkey on file"));
      const session = await authClient.signIn({ identifier, password: "", role: userType });
      handleAuthSuccess(session, t("Signed in with Passkey"));
    } catch {
      say(t("Passkey sign-in failed"));
    }
  };

  // 2FA TOTP (demo)
  const [totp, setTotp] = useState({ enabled: false, secret: 'JBSWY3DPEHPK3PXP' });
  useEffect(() => {
    const config = securityState?.twoFactorConfig;
    if (!config) return;
    setTotp({
      enabled: Boolean(config.enabled),
      secret: String(config.secret || 'JBSWY3DPEHPK3PXP'),
    });
  }, [securityState]);
  const setupTOTP = () => {
    const next = {
      twoFactor: true,
      twoFactorMethod: "authenticator",
      twoFactorConfig: { enabled: true, verified: false, secret: 'JBSWY3DPEHPK3PXP' },
    };
    setTotp({ enabled: true, secret: 'JBSWY3DPEHPK3PXP' });
    void sellerBackendApi.patchSecuritySettings(next).then((payload) => {
      setSecurityState(payload as AuthSecurityState);
      say(t('TOTP enabled'));
    }).catch(() => say(t('TOTP enabled')));
  };
  const verifyTOTP = (code) => {
    if (String(code).trim() === '123456') {
      void sellerBackendApi.patchSecuritySettings({
        twoFactor: true,
        twoFactorMethod: "authenticator",
        twoFactorConfig: { enabled: true, verified: true, secret: totp.secret },
      }).then((payload) => setSecurityState(payload as AuthSecurityState)).catch(() => undefined);
      say(t('TOTP verified'));
      return true;
    }
    say(t('Invalid TOTP'));
    return false;
  };

  const isModal = variant === "modal";

  const headerSection = (
    <div className="mb-5 flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white dark:bg-slate-900 shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden">
            <img src="/logo2.jpeg" alt={t("EVzone")} className="h-full w-full object-contain" />
          </span>
          <div className="text-sm">
            <div className="font-extrabold tracking-tight text-[var(--auth-text)]">{t("EVzone")}</div>
            <div className="text-xs text-[var(--auth-muted)]">{t("Sign in or register")}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="pillbar">
            {AUTH_TABS.map(t => (
              <button key={t} onClick={() => setTab(t)} className={`pill ${tab === t ? 'active' : ''}`}>{t === 'signin' ? 'SIGN IN' : 'REGISTER'}</button>
            ))}
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 dark:border-slate-800 text-gray-500 transition hover:border-gray-300 hover:text-[var(--ev-orange)]"
              aria-label={t("Close authentication")}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 6l12 12M6 18L18 6" /></svg>
            </button>
          )}
        </div>
      </div>
      <div className="rolebar">
        <button className={`role ${userType === 'seller' ? 'active' : ''}`} onClick={() => setUserType('seller')}>{t("I'm a Seller")}</button>
        <button className={`role ${userType === 'provider' ? 'active' : ''}`} onClick={() => setUserType('provider')}>{t("I'm a Service Provider")}</button>
      </div>
    </div>
  );

  const primaryCard = (
    <section className="p-5">
      {tab === 'signin' && <SignIn userType={userType} onDone={(u) => handleAuthSuccess(u, t('Signed in'))} onFail={bump} needCaptcha={needCaptcha} onCaptchaPass={() => setTries(0)} hasWebAuthn={hasWebAuthn} onPasskey={signInPasskey} onForgot={() => setTab('recovery')} onSocial={handleSocialSignIn} />}
      {tab === 'signup' && (
        <SignUp
          userType={userType}
          policy={policy}
          onDone={async (u) => {
            await resetFreshOnboardingState(userType, u);
            handleAuthSuccess(
              u,
              t('Account created'),
              {
                redirectPath: userType === 'seller' ? '/seller/onboarding' : '/provider/onboarding',
                onboardingRequired: true,
              }
            );
          }}
          onSocial={handleSocialSignUp}
        />
      )}
    </section>
  );

  let ancillaryContent: React.ReactNode = null;
  if (variant !== "modal") {
    ancillaryContent = (
      <>
        <div className="mt-3 grid grid-cols-1 gap-2 px-5 text-xs text-[var(--auth-subtle)]">
          <div className="font-semibold">{t("More ways to sign in")}</div>
        </div>
        {(tab === 'passwordless' || tab === '2fa' || tab === 'recovery') && (
          <section className="mt-3 px-5 pb-5">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-extrabold">{tab === 'passwordless' ? t('Passwordless options') : tab === '2fa' ? t('Two‑Factor Authentication') : t('Account recovery')}</div>
              <button className="btn btn-ghost text-xs" onClick={() => setTab('signin')}>{t("Close")}</button>
            </div>
            <div className="h-px w-full bg-gray-100 dark:bg-slate-800 mb-3" />
            {tab === 'passwordless' && <Passwordless userType={userType} onMagic={(u) => handleAuthSuccess(u, t('Magic link used'))} onOTP={(u) => handleAuthSuccess(u, t('Signed in with OTP'))} onPasskeyReg={(u) => registerPasskey(u)} onPasskey={(id) => signInPasskey(id)} hasWebAuthn={hasWebAuthn} onSocial={handleSocialSignIn} />}
            {tab === '2fa' && <TwoFA totp={totp} onSetup={setupTOTP} onVerify={verifyTOTP} />}
            {tab === 'recovery' && <Recovery onDone={(id) => say(t('Recovery email sent to') + ' ' + id)} />}
          </section>
        )}
        {!(tab === 'passwordless' || tab === '2fa' || tab === 'recovery') && (
          <div className="mt-2 grid grid-cols-1 gap-2 px-5 pb-5 text-xs">
            <div className="inline-flex flex-wrap items-center gap-3">
              <button className="underline" onClick={() => setTab('passwordless')}>{t("Use Magic Link / OTP / Passkey")}</button>
              <span className="text-gray-300">•</span>
              <button className="underline" onClick={() => setTab('2fa')}>{t("Use 2FA (TOTP)")}</button>
              <span className="text-gray-300">•</span>
              <button className="underline" onClick={() => setTab('recovery')}>{t("Recover account")}</button>
            </div>
          </div>
        )}
      </>
    );
  }

  const sessionCard = session && (
    <div className="mt-4 card p-5 text-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-base font-extrabold">{t("You're signed in")}</div>
          <div className="text-xs text-[var(--auth-subtle)]">{t("Signed in as")} <b>{session.email || session.userId}</b></div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--ev-green)] px-3 py-1 text-[11px] font-bold text-white">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>
          {session.role || 'user'}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
        <a href={resolvePostAuthRedirect(session)} className="btn btn-primary">{t("Continue")}</a>
        <button
          className="btn btn-ghost"
          onClick={() => {
            if (session?.userId || session?.email) {
              void sellerBackendApi.signOutDevice(`auth_${session.userId || session.email}`).catch(() => undefined);
            }
            void authClient
              .signOut(session.refreshToken, session.accessToken)
              .catch(() => undefined);
            writeSession(null);
            setSession(null);
            broadcastSessionChange();
            say(t('Signed out'));
            setTimeout(goLanding, 120);
          }}
        >
          {t("Sign out")}
        </button>
      </div>
    </div>
  );

  const footerNote = variant !== "modal" ? (
    <div className="mt-6 text-center text-[11px] text-[var(--auth-muted)]">{t("Protected by EVzone security • Need help?")} <a className="underline" href="/help-support">{t("Help & Support")}</a></div>
  ) : null;

  const styles = `
    :root{ --ev-green:${brand.green}; --ev-orange:${brand.orange}; }
    .auth-shell{
      --auth-text: #111827;
      --auth-subtle: #4b5563;
      --auth-muted: #6b7280;
      --auth-border: #e5e7eb;
      --auth-border-soft: #eef2f7;
      --auth-surface: rgba(255,255,255,.92);
      --auth-surface-strong: #ffffff;
      --auth-surface-soft: #f8fafc;
      --auth-prompt: #fdfcfb;
      --auth-prompt-2: ${brand.bg1};
      --auth-prompt-3: ${brand.bg2};
    }
    .auth-shell[data-theme="dark"]{
      --auth-text: #e5e7eb;
      --auth-subtle: #cbd5e1;
      --auth-muted: #94a3b8;
      --auth-border: #334155;
      --auth-border-soft: #1e293b;
      --auth-surface: rgba(15,23,42,.9);
      --auth-surface-strong: rgba(2,6,23,.96);
      --auth-surface-soft: rgba(15,23,42,.72);
      --auth-prompt: #020617;
      --auth-prompt-2: #07111b;
      --auth-prompt-3: #0b1726;
    }
    .bg-grad{ background: radial-gradient(1200px 600px at 90% -10%, var(--auth-prompt), var(--auth-prompt-2)), linear-gradient(180deg, var(--auth-prompt-2) 0%, var(--auth-prompt-3) 100%); }
    .card{ border:1px solid var(--auth-border-soft); border-radius:16px; background:var(--auth-surface); box-shadow:0 6px 24px rgba(2,8,20,.06); color:var(--auth-text); }
    .auth-frame{ border:1px solid var(--auth-border-soft); border-radius:20px; background:var(--auth-surface); box-shadow:0 18px 48px rgba(2,8,20,.14); color:var(--auth-text); overflow:hidden; }
    .auth-frame-head{ padding:20px; border-bottom:1px solid var(--auth-border-soft); }
    .auth-frame-body{ padding:0 0 20px 0; }
    .btn{ border-radius:12px; padding:12px 14px; font-weight:800; display:inline-flex; align-items:center; justify-content:center; gap:8px; }
    .btn-primary{ background:var(--ev-orange); color:#fff; }
    .btn-ghost{ background:var(--auth-surface-strong); border:1px solid var(--auth-border); color:var(--auth-text); }
    .btn-icon{ border:1px solid var(--auth-border); background:var(--auth-surface-strong); border-radius:12px; height:40px; display:inline-flex; align-items:center; gap:8px; padding:0 12px; color:var(--auth-text); }
    .input{ border:1px solid var(--auth-border); border-radius:12px; padding:12px 40px 12px 40px; width:100%; background:var(--auth-surface-strong); color:var(--auth-text); }
    .input:focus{ outline:3px solid rgba(3,205,140,.18); }
    .field{ position:relative; }
    .field .ico{ position:absolute; left:12px; top:50%; transform:translateY(-50%); opacity:.6; }
    .field .trail{ position:absolute; right:10px; top:50%; transform:translateY(-50%); opacity:.75; }
    .pillbar{ display:flex; gap:8px; padding:6px; border:1px solid var(--auth-border); border-radius:14px; background:var(--auth-surface); }
    .pill{ padding:8px 12px; border-radius:10px; font-weight:800; font-size:12px; color:var(--auth-subtle); }
    .pill.active{ background:#e8fff7; color:#065f46; border:1px solid var(--ev-green); }
    .rolebar{ display:flex; gap:8px; padding:6px; border:1px dashed var(--auth-border); border-radius:14px; background:var(--auth-surface); }
    .role{ padding:10px 14px; border-radius:10px; font-weight:800; font-size:13px; color:var(--auth-subtle); }
    .role.active{ background:#fff7ed; color:#9a3412; border:2px solid var(--ev-orange); }
    .divider{ display:flex; align-items:center; gap:10px; color:var(--auth-muted); font-size:11px; }
    .divider:before,.divider:after{ content:""; height:1px; background:var(--auth-border); flex:1; }
    input[type='checkbox']{ width:18px; height:18px; accent-color: #ffffff; }
    @media (max-width: 480px){ .wrap{ padding:16px !important; } .btn{ padding:12px; } }
    .modal-shell{ border-radius:24px; border:1px solid var(--auth-border-soft); background:var(--auth-surface); box-shadow:0 30px 120px rgba(15,23,42,.18); max-height:90vh; overflow-y:auto; overscroll-behavior:contain; color:var(--auth-text); }
  `;

  return (
    <div
      className={`auth-shell ${isModal ? "w-full max-w-[430px]" : "min-h-screen"} text-[var(--auth-text)]`}
      data-theme={resolvedMode}
      style={{ ["--ink" as "--ink"]: brand.ink } as React.CSSProperties}
    >
      <style>{styles}</style>
      {isModal ? (
        <div className="modal-shell">
          <div className="p-6 sm:p-8">
            <div className="auth-frame">
              <div className="auth-frame-head">{headerSection}</div>
              <div className="auth-frame-body">
                {primaryCard}
                {ancillaryContent}
              </div>
            </div>
            {sessionCard}
            {footerNote}
          </div>
        </div>
      ) : (
        <div className="bg-grad min-h-screen">
          <div className="wrap mx-auto w-full max-w-md px-3 py-8 sm:px-4 sm:py-10">
            <div className="auth-frame">
              <div className="auth-frame-head">{headerSection}</div>
              <div className="auth-frame-body">
                {primaryCard}
                {ancillaryContent}
              </div>
            </div>
            {sessionCard}
            {footerNote}
          </div>
        </div>
      )}

      {toast && (<div className="fixed bottom-4 left-0 right-0 z-40 grid place-items-center"><span className="inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1 text-sm font-semibold"><span className="inline-block h-2 w-2 rounded-full" style={{ background: brand.green }} /> {toast}</span></div>)}

    </div>
  );
}

/* ---------------- Components ---------------- */
const Icon = {
  Mail: () => (<svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16v16H4z" /><path d="M22 6l-10 7L2 6" /></svg>),
  Lock: () => (<svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="11" width="14" height="8" rx="2" /><path d="M12 11V7a4 4 0 1 1 8 0v4" /></svg>),
  Phone: () => (<svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92V21a1 1 0 0 1-1.09 1 19.86 19.86 0 0 1-8.63-3.07A19.5 19.5 0 0 1 3.07 11.72 19.86 19.86 0 0 1 0 3.09 1 1 0 0 1 1 2h4.09A1 1 0 0 1 6 2.91a12.44 12.44 0 0 0 .7 2.2 1 1 0  1-1.47A1 1 0 0 1 13.9 12a12.44 12.44 0 0 0 2.2.7A1 1 0 0 1 16.09 14V18a1 1 0 0 1-1 1z" /></svg>),
  Key: () => (<svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 15a4 4 0 1 0 7.9 1H14l4-4-3-3-4 4v3.1A4 4 0 0 0 3 15z" /></svg>),
  Eye: () => (<svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>),
  EyeOff: () => (<svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3l18 18M10.6 10.6A3 3 0 0 0 9 12a3 3 0 0 0 3 3 3 3 0 0 0 2-5.4" /><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20C5 20 1 12 1 12a20.9 20.9 0 0 1 5.11-6.36" /></svg>),
  Google: () => (<svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M21.35 11.1H12v2.9h5.3c-.23 1.5-1.8 4.4-5.3 4.4-3.19 0-5.8-2.64-5.8-5.9s2.61-5.9 5.8-5.9c1.82 0 3.04.76 3.74 1.41l2.55-2.46C16.9 3.4 14.71 2.5 12 2.5 6.98 2.5 3 6.48 3 11.5S6.98 20.5 12 20.5c6.25 0 8.53-4.38 8.53-6.67 0-.45-.05-.74-.18-1.08z" /></svg>),
  Apple: () => (<svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M16.37 1.64A4.55 4.55 0 0 0 13.6 3a4.1 4.1 0 0 0-1 2.93 4.7 4.7 0 0 0 3.77-1.89 4.3 4.3 0 0 0 .99-2.4zM21 17.55c-.53 1.2-1.16 2.39-2.08 3.72-1.16 1.67-2.5 3.75-4.25 3.76-1.67 0-2.1-1.08-3.93-1.08s-2.33 1.06-3.99 1.09c-1.7.03-3.01-1.81-4.17-3.47C1.5 18.78.01 15.13 1.6 12.58c.77-1.25 2.15-2.05 3.64-2.08 1.43-.03 2.78.97 3.9.97 1.1 0 1.7-.97 3.93-.98 1.18 0 2.42.5 3.3 1.2a7.03 7.03 0 0 1 1.96 2.3c-1.71.98-2.52 3.18-1.33 5.56z" /></svg>),
  MS: () => (<svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z" /></svg>)
};

function Captcha({ onPass }) {
  const { t } = useLocalization();
  const [ok, setOk] = useState(false);
  return (
    <div className="mt-2 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 text-xs">
      <label className="inline-flex items-center gap-2">
        <input type="checkbox" className="ck" checked={ok} onChange={e => setOk(e.target.checked)} />
        {t("I'm not a robot")}
      </label>
      <button className="ml-2 rounded border px-2 py-1 text-xs" onClick={() => ok ? onPass() : null} disabled={!ok}>{t("Verify")}</button>
    </div>
  );
}

function SocialRow({ onSocial }: { onSocial?: (provider: "google" | "apple") => void }) {
  const { t } = useLocalization();
  const handleSocial = onSocial || (() => {});
  return (
    <div className="mt-2 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
      <button type="button" className="btn-icon" title={t("Continue with Google")} onClick={() => handleSocial("google")}><Icon.Google />{t(" Google")}</button>
      <button type="button" className="btn-icon" title={t("Continue with Apple")} onClick={() => handleSocial("apple")}><Icon.Apple />{t(" Apple")}</button>
    </div>
  );
}

function SignIn({ userType, onDone, onFail, needCaptcha, onCaptchaPass, hasWebAuthn, onPasskey, onForgot, onSocial }) {
  const { t } = useLocalization();
  const [email, setEmail] = useState(""); const [pwd, setPwd] = useState(""); const [show, setShow] = useState(false); const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const signIn = async () => {
    const identifier = email.trim();
    if (!identifier) { setError(t("Enter email")); onFail(); return; }
    setError("");
    try {
      const session = await authClient.signIn({ identifier, password: pwd, role: userType });
      onDone({ ...session, remember });
    } catch (err) {
      const message = err instanceof Error ? err.message : t("Sign in failed");
      setError(message);
      onFail();
    }
  };
  const handleForgot = onForgot || (() => { });
  return (
    <section>
      <div className="text-lg font-extrabold">{t("Welcome back")}</div>
      <div className="text-xs text-gray-600">{userType === 'seller' ? t('Sign in to your EVzone Seller account') : t('Sign in to your EVzone Service Provider account')}</div>

      <SocialRow onSocial={onSocial} />
      <div className="my-3 divider">{t("or continue with email")}</div>

      <div className="grid grid-cols-1 gap-2 text-sm">
        <div className="field"><span className="ico"><Icon.Mail /></span><input className="input" placeholder={t("Email / Phone Number")} value={email} onChange={e => setEmail(e.target.value)} /></div>
        <div className="field"><span className="ico"><Icon.Lock /></span><input className="input" placeholder={t("Password")} type={show ? 'text' : 'password'} value={pwd} onChange={e => setPwd(e.target.value)} /><button type="button" className="trail" onClick={() => setShow(s => !s)} aria-label={t("Toggle password")}><span>{show ? <Icon.EyeOff /> : <Icon.Eye />}</span></button></div>
        {error && <div className="text-xs text-red-600">{error}</div>}
        {needCaptcha && <Captcha onPass={onCaptchaPass} />}
        <label className="inline-flex items-center gap-2 text-xs text-gray-600 mt-1"><input type="checkbox" className="ck" checked={remember} onChange={e => setRemember(e.target.checked)} /> {t("Remember this device")}</label>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button className="btn btn-primary" onClick={signIn}>{t("Continue")}</button>
          {hasWebAuthn && <button className="btn btn-ghost" onClick={() => onPasskey(email || 'user')} title={t("Use Passkey")}><Icon.Key /> {t("Passkey")}</button>}
        </div>
        <div className="mt-2 text-right text-xs"><button type="button" className="underline" onClick={handleForgot}>{t("Forgot password?")}</button></div>
      </div>
    </section>
  );
}

function Passwordless({ userType, onMagic, onOTP, onPasskeyReg, onPasskey, hasWebAuthn, onSocial }) {
  const { t } = useLocalization();
  const [email, setEmail] = useState(""); const [phone, setPhone] = useState(""); const [otpSent, setOtpSent] = useState(false); const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const sendMagic = async () => {
    if (!email.trim()) return;
    setError("");
    try {
      const session = await authClient.signIn({ identifier: email, password: "", role: userType });
      onMagic({ ...session, auth: "magic" });
    } catch (err) {
      const message = err instanceof Error ? err.message : t("Magic link sign-in failed");
      setError(message.includes("Invalid credentials") ? t("No account found. Register first.") : message);
    }
  };
  const sendOTP = () => setOtpSent(true);
  const verifyOTP = async () => {
    if (otp.trim() !== "123456") return;
    const identifier = phone || email;
    if (!identifier) return;
    setError("");
    try {
      const session = await authClient.signIn({ identifier, password: "", role: userType });
      onOTP({ ...session, auth: "otp" });
    } catch (err) {
      const message = err instanceof Error ? err.message : t("OTP sign-in failed");
      setError(message.includes("Invalid credentials") ? t("No account found. Register first.") : message);
    }
  };
  const regPasskey = () => onPasskeyReg({ userId: email || phone, email, phone });
  return (
    <section>
      <div className="text-lg font-extrabold">{t("Passwordless options")}</div>
      <div className="text-xs text-gray-600">{t("Magic Link")} • {t("Phone OTP")} • {t("Passkeys")}</div>
      <SocialRow onSocial={onSocial} />
      <div className="my-3 divider">{t("or continue without a password")}</div>
      <div className="grid grid-cols-1 gap-3 text-sm">
        {error && <div className="text-xs text-red-600">{error}</div>}
        <div>
          <div className="text-xs text-gray-600 mb-1">{t("Magic Link")}</div>
          <div className="field"><span className="ico"><Icon.Mail /></span><input className="input" placeholder={t("Email / Phone Number")} value={email} onChange={e => setEmail(e.target.value)} /></div>
          <div className="mt-2 inline-flex items-center gap-2"><button className="btn btn-ghost" onClick={sendMagic}>{t("Send Magic Link")}</button>{hasWebAuthn && <button className="btn btn-ghost" onClick={regPasskey}>{t("Register Passkey")}</button>}{hasWebAuthn && <button className="btn btn-primary" onClick={() => onPasskey(email || 'user')}>{t("Sign in with Passkey")}</button>}</div>
        </div>
        <div>
          <div className="text-xs text-gray-600 mb-1">{t("Phone OTP")}</div>
          <div className="field"><span className="ico"><Icon.Phone /></span><input className="input" placeholder={t("+256 700 000 000")} value={phone} onChange={e => setPhone(e.target.value)} /></div>
          <div className="mt-2 inline-flex items-center gap-2"><button className="btn btn-ghost" onClick={sendOTP}>{t("Send OTP")}</button>{otpSent && (<><input className="input" placeholder={t("123456")} value={otp} onChange={e => setOtp(e.target.value)} /><button className="btn btn-primary" onClick={verifyOTP}>{t("Verify")}</button></>)}</div>
        </div>
      </div>
    </section>
  );
}

function SignUp({ policy, userType, onDone, onSocial }) {
  const { t } = useLocalization();
  const [firstName, setFirstName] = useState("");
  const [otherNames, setOtherNames] = useState("");
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState("");
  const name = `${firstName}${otherNames ? ` ${otherNames}` : ""}`.trim();
  const okDomain = policy.allowedDomains.some(sfx => !sfx || email.endsWith(sfx));
  const strong = pwd.length >= 8;
  const match = pwd && confirm && pwd === confirm;
  const isDisabled = !firstName || !email || !strong || !agree || !okDomain || !match;
  const create = async () => {
    if (!agree) { setError(t("Please accept the policies to continue")); return; }
    if (!firstName || !email || !strong || !okDomain || !match) return;
    setError("");
    try {
      const session = await authClient.signUp({ name, email, password: pwd, role: userType });
      await onDone(session);
    } catch (err) {
      const message = err instanceof Error ? err.message : t("Sign up failed");
      setError(message);
    }
  };
  return (
    <section>
      <div className="text-lg font-extrabold">{t("Create your account")}</div>
      <div className="text-xs text-gray-600">{userType === 'seller' ? t('Start your store with EVzone') : t('Start your service business with EVzone')}</div>
      <SocialRow onSocial={onSocial} />
      <div className="my-3 divider">{t("or sign up with email")}</div>
      <div className="grid grid-cols-1 gap-2 text-sm">
        <div className="field"><span className="ico"><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 14a4 4 0 1 0-8 0" /><circle cx="12" cy="8" r="4" /><path d="M6 21v-1a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v1" /></svg></span><input className="input" placeholder={t("First Name")} value={firstName} onChange={e => setFirstName(e.target.value)} /></div>
        <div className="field"><span className="ico"><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 14a4 4 0 1 0-8 0" /><circle cx="12" cy="8" r="4" /><path d="M6 21v-1a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v1" /></svg></span><input className="input" placeholder={t("Other Names")} value={otherNames} onChange={e => setOtherNames(e.target.value)} /></div>
        <div className="field"><span className="ico"><Icon.Mail /></span><input className="input" placeholder={t("Email / Phone Number")} value={email} onChange={e => setEmail(e.target.value)} /></div>
        <div className="field"><span className="ico"><Icon.Lock /></span><input className="input" placeholder={t("Create password")} type={show ? 'text' : 'password'} value={pwd} onChange={e => setPwd(e.target.value)} /><button type="button" className="trail" onClick={() => setShow(s => !s)} aria-label={t("Toggle password")}>{show ? <Icon.EyeOff /> : <Icon.Eye />}</button></div>
        <div className="field"><span className="ico"><Icon.Lock /></span><input className="input" placeholder={t("Confirm password")} type={show ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)} /><button type="button" className="trail" onClick={() => setShow(s => !s)} aria-label={t("Toggle password")}>{show ? <Icon.EyeOff /> : <Icon.Eye />}</button></div>
        {confirm && !match && <div className="text-xs text-red-600">{t("Passwords do not match")}</div>}
        {!okDomain && <div className="text-xs text-red-600">{t("Email domain not allowed by policy")}</div>}
        {error && <div className="text-xs text-red-600">{error}</div>}
        <label className="inline-flex items-center gap-2 text-xs text-gray-600"><input type="checkbox" className="ck" checked={agree} onChange={e => { setAgree(e.target.checked); setError(""); }} /> {t("I agree to the policies")}</label>
        <div className="mt-1 text-right"><button className={`btn btn-primary ${isDisabled ? 'bg-gray-300 text-gray-500 cursor-not-allowed hover:bg-gray-300' : ''}`} onClick={create} disabled={isDisabled}>{t("Create account")}</button></div>
      </div>
    </section>
  );
}

function TwoFA({ totp, onSetup, onVerify }) {
  const { t } = useLocalization();
  const [code, setCode] = useState("");
  return (
    <section>
      <div className="text-lg font-extrabold">{t("Two‑Factor Authentication")}</div>
      <div className="text-xs text-gray-600">{totp.enabled ? t('Enter your 6‑digit code') : t('Setup with your authenticator app and then verify')}</div>
      {!totp.enabled && (<div className="mt-2 rounded-lg border p-2 text-xs">{t("Secret (demo): ")}<b>{totp.secret}</b></div>)}
      <div className="mt-2 inline-flex items-center gap-2 text-sm">
        {!totp.enabled && <button className="btn btn-ghost" onClick={onSetup}>{t("Setup")}</button>}
        <input className="input" placeholder={t("123456")} value={code} onChange={e => setCode(e.target.value)} />
        <button className="btn btn-primary" onClick={() => onVerify(code)}>{t("Verify")}</button>
      </div>
    </section>
  );
}

function Recovery({ onDone }) {
  const { t } = useLocalization();
  const [identifier, setIdentifier] = useState("");
  const [error, setError] = useState("");
  const send = async () => {
    setError("");
    try {
      await authClient.resetPassword(identifier);
      onDone(identifier);
    } catch (err) {
      const message = err instanceof Error ? err.message : t("Recovery failed");
      setError(message);
    }
  };
  return (
    <section>
      <div className="text-lg font-extrabold">{t("Account recovery")}</div>
      <div className="text-xs text-gray-600">{t("Enter your email to receive a recovery link")}</div>
      <div className="mt-2 inline-flex items-center gap-2 text-sm"><input className="input" placeholder={t("Email / Phone Number")} value={identifier} onChange={e => setIdentifier(e.target.value)} /><button className="btn btn-ghost" onClick={send}>{t("Send link")}</button></div>
      {error && <div className="mt-2 text-xs text-red-600">{error}</div>}
    </section>
  );
}
