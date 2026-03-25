import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  ChevronDown,
  ExternalLink,
  HelpCircle,
  Lock,
  Mail,
  MessageCircle,
  Phone,
  ShieldCheck,
  User,
  Users
} from "lucide-react";
import { authApi } from "../../lib/authApi";
import { creatorApi } from "../../lib/creatorApi";
import {
  clearDashboardAuthOverride,
  clearAuthSession,
  enableDashboardAuthOverride,
  getPostAuthPath,
  hasPersistedAuthSession,
  hasStoredAuthState,
  persistAuthSession
} from "../../lib/authSession";
import { useTheme } from "../../contexts/ThemeContext";

const ORANGE = "#f77f00";
const GREEN = "#03cd8c";
const AUTH_NOTICE_SCREEN_STATE_KEY = "creator-auth-redirect-notice-v1";

interface Toast {
  id: string;
  message: string;
  tone: "default" | "success" | "error";
}

type AuthMode = "signin" | "signup" | null;
type IdentifierMode = "email" | "phone";

function cx(...xs: (string | boolean | undefined | null)[]): string {
  return xs.filter(Boolean).join(" ");
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

type AuthNoticeStep = { n: number; t: string; d: string };
type AuthNoticeFaq = { q: string; a: string };
type AuthNoticeContent = {
  nextSteps: AuthNoticeStep[];
  readyItems: string[];
  quickAnswers: AuthNoticeFaq[];
};

function normalizeAuthNoticeContent(value: unknown): AuthNoticeContent | null {
  const root = asRecord(value);
  if (!root) return null;
  const nestedPayload = asRecord(root.payload);
  const source =
    asRecord(nestedPayload?.content) ||
    asRecord(root.content) ||
    asRecord(nestedPayload) ||
    root;
  if (!source) return null;

  const nextSteps = asArray(source.nextSteps)
    .map((entry) => asRecord(entry))
    .filter((entry): entry is Record<string, unknown> => Boolean(entry))
    .map((entry) => ({
      n: Number(entry.n || 0),
      t: asString(entry.t, "").trim(),
      d: asString(entry.d, "").trim()
    }))
    .filter((entry) => Number.isFinite(entry.n) && entry.n > 0 && entry.t && entry.d);

  const readyItems = asArray(source.readyItems)
    .map((entry) => asString(entry, "").trim())
    .filter(Boolean);

  const quickAnswers = asArray(source.quickAnswers)
    .map((entry) => asRecord(entry))
    .filter((entry): entry is Record<string, unknown> => Boolean(entry))
    .map((entry) => ({
      q: asString(entry.q, "").trim(),
      a: asString(entry.a, "").trim()
    }))
    .filter((entry) => entry.q && entry.a);

  return { nextSteps, readyItems, quickAnswers };
}

function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = (message: string, tone: "default" | "success" | "error" = "default") => {
    const id = `${Date.now()}_${Math.random()}`;
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  };

  return { toasts, push };
}

function ToastStack({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="fixed top-16 right-3 md:right-6 z-[60] flex flex-col gap-2 w-[min(380px,calc(100vw-24px))]">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cx(
            "rounded-2xl border px-3 py-2 text-[12px] shadow-sm bg-white dark:bg-slate-900",
            t.tone === "success"
              ? "border-emerald-200 dark:border-emerald-800/50"
              : t.tone === "error"
                ? "border-rose-200 dark:border-rose-800/50"
                : "border-slate-200 dark:border-slate-700"
          )}
        >
          <div className="flex items-start gap-2">
            <span
              className={cx(
                "mt-1 h-2 w-2 rounded-full",
                t.tone === "success" ? "bg-emerald-500" : t.tone === "error" ? "bg-rose-500" : "bg-amber-500"
              )}
            />
            <div className="text-slate-700 dark:text-slate-200">{t.message}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Modal({
  open,
  title,
  children,
  onClose
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="text-[13px] font-semibold text-slate-900 dark:text-slate-50">{title}</div>
          <button
            type="button"
            className="px-3 py-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-[12px] font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

function Pill({
  icon,
  text,
  tone = "default"
}: {
  icon: React.ReactNode;
  text: string;
  tone?: "good" | "warn" | "default";
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-2 px-4 py-2 rounded-full border text-[12px] font-semibold transition-colors",
        tone === "good"
          ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400"
          : tone === "warn"
            ? "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-400"
            : "bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-400"
      )}
    >
      <span>{icon}</span>
      <span>{text}</span>
    </span>
  );
}

function CTAButton({
  children,
  onClick,
  variant = "primary",
  disabled = false,
  type = "button"
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "green" | "secondary";
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  const base =
    "w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl text-[14px] font-bold transition-all shadow-sm active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none";
  const styles =
    variant === "primary"
      ? "bg-[#f77f00] text-white hover:bg-[#e26f00]"
      : variant === "green"
        ? "bg-[#03cd8c] text-white hover:opacity-95"
        : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700";

  return (
    <button type={type} className={cx(base, styles)} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

function Accordion({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden transition-all shadow-sm hover:shadow-md">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-5 py-5 flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
      >
        <div className="text-left flex-1 min-w-0">
          <div className="text-[14px] font-bold text-slate-900 dark:text-slate-50 tracking-tight leading-snug">
            {q}
          </div>
        </div>
        <ChevronDown
          className={cx("h-5 w-5 text-slate-400 transition-transform flex-shrink-0", open ? "rotate-180" : "")}
        />
      </button>
      {open ? (
        <div className="px-5 pb-5 text-[14px] text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-50 dark:border-slate-800/50">
          {a}
        </div>
      ) : null}
    </div>
  );
}

function Field({
  label,
  children,
  hint
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 text-[12px] font-semibold text-slate-700 dark:text-slate-300">{label}</div>
      {children}
      {hint ? <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{hint}</div> : null}
    </label>
  );
}

function AuthInput(
  props: React.InputHTMLAttributes<HTMLInputElement> & { icon?: React.ReactNode }
) {
  const { icon, className, ...rest } = props;

  return (
    <div className="relative">
      {icon ? (
        <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          {icon}
        </div>
      ) : null}
      <input
        {...rest}
        className={cx(
          "w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-3 text-[14px] text-slate-900 dark:text-slate-100 outline-none focus:border-[#f77f00] placeholder:text-slate-400",
          icon ? "pl-10" : "",
          className
        )}
      />
    </div>
  );
}

export default function CreatorAuthRedirectNotice() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { toasts, push } = useToasts();

  const [showWhy, setShowWhy] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>(null);
  const [identifierMode, setIdentifierMode] = useState<IdentifierMode>("email");
  const [initializing, setInitializing] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [queueMessage, setQueueMessage] = useState("");

  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [noticeContent, setNoticeContent] = useState<AuthNoticeContent | null>(null);

  useEffect(() => {
    const nextMode = new URLSearchParams(location.search).get("mode");
    if (nextMode === "register") {
      setAuthMode("signup");
      return;
    }
    if (nextMode === "login") {
      setAuthMode("signin");
    }
  }, [location.search]);

  useEffect(() => {
    let active = true;
    if (!hasStoredAuthState()) {
      setNoticeContent(null);
      return () => {
        active = false;
      };
    }
    void creatorApi
      .workflowScreenState(AUTH_NOTICE_SCREEN_STATE_KEY)
      .then((screenState) => {
        if (!active) return;
        const normalized = normalizeAuthNoticeContent(screenState);
        if (normalized) {
          setNoticeContent(normalized);
          return;
        }
        setNoticeContent(null);
      })
      .catch(() => {
        if (!active) return;
        setNoticeContent(null);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    if (!hasPersistedAuthSession()) {
      setInitializing(false);
      return () => {
        active = false;
      };
    }

    void authApi
      .me()
      .then((session) => {
        if (!active) return;
        persistAuthSession(session);
        navigate("/dashboard", { replace: true });
      })
      .catch(() => {
        if (!active) return;
        clearAuthSession();
      })
      .finally(() => {
        if (active) {
          setInitializing(false);
        }
      });

    return () => {
      active = false;
    };
  }, [navigate]);

  const statusLabel = useMemo(() => {
    if (queueMessage) return queueMessage;
    if (submitting && authMode === "signin") return "Signing in to your EVzone account";
    if (submitting && authMode === "signup") return "Creating your EVzone account";
    return "";
  }, [authMode, queueMessage, submitting]);

  const identifierValue = identifierMode === "email" ? email.trim() : phone.trim();

  const resetAuthForm = () => {
    setIdentifierMode("email");
    setSubmitting(false);
    setQueueMessage("");
    setName("");
    setHandle("");
    setEmail("");
    setPhone("");
    setPassword("");
    setConfirmPassword("");
  };

  const closeAuthModal = () => {
    setAuthMode(null);
    setQueueMessage("");
  };

  const completeLogin = async (targetPath = getPostAuthPath) => {
    const session = await authApi.me();
    persistAuthSession(session);
    const nextPath = targetPath(session);
    if (nextPath === "/dashboard") {
      enableDashboardAuthOverride();
    } else {
      clearDashboardAuthOverride();
    }
    navigate(nextPath, { replace: true });
  };

  const waitForQueuedRegistration = async (requestId: string, passwordValue: string) => {
    let attempts = 0;
    let delayMs = 1000;

    while (attempts < 40) {
      attempts += 1;
      const status = await authApi.registerStatus(requestId);
      if (status.failed) {
        throw new Error(status.errorMessage || "Registration failed");
      }
      if (status.readyToLogin) {
        await authApi.login({
          email: identifierMode === "email" ? email.trim().toLowerCase() : undefined,
          phone: identifierMode === "phone" ? phone.trim() : undefined,
          password: passwordValue
        });
        await completeLogin(() => "/dashboard");
        return;
      }

      delayMs = status.pollAfterMs || delayMs;
      setQueueMessage(`Creating your account${status.status ? `: ${status.status}` : ""}...`);
      await new Promise((resolve) => window.setTimeout(resolve, delayMs));
    }

    throw new Error("Registration is taking longer than expected. Try signing in in a moment.");
  };

  const onSignIn = () => {
    resetAuthForm();
    setAuthMode("signin");
  };

  const onSignUp = () => {
    resetAuthForm();
    setAuthMode("signup");
  };

  const handleAuthSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!authMode) return;

    setSubmitting(true);
    setQueueMessage("");

    try {
      if (!identifierValue) {
        throw new Error(identifierMode === "email" ? "Email is required." : "Phone number is required.");
      }
      if (!password || password.length < 8) {
        throw new Error("Password must be at least 8 characters.");
      }

      if (authMode === "signup") {
        if (!name.trim()) {
          throw new Error("Full name is required.");
        }
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match.");
        }

        const registration = await authApi.register({
          name: name.trim(),
          handle: handle.trim() || undefined,
          email: identifierMode === "email" ? email.trim().toLowerCase() : undefined,
          phone: identifierMode === "phone" ? phone.trim() : undefined,
          password,
          role: "CREATOR",
          roles: ["CREATOR"]
        });

        if ("registrationQueued" in registration && registration.registrationQueued) {
          push("Registration accepted. Finishing account setup...", "success");
          await waitForQueuedRegistration(registration.requestId, password);
        } else {
          await authApi.login({
            email: identifierMode === "email" ? email.trim().toLowerCase() : undefined,
            phone: identifierMode === "phone" ? phone.trim() : undefined,
            password
          });
          await completeLogin();
        }
        return;
      }

      await authApi.login({
        email: identifierMode === "email" ? email.trim().toLowerCase() : undefined,
        phone: identifierMode === "phone" ? phone.trim() : undefined,
        password
      });
      await completeLogin(() => "/dashboard");
    } catch (error) {
      push(error instanceof Error ? error.message : "Authentication failed.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (initializing) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors">
      <ToastStack toasts={toasts} />

      <Modal open={showWhy} title="Why you are being redirected" onClose={() => setShowWhy(false)}>
        <div className="space-y-3 text-[12px] text-slate-700">
          <p>
            <span className="font-semibold">MyLiveDealz</span> is the promotion arm for the EVzone e-commerce platform.
            To keep your experience secure and consistent across the EVzone ecosystem, we use a single account system called
            <span className="font-semibold"> EVzone My Accounts</span>.
          </p>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 p-3">
            <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-50">What this gives you</div>
            <ul className="mt-2 list-disc pl-5 text-[12px] text-slate-600 dark:text-slate-400 space-y-1">
              <li>One login across EVzone services (Marketplace, MyLiveDealz, Wallet, and more).</li>
              <li>Better security (device protection, password safety, and account recovery).</li>
              <li>Faster onboarding and easier payouts linked to one verified identity.</li>
            </ul>
          </div>
          <p className="text-[12px] text-slate-600">
            After signing in or signing up on EVzone My Accounts, you will be returned to MyLiveDealz to continue.
          </p>
        </div>
      </Modal>

      <Modal open={showHelp} title="Need help signing in?" onClose={() => setShowHelp(false)}>
        <div className="space-y-3">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 p-3">
            <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-50">Fast options</div>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <CTAButton
                variant="green"
                onClick={() => {
                  push("Support chat opened.", "success");
                  setShowHelp(false);
                }}
              >
                <MessageCircle className="h-4 w-4" /> Live chat
              </CTAButton>
              <CTAButton
                variant="secondary"
                onClick={() => {
                  push("Email draft created.", "success");
                  setShowHelp(false);
                }}
              >
                <Mail className="h-4 w-4" /> Email support
              </CTAButton>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
            <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-50">Tips</div>
            <ul className="mt-2 list-disc pl-5 text-[12px] text-slate-600 dark:text-slate-400 space-y-1">
              <li>If you already have an EVzone account, sign in using the same email/phone.</li>
              <li>If you forgot your password, use the “Forgot password” option on My Accounts.</li>
              <li>Make sure you can access your email or phone for verification codes.</li>
            </ul>
          </div>
        </div>
      </Modal>

      <Modal
        open={authMode !== null}
        title={authMode === "signin" ? "Sign in with EVzone" : "Create EVzone account"}
        onClose={closeAuthModal}
      >
        <form className="space-y-4" onSubmit={handleAuthSubmit}>
          {authMode === "signup" ? (
            <>
              <Field label="Full Name">
                <AuthInput
                  icon={<User className="h-4 w-4" />}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Full name"
                />
              </Field>
              <Field label="Preferred Handle" hint="Optional. We will generate one if you leave this blank.">
                <AuthInput
                  icon={<User className="h-4 w-4" />}
                  value={handle}
                  onChange={(event) => setHandle(event.target.value)}
                  placeholder="creator.handle"
                />
              </Field>
            </>
          ) : null}

          <Field label="Use Email Or Phone">
            <div className="mb-2 flex gap-2">
              <button
                type="button"
                onClick={() => setIdentifierMode("email")}
                className={cx(
                  "rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors",
                  identifierMode === "email"
                    ? "bg-[#f77f00] text-white"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                )}
              >
                Email
              </button>
              <button
                type="button"
                onClick={() => setIdentifierMode("phone")}
                className={cx(
                  "rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors",
                  identifierMode === "phone"
                    ? "bg-[#f77f00] text-white"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                )}
              >
                Phone
              </button>
            </div>

            {identifierMode === "email" ? (
              <AuthInput
                icon={<Mail className="h-4 w-4" />}
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="creator@example.com"
              />
            ) : (
              <AuthInput
                icon={<Phone className="h-4 w-4" />}
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+256700000000"
              />
            )}
          </Field>

          <Field label="Password" hint={authMode === "signup" ? "Use at least 8 characters." : undefined}>
            <AuthInput
              icon={<Lock className="h-4 w-4" />}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
            />
          </Field>

          {authMode === "signup" ? (
            <Field label="Confirm Password">
              <AuthInput
                icon={<Lock className="h-4 w-4" />}
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Repeat your password"
              />
            </Field>
          ) : null}

          {statusLabel ? (
            <div className="rounded-3xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-[12px] text-amber-800 dark:text-amber-400">
              <span className="font-semibold">{statusLabel}</span>...
            </div>
          ) : null}

          <CTAButton type="submit" variant={authMode === "signup" ? "green" : "primary"} disabled={submitting}>
            {submitting
              ? authMode === "signin"
                ? "Signing in"
                : "Creating account"
              : authMode === "signin"
                ? "Sign in with EVzone"
                : "Create EVzone account"}
            <ArrowRight className="h-4 w-4" />
          </CTAButton>

          {authMode === "signin" ? (
            <button
              type="button"
              className="text-[13px] font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 inline-flex items-center gap-2 transition-colors"
              onClick={() => {
                push("Password recovery is available on EVzone My Accounts.", "success");
              }}
            >
              Forgot password? <ExternalLink className="h-4 w-4" />
            </button>
          ) : (
            <div className="text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed italic">
              After sign-up, you’ll return here to complete Creator onboarding.
            </div>
          )}
        </form>
      </Modal>

      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/85 dark:bg-slate-950/85 backdrop-blur">
        <div className="w-full px-4 md:px-8 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center">
              <img
                src="/MyliveDealz PNG Logo 2 Black.png"
                alt="MyLiveDealz"
                className="h-8 md:h-10 w-auto block dark:hidden"
              />
              <img
                src="/MyliveDealz PNG Logo 2 light.png"
                alt="MyLiveDealz"
                className="h-8 md:h-10 w-auto hidden dark:block"
              />
            </div>
            <div className="hidden sm:block h-6 w-px bg-slate-200 dark:bg-slate-800 mx-2" />
            <div className="hidden sm:flex items-center gap-2 text-[12px] font-semibold text-slate-600 dark:text-slate-400">
              <span className="px-3 py-1 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                Creator Access
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Toggle Theme"
            >
              {theme === "light" ? "🌙" : "☀️"}
            </button>
            <button
              type="button"
              className="px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 text-[12px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              onClick={() => setShowWhy(true)}
            >
              Why this?
            </button>
            <button
              type="button"
              className="px-3 py-2 rounded-2xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[12px] font-semibold hover:bg-slate-800 dark:hover:bg-white"
              onClick={() => setShowHelp(true)}
            >
              Help
            </button>
          </div>
        </div>
      </header>

      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-50 dark:from-amber-950/20 via-white dark:via-slate-950 to-white dark:to-slate-950" />
        <div className="relative w-full px-4 md:px-8 py-10 md:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] gap-6 items-start">
            <div>
              <div className="flex flex-wrap gap-2">
                <Pill icon={<Lock className="h-4 w-4" />} text="Secure sign-in" tone="good" />
                <Pill icon={<Users className="h-4 w-4" />} text="One account across EVzone" />
                <Pill icon={<ShieldCheck className="h-4 w-4" />} text="Trusted identity & payouts" />
              </div>

              <h1 className="mt-5 text-4xl md:text-6xl font-bold tracking-tight text-slate-900 dark:text-white">
                Continue to EVzone My Accounts
              </h1>
              <p className="mt-5 text-[15px] md:text-[18px] text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
                MyLiveDealz is the promotion arm for the EVzone Super App and related Platforms.
                To protect creators and unify access across EVzone services, creator sign-in and sign-up are handled through EVzone My Accounts.
              </p>

              {statusLabel ? (
                <div className="mt-4 rounded-3xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-[12px] text-amber-800 dark:text-amber-400">
                  <span className="font-semibold">{statusLabel}</span>...
                </div>
              ) : null}

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-[32px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-[0_15px_40px_rgba(0,0,0,0.03)] dark:shadow-none transition-all hover:shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[15px] font-bold text-slate-900 dark:text-slate-50 tracking-tight leading-snug">
                        I already have an EVzone account
                      </div>
                      <div className="mt-1.5 text-[14px] text-slate-600 dark:text-slate-400 leading-relaxed">
                        Use your existing email/phone to sign in.
                      </div>
                    </div>
                    <span
                      className="h-12 w-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center flex-shrink-0 shadow-sm"
                      style={{ color: GREEN }}
                    >
                      <BadgeCheck className="h-6 w-6" />
                    </span>
                  </div>
                  <div className="mt-6">
                    <CTAButton onClick={onSignIn}>
                      Sign in with EVzone <ArrowRight className="h-4 w-4" />
                    </CTAButton>
                  </div>
                  <button
                    type="button"
                    className="mt-4 text-[13px] font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 inline-flex items-center gap-2 transition-colors ml-1"
                    onClick={() => {
                      push("Password recovery is available on EVzone My Accounts.", "success");
                    }}
                  >
                    Forgot password? <ExternalLink className="h-4 w-4" />
                  </button>
                </div>

                <div className="rounded-[32px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-[0_15px_40px_rgba(0,0,0,0.03)] dark:shadow-none transition-all hover:shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[15px] font-bold text-slate-900 dark:text-slate-50 tracking-tight leading-snug">
                        I don’t have an EVzone account
                      </div>
                      <div className="mt-1.5 text-[14px] text-slate-600 dark:text-slate-400 leading-relaxed">
                        Create one account to access EVzone services.
                      </div>
                    </div>
                    <span
                      className="h-12 w-12 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-center justify-center flex-shrink-0 shadow-sm"
                      style={{ color: ORANGE }}
                    >
                      <User className="h-6 w-6" />
                    </span>
                  </div>
                  <div className="mt-6">
                    <CTAButton variant="green" onClick={onSignUp}>
                      Create EVzone account <ArrowRight className="h-4 w-4" />
                    </CTAButton>
                  </div>
                  <div className="mt-4 text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed italic ml-1">
                    After sign-up, you’ll return here to complete Creator onboarding.
                  </div>
                </div>
              </div>

              <div className="mt-8 rounded-[32px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
                <div className="text-[15px] font-bold text-slate-900 dark:text-slate-50 mb-4 tracking-tight">
                  What happens next
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {(noticeContent?.nextSteps || []).map((s) => (
                    <div
                      key={s.n}
                      className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-4 transition-all hover:bg-slate-100 dark:hover:bg-slate-800 shadow-sm hover:shadow"
                    >
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        Step {s.n}
                      </div>
                      <div className="mt-2 text-[14px] font-bold text-slate-900 dark:text-slate-50 leading-tight">
                        {s.t}
                      </div>
                      <div className="mt-1 text-[13px] text-slate-600 dark:text-slate-400 leading-normal">
                        {s.d}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right rail */}
            <aside className="space-y-3">
              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[13px] font-semibold text-slate-900 dark:text-slate-50">Security & privacy</div>
                    <div className="mt-1 text-[12px] text-slate-600 dark:text-slate-400">
                      One secure identity across EVzone products.
                    </div>
                  </div>
                  <span className="h-10 w-10 rounded-2xl bg-slate-900 dark:bg-slate-800 text-white flex items-center justify-center">
                    <Lock className="h-5 w-5" />
                  </span>
                </div>
                <ul className="mt-3 list-disc pl-5 text-[12px] text-slate-600 dark:text-slate-400 space-y-1">
                  <li>Account recovery and device protection</li>
                  <li>Unified identity for payouts and compliance</li>
                  <li>No password stored in MyLiveDealz</li>
                </ul>
              </div>

              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                <div className="text-[13px] font-semibold text-slate-900 dark:text-slate-50">Have these ready</div>
                <div className="mt-3 space-y-2">
                  {(noticeContent?.readyItems || []).map((x) => (
                    <div key={x} className="flex items-start gap-2">
                      <span className="mt-0.5 h-5 w-5 rounded-full bg-slate-900 dark:bg-slate-800 text-white flex items-center justify-center">
                        <Check className="h-3 w-3" />
                      </span>
                      <div className="text-[12px] text-slate-700 dark:text-slate-300">{x}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                <div className="text-[13px] font-semibold text-slate-900 dark:text-slate-50">Quick answers</div>
                <div className="mt-3 space-y-2">
                  {(noticeContent?.quickAnswers || []).map((item) => (
                    <Accordion key={item.q} q={item.q} a={item.a} />
                  ))}
                </div>
              </div>

              <button
                type="button"
                className="w-full px-4 py-3 rounded-2xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[12px] font-semibold hover:bg-slate-800 dark:hover:bg-white inline-flex items-center justify-center gap-2"
                onClick={() => setShowHelp(true)}
              >
                <HelpCircle className="h-4 w-4" /> Contact support
              </button>
            </aside>
          </div>
        </div>
      </div>

      <footer className="border-t border-slate-200 dark:border-slate-800">
        <div className="w-full px-4 md:px-8 py-6 text-[12px] text-slate-500 dark:text-slate-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>© {new Date().getFullYear()} EVzone Group. All rights reserved.</div>
          <button
            type="button"
            className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            onClick={() => {
              push("Returning to MyLiveDealz homepage.", "success");
              navigate("/");
            }}
          >
            Back to MyLiveDealz
          </button>
        </div>
      </footer>
    </div>
  );
}
