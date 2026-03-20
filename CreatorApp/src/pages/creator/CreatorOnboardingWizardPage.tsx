// Round 1 – Page 2: Guided Creator Onboarding & KYC Wizard
// Multi-step onboarding: Profile → Socials → KYC → Payout → Preferences → Review
// EVzone colours: Orange #f77f00, Green #03cd8c, Light Grey #f2f2f2

import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { PageHeader } from "../../components/PageHeader";
import { creatorApi } from "../../lib/creatorApi";

const STEPS = ["Profile", "Socials", "KYC", "Payout", "Preferences", "Review"];

type SocialsData = {
  instagram: string;
  tiktok: string;
  youtube: string;
};

type ExtraSocial = {
  platform: string;
  handle: string;
  followers?: string;
};

type FormData = {
  name: string;
  handle: string;
  tagline: string;
  bio: string;
  timezone: string;
  currency: string;
  contentLanguages: string[];
  audienceRegions: string[];
  socials: SocialsData;
  primaryPlatform: string;
  extraSocials: ExtraSocial[];
  kycStatus: string;
  kycIdUploaded: boolean;
  kycSelfieUploaded: boolean;
  payoutMethod: string;
  payoutAccount: string;
  categories: string[];
  models: string[];
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function mapOnboardingToFormData(payload: unknown): Partial<FormData> {
  const root = asRecord(payload);
  if (!root) return {};
  const metadata = asRecord(root.metadata);
  const wizard = asRecord(metadata?.creatorWizard);

  if (wizard) {
    return wizard as Partial<FormData>;
  }

  const payout = asRecord(root.payout);
  const support = asRecord(root.support);
  return {
    name: typeof root.owner === "string" ? root.owner : undefined,
    handle: typeof root.storeSlug === "string" ? `@${root.storeSlug.replace(/^@+/, "")}` : undefined,
    bio: typeof root.about === "string" ? root.about : undefined,
    currency: typeof payout?.currency === "string" ? payout.currency : undefined,
    socials: {
      instagram: "",
      tiktok: "",
      youtube: ""
    },
    payoutMethod: typeof payout?.method === "string" ? payout.method : "",
    payoutAccount: typeof support?.email === "string" ? support.email : "",
    contentLanguages: Array.isArray(root.languages) ? root.languages.map((entry) => String(entry)) : undefined
  };
}

function buildOnboardingPayload(formData: FormData, submitted = false) {
  return {
    profileType: "CREATOR",
    status: submitted ? "submitted" : "in_progress",
    owner: formData.name,
    storeName: formData.name,
    storeSlug: String(formData.handle || "").replace(/^@+/, ""),
    about: formData.bio,
    languages: formData.contentLanguages,
    payout: {
      method: formData.payoutMethod || null,
      currency: formData.currency || "USD",
      details: {
        account: formData.payoutAccount || null
      }
    },
    metadata: {
      creatorWizard: formData
    }
  };
}

function isStepValid(stepIndex: number, formData: FormData): boolean {
  const trim = (v: string | undefined): string => (v || "").trim();

  if (stepIndex === 0) {
    // Profile: require name, handle, timezone & currency
    return (
      !!trim(formData.name) &&
      !!trim(formData.handle) &&
      !!trim(formData.timezone) &&
      !!trim(formData.currency)
    );
  }

  if (stepIndex === 1) {
    // Socials: optional (no hard gating)
    return true;
  }

  if (stepIndex === 2) {
    // KYC: require both ID and selfie uploaded
    return !!formData.kycIdUploaded && !!formData.kycSelfieUploaded;
  }

  if (stepIndex === 3) {
    // Payout: require method and account details
    return !!trim(formData.payoutMethod) && !!trim(formData.payoutAccount);
  }

  // Preferences & Review: no strict gating for now
  return true;
}

function CreatorOnboardingWizardPage() {
  const navigate = useNavigate();
  const autoSaveTimerRef = useRef<number | null>(null);

  const [stepIndex, setStepIndex] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "Ronald Isabirye",
    handle: "@ronald.creates",
    tagline: "EV & commerce storyteller",
    bio: "Creator focused on EVs, tech and cross-border commerce stories.",
    timezone: "Africa/Kampala",
    currency: "USD",
    contentLanguages: ["English"],
    audienceRegions: ["East Africa", "Asia"],
    socials: {
      instagram: "",
      tiktok: "",
      youtube: ""
    },
    primaryPlatform: "Instagram",
    extraSocials: [],
    kycStatus: "pending",
    kycIdUploaded: false,
    kycSelfieUploaded: false,
    payoutMethod: "",
    payoutAccount: "",
    categories: ["Beauty & Skincare", "Tech & Gadgets"],
    models: ["Flat fee", "Commission"]
  });

  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === STEPS.length - 1;
  const canContinue = isStepValid(stepIndex, formData);

  useEffect(() => {
    let cancelled = false;
    void creatorApi
      .onboarding()
      .then((payload) => {
        if (cancelled) return;
        const mapped = mapOnboardingToFormData(payload);
        setFormData((prev) => ({
          ...prev,
          ...mapped,
          socials: {
            ...prev.socials,
            ...(mapped.socials || {})
          }
        }));
      })
      .finally(() => {
        if (!cancelled) {
          setHydrated(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (autoSaveTimerRef.current) {
      window.clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = window.setTimeout(() => {
      setIsSaving(true);
      void creatorApi
        .saveOnboarding(buildOnboardingPayload(formData))
        .catch(() => {
          // Keep UI responsive even when autosave fails.
        })
        .finally(() => {
          setIsSaving(false);
        });
    }, 700);

    return () => {
      if (autoSaveTimerRef.current) {
        window.clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [formData, hydrated]);

  const goNext = () => {
    if (isLastStep && canContinue) {
      setIsSaving(true);
      void creatorApi
        .submitOnboarding(buildOnboardingPayload(formData, true))
        .then(() => navigate("/auth"))
        .finally(() => {
          setIsSaving(false);
        });
    } else if (!isLastStep && canContinue) {
      setStepIndex((i) => i + 1);
    }
  };

  const goBack = () => {
    if (!isFirstStep) {
      setStepIndex((i) => i - 1);
    }
  };

  const handleChange = (field: keyof FormData, value: unknown): void => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#f2f2f2] dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors overflow-x-hidden">
      <PageHeader
        pageTitle="Creator Onboarding"
        badge={
          <div className="flex items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-100 border border-slate-200 dark:border-slate-800 transition-colors">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>Progress saved</span>
            </span>
            <button
              className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-200 font-medium transition-colors"
              onClick={() => navigate("/home")}
            >
              Exit onboarding
            </button>
          </div>
        }
      />

      {/* Stepper */}
      <div className="px-3 sm:px-4 md:px-6 lg:px-8 pt-4 pb-2 bg-[#f2f2f2] dark:bg-slate-900 transition-colors w-full">
        <div className="w-full max-w-full">
          <div className="flex items-center justify-between gap-2 text-xs md:text-sm">
            {STEPS.map((label, index) => {
              const active = index === stepIndex;
              const completed = index < stepIndex;
              return (
                <div key={label} className="flex-1 flex items-center">
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex items-center justify-center h-7 w-7 rounded-full border-2 text-xs font-bold ${completed
                        ? "bg-[#03cd8c] border-[#03cd8c] text-white"
                        : active
                          ? "bg-[#f77f00] border-[#f77f00] text-white"
                          : "bg-white dark:bg-slate-800 border-slate-500 dark:border-slate-400 text-slate-900 dark:text-white transition-colors"
                        }`}
                    >
                      {completed ? "✓" : index + 1}
                    </div>
                    <span className={`text-sm ${active ? "text-slate-900 dark:text-white font-bold" : "text-slate-700 dark:text-slate-300 font-semibold"}`}>
                      {label}
                    </span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className="flex-1 h-0.5 bg-slate-500 dark:bg-slate-400 mx-2 hidden md:block transition-colors" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 flex flex-col w-full px-3 sm:px-4 md:px-6 lg:px-8 pb-16 pt-2 overflow-x-hidden">
        <div className="w-full max-w-full flex flex-col gap-4">
          {stepIndex === 0 && <StepProfile formData={formData} onChange={handleChange} />}
          {stepIndex === 1 && <StepSocials formData={formData} onChange={handleChange} />}
          {stepIndex === 2 && <StepKyc formData={formData} onChange={handleChange} />}
          {stepIndex === 3 && <StepPayout formData={formData} onChange={handleChange} />}
          {stepIndex === 4 && <StepPreferences formData={formData} onChange={handleChange} />}
          {stepIndex === 5 && <StepReview formData={formData} />}
        </div>
      </main>

      {/* Sticky footer navigation */}
      <footer className="sticky bottom-0 left-0 right-0 w-full bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-3 sm:px-4 md:px-6 lg:px-8 py-2 transition-colors">
        <div className="w-full max-w-full flex items-center justify-between gap-2 text-sm">
          <div className="hidden sm:flex flex-col">
            <span className="font-semibold dark:font-bold text-sm">
              Step {stepIndex + 1} of {STEPS.length}
            </span>
            <span className="text-xs text-slate-600 dark:text-slate-400">
              Profile → Socials → KYC → Payout → Preferences → Review
            </span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button
              className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 text-sm text-slate-600 dark:text-slate-200 disabled:opacity-40"
              onClick={goBack}
              disabled={isFirstStep}
            >
              Back
            </button>
            <button
              className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 text-sm text-slate-600 dark:text-slate-200 font-medium"
              onClick={() => {
                setIsSaving(true);
                void creatorApi
                  .saveOnboarding(buildOnboardingPayload(formData))
                  .then(() => navigate("/home"))
                  .finally(() => {
                    setIsSaving(false);
                  });
              }}
            >
              {isSaving ? "Saving..." : "Save & exit"}
            </button>
            <button
              className={`px-4 py-1.5 rounded-full text-sm font-semibold dark:font-bold ${canContinue
                ? "bg-[#f77f00] text-white hover:bg-[#e26f00]"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
                }`}
              onClick={goNext}
              disabled={!canContinue}
            >
              {isLastStep ? "Finish" : "Continue"}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* STEP 1 – PROFILE */
type StepProfileProps = {
  formData: FormData;
  onChange: (field: keyof FormData, value: unknown) => void;
};

function StepProfile({ formData, onChange }: StepProfileProps) {
  const languageOptions = [
    "English",
    "Swahili",
    "French",
    "Arabic",
    "Chinese",
    "Portuguese"
  ];

  const regionOptions = [
    "East Africa",
    "Southern Africa",
    "West Africa",
    "North Africa",
    "Asia",
    "Europe",
    "North America"
  ];

  const toggleLanguage = (lang: string): void => {
    const current = formData.contentLanguages || [];
    if (current.includes(lang)) {
      onChange("contentLanguages", current.filter((l: string) => l !== lang));
    } else {
      onChange("contentLanguages", [...current, lang]);
    }
  };

  const toggleRegion = (region: string): void => {
    const current = formData.audienceRegions || [];
    if (current.includes(region)) {
      onChange("audienceRegions", current.filter((r: string) => r !== region));
    } else {
      onChange("audienceRegions", [...current, region]);
    }
  };

  return (
    <section className="grid grid-cols-1 md:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)] gap-4 items-start">
      <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 md:p-5 flex flex-col gap-3">
        <h2 className="text-sm font-semibold dark:font-bold dark:text-slate-50 mb-1">Profile basics</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
          This is what brands and buyers will see on your public Creator profile. You can change it
          later.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="flex flex-col gap-1">
            <label className="font-medium">Full name</label>
            <input
              className="border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-sm bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:border-slate-400 dark:focus:border-slate-600 outline-none transition-colors"
              value={formData.name}
              onChange={(e) => onChange("name", e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-medium">Creator handle</label>
            <input
              className="border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-sm bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:border-slate-400 dark:focus:border-slate-600 outline-none transition-colors"
              value={formData.handle}
              onChange={(e) => onChange("handle", e.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1 text-sm">
          <label className="font-medium">Tagline</label>
          <input
            placeholder="Short line that describes your niche"
            className="border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 text-sm bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-900 focus:border-slate-400 outline-none transition-colors"
            value={formData.tagline}
            onChange={(e) => onChange("tagline", e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1 text-sm">
          <label className="font-medium">Bio</label>
          <textarea
            rows={4}
            className="border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 text-sm bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-900 focus:border-slate-400 outline-none resize-none transition-colors"
            value={formData.bio}
            onChange={(e) => onChange("bio", e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mt-2">
          <div className="flex flex-col gap-1">
            <label className="font-medium">Time zone</label>
            <select
              className="border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-sm bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:border-slate-400 dark:focus:border-slate-600 outline-none transition-colors"
              value={formData.timezone}
              onChange={(e) => onChange("timezone", e.target.value)}
            >
              <option value="Africa/Kampala">Africa/Kampala (EAT)</option>
              <option value="Africa/Nairobi">Africa/Nairobi</option>
              <option value="Asia/Shanghai">Asia/Shanghai</option>
              <option value="UTC">UTC</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-medium">Base currency</label>
            <select
              className="border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-sm bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:border-slate-400 dark:focus:border-slate-600 outline-none transition-colors"
              value={formData.currency}
              onChange={(e) => onChange("currency", e.target.value)}
            >
              <option value="USD">USD</option>
              <option value="UGX">UGX</option>
              <option value="CNY">CNY</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
        </div>

        {/* Languages & regions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mt-3">
          <div className="flex flex-col gap-1">
            <label className="font-medium">Content languages</label>
            <div className="flex flex-wrap gap-1.5">
              {languageOptions.map((lang) => {
                const selected = formData.contentLanguages?.includes(lang);
                return (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => toggleLanguage(lang)}
                    className={`px-2.5 py-1 rounded-full text-sm border ${selected
                      ? "bg-[#03cd8c] border-[#03cd8c] text-white"
                      : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                      }`}
                  >
                    {lang}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-medium">Audience regions</label>
            <div className="flex flex-wrap gap-1.5">
              {regionOptions.map((region) => {
                const selected = formData.audienceRegions?.includes(region);
                return (
                  <button
                    key={region}
                    type="button"
                    onClick={() => toggleRegion(region)}
                    className={`px-2.5 py-1 rounded-full text-sm border ${selected
                      ? "bg-[#f77f00] border-[#f77f00] text-white"
                      : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                      }`}
                  >
                    {region}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
          We use languages and regions to pre-filter campaigns and improve your match score with
          brands.
        </p>
      </div>

      {/* AI profile builder side card */}
      <aside className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 md:p-5 text-sm flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🤖</span>
            <div>
              <h3 className="text-xs font-semibold dark:font-bold">AI profile builder</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Use your connected socials to suggest a strong bio and tagline.
              </p>
            </div>
          </div>
          <span className="text-xs text-slate-400 dark:text-slate-400">Optional</span>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl p-2.5 text-xs transition-colors">
          <p className="text-slate-600 dark:text-slate-200 mb-1">
            We will look at your recent posts and audience to craft a bio that highlights your niche,
            tone and regions.
          </p>
          <ul className="list-disc pl-4 text-slate-600 dark:text-slate-400 space-y-0.5">
            <li>Review and edit before publishing.</li>
            <li>No content is posted without your approval.</li>
          </ul>
        </div>
        <button className="w-full py-1.5 rounded-full bg-[#f77f00] text-white text-sm font-semibold dark:font-bold hover:bg-[#e26f00]">
          Suggest bio & tagline
        </button>
        <button className="w-full py-1.5 rounded-full border border-slate-200 dark:border-slate-800 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 transition-colors">
          I will write it myself
        </button>
      </aside>
    </section>
  );
}

/* STEP 2 – SOCIALS */
type StepSocialsProps = {
  formData: FormData;
  onChange: (field: keyof FormData, value: unknown) => void;
};

function StepSocials({ formData, onChange }: StepSocialsProps) {
  const primary = formData.socials || {};
  const extraSocials = formData.extraSocials || [];

  const updateSocial = (platform: keyof SocialsData, value: string): void => {
    onChange("socials", { ...primary, [platform]: value });
  };

  const updateExtraSocial = (index: number, field: keyof ExtraSocial, value: string): void => {
    const updated = extraSocials.map((acc: ExtraSocial, idx: number) =>
      idx === index ? { ...acc, [field]: value } : acc
    );
    onChange("extraSocials", updated);
  };

  const addExtraSocial = (): void => {
    onChange("extraSocials", [
      ...extraSocials,
      { platform: "", handle: "", followers: "" }
    ]);
  };

  const removeExtraSocial = (index: number): void => {
    onChange(
      "extraSocials",
      extraSocials.filter((_: ExtraSocial, idx: number) => idx !== index)
    );
  };

  const commonPlatforms = [
    "Facebook",
    "X (Twitter)",
    "Snapchat",
    "Kwai",
    "LinkedIn",
    "Twitch",
    "Other"
  ];

  const parseFollowersString = (str: string | undefined): number => {
    if (!str) return 0;
    const trimmed = String(str).trim().toLowerCase();
    const match = trimmed.match(/^([0-9.,]+)\s*([km]?)$/);
    if (!match) return 0;
    const numPart = parseFloat(match[1].replace(/,/g, ""));
    if (Number.isNaN(numPart)) return 0;
    const suffix = match[2];
    if (suffix === "k") return Math.round(numPart * 1000);
    if (suffix === "m") return Math.round(numPart * 1000000);
    return Math.round(numPart);
  };

  const totalReach = extraSocials.reduce(
    (sum: number, acc: ExtraSocial) => sum + parseFollowersString(acc.followers),
    0
  );

  return (
    <section className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 md:p-5 flex flex-col gap-4">
      <div>
        <h2 className="text-sm font-semibold dark:font-bold dark:text-slate-50 mb-1">Link social accounts</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
          Connect all the channels you actively use. We use this to understand your audience and
          show relevant campaigns. We never post without your consent.
        </p>
      </div>

      {/* Primary platforms */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <SocialConnectRow
          label="Instagram"
          handle={primary.instagram}
          placeholder="@yourhandle"
          onChange={(v: string) => updateSocial("instagram", v)}
        />
        <SocialConnectRow
          label="TikTok"
          handle={primary.tiktok}
          placeholder="@yourhandle"
          onChange={(v: string) => updateSocial("tiktok", v)}
        />
        <SocialConnectRow
          label="YouTube"
          handle={primary.youtube}
          placeholder="Channel URL or @handle"
          onChange={(v: string) => updateSocial("youtube", v)}
        />
        <div className="flex flex-col gap-1">
          <label className="font-medium flex items-center gap-1">
            <span>Primary platform</span>
            <span className="text-tiny text-slate-400 dark:text-slate-400">(helps us prioritise campaigns)</span>
          </label>
          <select
            className="border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 text-sm bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-900 focus:border-slate-400 outline-none transition-colors"
            value={formData.primaryPlatform}
            onChange={(e) => onChange("primaryPlatform", e.target.value)}
          >
            <option value="Instagram">Instagram</option>
            <option value="TikTok">TikTok</option>
            <option value="YouTube">YouTube</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      {/* Other platforms – dynamic list */}
      <div className="mt-2">
        <h3 className="text-xs font-semibold dark:font-bold mb-1">Other platforms</h3>
        <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
          Add as many as you need: Facebook, X (Twitter), Snapchat, Kwai, LinkedIn, Twitch or
          anything else.
        </p>
        <div className="space-y-2">
          {extraSocials.map((acc, index) => (
            <div
              key={index}
              className="border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 bg-slate-50 dark:bg-slate-900 flex flex-col gap-2 transition-colors"
            >
              <div className="flex flex-col md:flex-row gap-2">
                <div className="md:w-40 flex flex-col gap-1 text-sm">
                  <label className="text-xs text-slate-600 dark:text-slate-200 font-medium">Platform</label>
                  <select
                    className="border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-slate-900 focus:border-slate-400 outline-none transition-colors"
                    value={acc.platform}
                    onChange={(e) => updateExtraSocial(index, "platform", e.target.value)}
                  >
                    <option value="">Select platform</option>
                    {commonPlatforms.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 flex flex-col gap-1 text-sm">
                  <label className="text-xs text-slate-600 dark:text-slate-200 font-medium">Handle or URL</label>
                  <input
                    className="border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-slate-900 focus:border-slate-400 outline-none transition-colors"
                    placeholder="@handle or full URL"
                    value={acc.handle}
                    onChange={(e) => updateExtraSocial(index, "handle", e.target.value)}
                  />
                </div>
                <div className="md:w-32 flex flex-col gap-1 text-sm">
                  <label className="text-xs text-slate-600 dark:text-slate-200 font-medium">Followers (approx.)</label>
                  <input
                    className="border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-slate-900 focus:border-slate-400 outline-none transition-colors"
                    placeholder="e.g. 12k"
                    value={acc.followers}
                    onChange={(e) => updateExtraSocial(index, "followers", e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-400">
                  We use this to improve campaign matching. You can hide certain platforms later.
                </span>
                <button
                  className="text-slate-400 hover:text-slate-700 dark:text-slate-100 font-medium transition-colors"
                  onClick={() => removeExtraSocial(index)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="mt-2 px-3 py-1.5 rounded-full border border-dashed border-slate-300 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 transition-colors"
          onClick={addExtraSocial}
        >
          + Add another account
        </button>

        {/* Total reach summary */}
        <div className="mt-2 text-xs text-slate-600 dark:text-slate-200 font-medium">
          Total reach across connected extra platforms:
          <span className="font-semibold dark:font-bold">
            {" "}
            {totalReach > 0 ? totalReach.toLocaleString() : "0"} followers
          </span>
        </div>
      </div>

      <div className="mt-2 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-2.5 text-xs transition-colors">
        <p className="text-slate-600 dark:text-slate-200 mb-1">Why connect socials?</p>
        <ul className="list-disc pl-4 text-slate-600 dark:text-slate-400 space-y-0.5">
          <li>Auto-pull follower counts to seed your rank.</li>
          <li>Better campaign matches based on content niche and regions.</li>
          <li>Optional: enable tracking links for commission and attribution.</li>
        </ul>
      </div>
    </section>
  );
}

type SocialConnectRowProps = {
  label: string;
  handle: string;
  placeholder: string;
  onChange: (value: string) => void;
};

function SocialConnectRow({ label, handle, placeholder, onChange }: SocialConnectRowProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="font-medium flex items-center gap-1">
        <span>{label}</span>
        <span className="text-tiny text-slate-400 dark:text-slate-400">(optional)</span>
      </label>
      <div className="flex items-center gap-2">
        <button className="px-2 py-1 rounded-full border border-slate-200 dark:border-slate-800 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 transition-colors">
          Connect
        </button>
        <input
          className="flex-1 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 text-sm bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-900 focus:border-slate-400 outline-none transition-colors"
          placeholder={placeholder}
          value={handle}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}

/* STEP 3 – KYC */
type StepKycProps = {
  formData: FormData;
  onChange: (field: keyof FormData, value: unknown) => void;
};

function StepKyc({ formData, onChange }: StepKycProps) {
  const isVerified = formData.kycStatus === "verified";
  const showKycDocsError = !formData.kycIdUploaded || !formData.kycSelfieUploaded;

  return (
    <section className="grid grid-cols-1 md:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)] gap-4 items-start">
      <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 md:p-5 flex flex-col gap-3 text-sm">
        <h2 className="text-sm font-semibold dark:text-slate-50 dark:font-bold mb-1">Verify your identity</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
          We work with brands and regulated categories. KYC keeps the platform safe for everyone.
        </p>
        <div className="flex items-center gap-2 mb-2">
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs ${isVerified
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : "bg-amber-50 border-amber-200 text-amber-700"
              }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${isVerified ? "bg-emerald-500" : "bg-amber-500"
                }`}
            />
            <span>{isVerified ? "KYC verified" : "KYC pending"}</span>
          </span>
          <span className="text-xs text-slate-600 dark:text-slate-400">
            Typical review time: under 24 hours.
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="font-medium">Government ID</label>
            <div className="border border-dashed border-slate-300 rounded-lg px-2 py-4 flex flex-col items-center justify-center text-xs bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 transition-colors">
              <span>Drag &amp; drop ID image here</span>
              <span className="text-tiny text-slate-400 mt-1">
                JPEG, PNG or PDF • max 10 MB
              </span>
              <button
                className="mt-2 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-800 text-xs hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-700 transition-colors"
                onClick={() => onChange("kycIdUploaded", true)}
              >
                Mark ID as uploaded
              </button>
            </div>
            {!formData.kycIdUploaded && (
              <p className="mt-1 text-xs text-red-500">
                Please upload a clear image of your government ID.
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-medium">Selfie verification</label>
            <div className="border border-dashed border-slate-300 rounded-lg px-2 py-4 flex flex-col items-center justify-center text-xs bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 transition-colors">
              <span>Take or upload a selfie</span>
              <span className="text-tiny text-slate-400 mt-1">
                Make sure your face matches your ID.
              </span>
              <button
                className="mt-2 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-800 text-xs hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-700 transition-colors"
                onClick={() => onChange("kycSelfieUploaded", true)}
              >
                Mark selfie as uploaded
              </button>
            </div>
            {!formData.kycSelfieUploaded && (
              <p className="mt-1 text-xs text-red-500">
                Please provide a selfie for verification.
              </p>
            )}
          </div>
        </div>
        <div className="mt-2 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-2.5 text-xs transition-colors">
          <p className="text-slate-600 dark:text-slate-200 mb-1">Your information is encrypted and protected.</p>
          <ul className="list-disc pl-4 text-slate-600 dark:text-slate-400 space-y-0.5">
            <li>Only compliance teams can view your documents.</li>
            <li>We never share KYC files with brands or third parties.</li>
          </ul>
        </div>
        {showKycDocsError && (
          <p className="mt-1 text-xs text-red-500">
            To continue, upload both your government ID and selfie.
          </p>
        )}
      </div>

      <aside className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 md:p-5 text-sm flex flex-col gap-3">
        <h3 className="text-xs font-semibold mb-1">Verification status</h3>
        <div className="flex items-center gap-2 mb-1">
          <div className="h-6 w-6 rounded-full border border-slate-300 flex items-center justify-center text-xs">
            {isVerified ? "✓" : "!"}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium">
              {isVerified ? "All set" : "Action required"}
            </span>
            <span className="text-xs text-slate-600 dark:text-slate-400">
              {isVerified
                ? "You can go live and join campaigns."
                : "Upload clear documents to unlock Creator features."}
            </span>
          </div>
        </div>
        <button
          className="w-full py-1.5 rounded-full border border-slate-200 dark:border-slate-800 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 transition-colors"
          onClick={() => onChange("kycStatus", isVerified ? "pending" : "verified")}
        >
          {isVerified ? "Mark as pending (simulate)" : "Mark as verified (simulate)"}
        </button>
      </aside>
    </section>
  );
}

/* STEP 4 – PAYOUT */
type StepPayoutProps = {
  formData: FormData;
  onChange: (field: keyof FormData, value: unknown) => void;
};

function StepPayout({ formData, onChange }: StepPayoutProps) {
  const payoutMissingMethod = !formData.payoutMethod;
  const payoutMissingAccount = !(formData.payoutAccount || "").trim();

  return (
    <section className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 md:p-5 flex flex-col gap-3 text-sm">
      <h2 className="text-sm font-semibold dark:text-slate-50 dark:font-bold mb-1">Payout details</h2>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
        Choose how you want to get paid. You can manage different payout methods for different
        regions later.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <PayoutMethodCard
          label="Bank account"
          description="Best for higher volume and stable currencies."
          selected={formData.payoutMethod === "bank"}
          onSelect={() => onChange("payoutMethod", "bank")}
        />
        <PayoutMethodCard
          label="Mobile money"
          description="Popular across Africa. Fast and convenient."
          selected={formData.payoutMethod === "mobile"}
          onSelect={() => onChange("payoutMethod", "mobile")}
        />
        <PayoutMethodCard
          label="PayPal / Others"
          description="Use existing wallets in supported regions."
          selected={formData.payoutMethod === "wallet"}
          onSelect={() => onChange("payoutMethod", "wallet")}
        />
      </div>
      {payoutMissingMethod && (
        <p className="mt-1 text-xs text-red-500">
          Please select at least one payout method.
        </p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
        <div className="flex flex-col gap-1">
          <label className="font-medium">Account details</label>
          <textarea
            rows={3}
            className="border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 text-sm bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-900 focus:border-slate-400 outline-none resize-none transition-colors"
            placeholder="e.g. Bank name, account name & number, or mobile money number and provider."
            value={formData.payoutAccount}
            onChange={(e) => onChange("payoutAccount", e.target.value)}
          />
          {payoutMissingAccount && (
            <p className="mt-1 text-xs text-red-500">
              Please provide payout account details.
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <label className="font-medium">Test payout status</label>
          <div className="border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-2 bg-slate-50 dark:bg-slate-900 flex flex-col gap-1 text-xs transition-colors">
            <div className="flex items-center justify-between">
              <span>Micro-deposit</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                <span>Pending</span>
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-400">
              We will send a small test amount. Confirm the value to activate payouts.
            </p>
            <button className="mt-1 self-start px-3 py-1 rounded-full border border-slate-200 dark:border-slate-800 text-xs hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-700 transition-colors">
              Resend test payout
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

type PayoutMethodCardProps = {
  label: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
};

function PayoutMethodCard({ label, description, selected, onSelect }: PayoutMethodCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`text-left border rounded-2xl p-3 flex flex-col gap-1 text-sm transition-colors ${selected
        ? "border-[#f77f00] bg-amber-50/40"
        : "border-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        }`}
    >
      <span className="text-md font-semibold">{label}</span>
      <span className="text-xs text-slate-600 dark:text-slate-400">{description}</span>
    </button>
  );
}

/* STEP 5 – PREFERENCES */
type StepPreferencesProps = {
  formData: FormData;
  onChange: (field: keyof FormData, value: unknown) => void;
};

function StepPreferences({ formData, onChange }: StepPreferencesProps) {
  const toggleCategory = (cat: string): void => {
    const current = formData.categories || [];
    if (current.includes(cat)) {
      onChange("categories", current.filter((c: string) => c !== cat));
    } else {
      onChange("categories", [...current, cat]);
    }
  };

  const toggleModel = (model: string): void => {
    const current = formData.models || [];
    if (current.includes(model)) {
      onChange("models", current.filter((m: string) => m !== model));
    } else {
      onChange("models", [...current, model]);
    }
  };

  const categories = [
    "Beauty & Skincare",
    "Tech & Gadgets",
    "Education",
    "Faith-compatible",
    "Home & Living",
    "Food & Groceries"
  ];

  const models = ["Flat fee", "Commission", "Hybrid"];

  return (
    <section className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 md:p-5 flex flex-col gap-3 text-sm">
      <h2 className="text-sm font-semibold dark:text-slate-50 dark:font-bold mb-1">Categories & collaboration models</h2>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
        Tell us what you want to promote and how you prefer to work with brands. We will use this
        to tailor your Opportunities and Campaigns Board.
      </p>

      {/* Providers Education Reminder */}
      <div className="mb-4 bg-gradient-to-br from-[#03cd8c] to-[#02a873] rounded-2xl p-4 text-white shadow-md flex flex-col md:flex-row items-center gap-4 transition-all">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">🤝</span>
            <h3 className="text-sm font-bold">what are MyLiveDealz Suppliers?</h3>
          </div>
          <p className="text-xs text-emerald-50 leading-relaxed font-medium">
            Meet your service suppliers on EVzone. Providers offer <strong>consultation, production services, and space bookings</strong> to help you level up your content. Look for them in the Discovery Pool later!
          </p>
        </div>
        <div className="hidden md:flex gap-2">
          <div className="bg-white/10 rounded-xl p-2 flex flex-col items-center">
            <span className="text-base">🎬</span>
            <span className="text-[9px] uppercase font-bold mt-0.5">Production</span>
          </div>
          <div className="bg-white/10 rounded-xl p-2 flex flex-col items-center">
            <span className="text-base">📈</span>
            <span className="text-[9px] uppercase font-bold mt-0.5">Consulting</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <h3 className="text-xs font-semibold mb-1">Categories</h3>
          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => {
              const selected = formData.categories?.includes(cat);
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className={`px-2.5 py-1 rounded-full text-sm border ${selected
                    ? "bg-[#f77f00] border-[#f77f00] text-white"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 dark:bg-slate-700"
                    }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>
        <div className="w-full md:w-56">
          <h3 className="text-xs font-semibold mb-1">Collaboration models</h3>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {models.map((m) => {
              const selected = formData.models?.includes(m);
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => toggleModel(m)}
                  className={`px-2.5 py-1 rounded-full text-sm border ${selected
                    ? "bg-[#03cd8c] border-[#03cd8c] text-white"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 dark:bg-slate-700"
                    }`}
                >
                  {m}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            You can negotiate case by case, but setting a preference helps us filter out campaigns
            that do not fit your style.
          </p>
        </div>
      </div>
    </section>
  );
}

/* STEP 6 – REVIEW */
type StepReviewProps = {
  formData: FormData;
};

function StepReview({ formData }: StepReviewProps) {
  const extraSocials = formData.extraSocials || [];

  return (
    <section className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 md:p-5 flex flex-col gap-3 text-sm">
      <h2 className="text-sm font-semibold dark:text-slate-50 dark:font-bold mb-1">Review your Creator profile</h2>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
        This is a summary of what brands will see when they discover you. You can adjust any section
        later in Settings.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="border border-slate-100 dark:border-slate-800 rounded-xl p-3">
          <h3 className="text-xs font-semibold mb-1">Profile</h3>
          <p className="text-sm">
            <span className="font-medium">{formData.name}</span>
            <span className="text-slate-600 dark:text-slate-400"> ({formData.handle})</span>
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{formData.tagline}</p>
          <p className="text-xs text-slate-600 dark:text-slate-200 mt-1">{formData.bio}</p>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Time zone:{" "}
            <span className="font-medium">{formData.timezone}</span> · Base currency:{" "}
            <span className="font-medium">{formData.currency}</span>
          </p>
        </div>
        <div className="border border-slate-100 dark:border-slate-800 rounded-xl p-3">
          <h3 className="text-xs font-semibold mb-1">Categories & models</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Preferred categories:</p>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {(formData.categories || []).map((cat) => (
              <span
                key={cat}
                className="px-2 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-100 font-medium transition-colors"
              >
                {cat}
              </span>
            ))}
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Collaboration models:</p>
          <div className="flex flex-wrap gap-1.5">
            {(formData.models || []).map((m) => (
              <span
                key={m}
                className="px-2 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-100 font-medium transition-colors"
              >
                {m}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
        <div className="border border-slate-100 dark:border-slate-800 rounded-xl p-3">
          <h3 className="text-xs font-semibold mb-1">Socials snapshot</h3>
          <ul className="text-xs text-slate-600 dark:text-slate-200 space-y-0.5">
            <li>Instagram: {formData.socials.instagram || "not connected"}</li>
            <li>TikTok: {formData.socials.tiktok || "not connected"}</li>
            <li>YouTube: {formData.socials.youtube || "not connected"}</li>
          </ul>
          {extraSocials.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-0.5">Other accounts:</p>
              <ul className="space-y-0.5 text-xs text-slate-600 dark:text-slate-200 font-medium">
                {extraSocials.map((acc, idx) => (
                  <li key={idx}>
                    {acc.platform || "Custom"}: {acc.handle || "(no handle)"}
                    {acc.followers && <span> · {acc.followers} followers</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="border border-slate-100 dark:border-slate-800 rounded-xl p-3">
          <h3 className="text-xs font-semibold mb-1">Payout snapshot</h3>
          <p className="text-xs text-slate-600 dark:text-slate-200 mb-1">
            Method: <span className="font-medium">{formData.payoutMethod || "not set"}</span>
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {formData.payoutAccount || "Add account details"}
          </p>
        </div>
      </div>
    </section>
  );
}

export { CreatorOnboardingWizardPage };
