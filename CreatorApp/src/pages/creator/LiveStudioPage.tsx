import React, { useState, useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader";
import { creatorApi } from "../../lib/creatorApi";

const EV_ORANGE = "#f77f00";

type Toast = { message: string } | null;

type Mode = "lobby" | "live";
type AudienceTab = "chat" | "qa" | "viewers";

type Product = {
  id: string;
  name: string;
  price: string;
  stock: string;
  tag: string;
};

type CoHost = {
  id: number;
  name: string;
  status: string;
};

type Attachment = {
  id: number;
  from: string;
  type: string;
  label: string;
  status: string;
};

type Scene = {
  id: string;
  label: string;
  desc?: string;
};

type Shot = {
  id: string;
  label: string;
  window: string;
  scene: string;
};

type SalesEvent = {
  id: number;
  label: string;
  time: string;
};

type MomentMarker = {
  id: number;
  time: string;
  label: string;
};

type ChatMessage = {
  id: number;
  from: string;
  body: string;
  time: string;
  system?: boolean;
  audioUrl?: string; // For voice messages
  attachmentUrl?: string; // For file attachments
  attachmentType?: "image" | "video" | "file";
};

type QAItem = {
  id: number;
  question: string;
  from: string;
  status: string;
};

type Viewer = {
  id: number;
  name: string;
  tag: string;
};

type CommerceGoal = {
  soldUnits: number;
  targetUnits: number;
  cartCount: number;
  last5MinSales: number;
};


/** -----------------------------------------------------------------------
 * Giveaways (configured in Live Builder)
 * ------------------------------------------------------------------------ */

type StoredGiveaway = {
  id: string;
  linkedItemId?: string;
  title?: string;
  imageUrl?: string;
  notes?: string;
  showOnPromo?: boolean;
  quantity?: number; // Total quantity configured in Live Builder (min 1)
};

type StoredFeaturedItem = {
  id?: string;
  title?: string;
  name?: string;
  label?: string;
  imageUrl?: string;
  posterUrl?: string;
  thumbnailUrl?: string;
  thumbUrl?: string;
  heroImageUrl?: string;
  coverImageUrl?: string;
};

type StoredLiveDraft = {
  giveaways: StoredGiveaway[];
  products: StoredFeaturedItem[];
};

function coercePositiveInt(value: unknown, fallback = 1): number {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(n)) return fallback;
  const i = Math.floor(n);
  return i >= 1 ? i : fallback;
}

function coerceItemTitle(item?: StoredFeaturedItem | null): string {
  if (!item) return "";
  return (
    (typeof item.title === "string" && item.title) ||
    (typeof item.name === "string" && item.name) ||
    (typeof item.label === "string" && item.label) ||
    ""
  );
}

function coerceItemImageUrl(item?: StoredFeaturedItem | null): string {
  if (!item) return "";
  const anyItem = item as any;
  const candidates = [
    anyItem.imageUrl,
    anyItem.posterUrl,
    anyItem.thumbnailUrl,
    anyItem.thumbUrl,
    anyItem.heroImageUrl,
    anyItem.coverImageUrl,
    anyItem.image,
    anyItem.poster,
    anyItem.thumbnail,
  ];
  const first = candidates.find((v) => typeof v === "string" && v.trim().length > 0);
  return typeof first === "string" ? first : "";
}

function extractLiveDraftFromStoragePayload(payload: unknown): StoredLiveDraft | null {
  if (!payload || typeof payload !== "object") return null;
  const root: any = payload as any;
  const draftLike = root?.draft && typeof root.draft === "object" ? root.draft : root;
  if (!draftLike || typeof draftLike !== "object") return null;

  const giveawaysRaw = (draftLike as any).giveaways;
  const productsRaw = (draftLike as any).products || (draftLike as any).items;

  const giveawaysArr = Array.isArray(giveawaysRaw) ? giveawaysRaw : [];
  const productsArr = Array.isArray(productsRaw) ? productsRaw : [];

  if (!giveawaysArr.length && !productsArr.length) return null;

  const normalizedGiveaways: StoredGiveaway[] = giveawaysArr.map((g: any, idx: number) => ({
    id: typeof g?.id === "string" && g.id ? g.id : `giveaway_${idx}`,
    linkedItemId: typeof g?.linkedItemId === "string" ? g.linkedItemId : undefined,
    title: typeof g?.title === "string" ? g.title : undefined,
    imageUrl: typeof g?.imageUrl === "string" ? g.imageUrl : undefined,
    notes: typeof g?.notes === "string" ? g.notes : undefined,
    showOnPromo: typeof g?.showOnPromo === "boolean" ? g.showOnPromo : undefined,
    quantity: coercePositiveInt((g as any)?.quantity, 1),
  }));

  return {
    giveaways: normalizedGiveaways,
    products: productsArr as StoredFeaturedItem[],
  };
}


function LiveStudioPage({ onChangePage }: { onChangePage?: (page: "live-schedule" | "home") => void }) {
  // const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const handleExit = () => {
    if (onChangePage) {
      onChangePage("live-schedule");
    } else {
      navigate("/live-schedule");
    }
  };

  const [mode, setMode] = useState<Mode>("lobby");
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [screenShareOn, setScreenShareOn] = useState(false);
  const [activeSceneId, setActiveSceneId] = useState("");

  const [highlightedProductId, setHighlightedProductId] = useState("");
  const [flashDealzActive, setFlashDealzActive] = useState(false);
  const [flashDealzSeconds, setFlashDealzSeconds] = useState(120);
  const [, setFlashConfigOpen] = useState(false);

  const [, setFiltersOpen] = useState(false);
  const [tipsOpen, setTipsOpen] = useState(false);
  const [, setLanguagePanelOpen] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
  const [studioId, setStudioId] = useState("default");
  const [studioHydrated, setStudioHydrated] = useState(false);
  const [studioData, setStudioData] = useState<Record<string, unknown>>({});

  const showToast = (msg: string) => {
    setToast({ message: msg });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    let cancelled = false;
    const sessionIdFromQuery = new URLSearchParams(location.search).get("sessionId");
    const sessionIdFromState = (location.state as { sessionId?: string } | null)?.sessionId;
    const candidateId = sessionIdFromQuery || sessionIdFromState || "default";

    const load = async () => {
      try {
        const studio =
          candidateId === "default"
            ? await creatorApi.liveStudioDefault()
            : await creatorApi.liveStudio(candidateId);
        if (cancelled) return;
        setStudioId(String(studio.id || candidateId));
        const data =
          studio.data && typeof studio.data === "object" && !Array.isArray(studio.data)
            ? (studio.data as Record<string, unknown>)
            : {};
        setStudioData(data);
        if (typeof data.micOn === "boolean") setMicOn(data.micOn);
        if (typeof data.camOn === "boolean") setCamOn(data.camOn);
        if (typeof data.screenShareOn === "boolean") setScreenShareOn(data.screenShareOn);
        if (typeof data.activeSceneId === "string") setActiveSceneId(data.activeSceneId);
        if (typeof data.highlightedProductId === "string") setHighlightedProductId(data.highlightedProductId);
        if (typeof data.flashDealzActive === "boolean") setFlashDealzActive(data.flashDealzActive);
        if (typeof data.flashDealzSeconds === "number") setFlashDealzSeconds(data.flashDealzSeconds);
        if (typeof data.viewerCount === "number") setViewerCount(Math.max(0, Math.round(data.viewerCount)));
        if (typeof data.salesCount === "number") setSalesCount(Math.max(0, Math.round(data.salesCount)));
        if (Array.isArray(data.coHosts)) {
          setCoHosts(
            data.coHosts.map((entry, index) => {
              const row = entry as Record<string, unknown>;
              return {
                id: Number(row.id || index + 1),
                name: String(row.name || ""),
                status: String(row.status || "")
              };
            })
          );
        }
        if (Array.isArray(data.attachments)) {
          setAttachments(
            data.attachments.map((entry, index) => {
              const row = entry as Record<string, unknown>;
              return {
                id: Number(row.id || index + 1),
                from: String(row.from || ""),
                type: String(row.type || ""),
                label: String(row.label || ""),
                status: String(row.status || "")
              };
            })
          );
        }
        if (Array.isArray(data.chatMessages)) {
          setChatMessages(
            data.chatMessages.map((entry, index) => {
              const row = entry as Record<string, unknown>;
              return {
                id: Number(row.id || index + 1),
                from: String(row.from || ""),
                body: String(row.body || ""),
                time: String(row.time || ""),
                system: Boolean(row.system),
                audioUrl: typeof row.audioUrl === "string" ? row.audioUrl : undefined,
                attachmentUrl: typeof row.attachmentUrl === "string" ? row.attachmentUrl : undefined,
                attachmentType:
                  row.attachmentType === "image" || row.attachmentType === "video" || row.attachmentType === "file"
                    ? row.attachmentType
                    : undefined
              } as ChatMessage;
            })
          );
        }
        if (studio.status === "live") setMode("live");
      } catch {
        setStudioData({});
      } finally {
        if (!cancelled) {
          setStudioHydrated(true);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [location.search, location.state]);

  useEffect(() => {
    if (location.state?.smartBundle) {
      const bundle = location.state.smartBundle;
      showToast(`📦 Imported Smart Bundle: ${bundle.campaign}`);

      const sysMsg: ChatMessage = {
        id: Date.now(),
        from: "System",
        body: `✅ Imported Show Pack: ${bundle.campaign} (${bundle.assets.length} assets ready)`,
        time: "Now",
        system: true
      };
      setChatMessages(prev => [...prev, sysMsg]);

      window.history.replaceState({}, document.title);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const products = useMemo<Product[]>(() => {
    const rows = Array.isArray(studioData.products) ? studioData.products : [];
    return rows.map((entry, index) => {
      const row = entry as Record<string, unknown>;
      return {
        id: String(row.id || `product_${index + 1}`),
        name: String(row.name || row.title || ""),
        price: String(row.price || row.priceLabel || ""),
        stock: String(row.stock || row.stockLabel || ""),
        tag: String(row.tag || "")
      };
    });
  }, [studioData.products]);

  useEffect(() => {
    if (highlightedProductId && !products.some((product) => product.id === highlightedProductId)) {
      setHighlightedProductId("");
    }
  }, [highlightedProductId, products]);

  // Co-hosts with proper state management
  const [coHosts, setCoHosts] = useState<CoHost[]>([]);

  // Recording state for voice messages
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingSecondsRef = useRef(0); // Ref to track current seconds for closure
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  // const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Pinned message state
  const [pinnedMessage, setPinnedMessage] = useState<string | null>(null);

  // Poll state
  const [pollActive, setPollActive] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  // const [_pollOptions, setPollOptions] = useState<string[]>(["Yes", "No"]);
  const [pollResults, setPollResults] = useState<number[]>([0, 0]);

  // Giveaway state
  const [giveawayActive, setGiveawayActive] = useState(false);
  const [giveawayEntries, setGiveawayEntries] = useState(0);

  // Giveaways configured in Live Builder (loaded from persisted draft when available)
  const [storedLiveDraft, setStoredLiveDraft] = useState<StoredLiveDraft | null>(null);
  const [selectedGiveawayId, setSelectedGiveawayId] = useState<string>("");
  // Remaining quantities per giveaway (live session UI state)
  const [giveawayRemainingById, setGiveawayRemainingById] = useState<Record<string, number>>({});

  useEffect(() => {
    const fromStudioData = extractLiveDraftFromStoragePayload(studioData);
    if (!fromStudioData) {
      setStoredLiveDraft(null);
      return;
    }
    setStoredLiveDraft(fromStudioData);
    if (!fromStudioData.giveaways.some((entry) => entry.id === selectedGiveawayId)) {
      setSelectedGiveawayId("");
    }
  }, [selectedGiveawayId, studioData]);

  const configuredGiveaways = storedLiveDraft?.giveaways || [];
  const configuredProducts = storedLiveDraft?.products || [];

  useEffect(() => {
    if (!studioHydrated) return;
    const timeout = window.setTimeout(() => {
      void creatorApi.updateLiveStudio(studioId, {
        data: {
          mode,
          micOn,
          camOn,
          screenShareOn,
          activeSceneId,
          highlightedProductId,
          flashDealzActive,
          flashDealzSeconds,
          giveawayActive,
          giveawayEntries,
          selectedGiveawayId
        }
      });
    }, 400);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [
    activeSceneId,
    camOn,
    flashDealzActive,
    flashDealzSeconds,
    giveawayActive,
    giveawayEntries,
    highlightedProductId,
    micOn,
    mode,
    screenShareOn,
    selectedGiveawayId,
    studioHydrated,
    studioId
  ]);

  // Keep remaining quantities in sync when the configured giveaway list changes.
  // We preserve any existing remaining counts where possible (e.g., while live).
  const giveawaysSignature = useMemo(() => {
    if (!configuredGiveaways.length) return "";
    return configuredGiveaways
      .map((g) => `${g.id}:${coercePositiveInt((g as any)?.quantity, 1)}`)
      .join("|");
  }, [configuredGiveaways]);

  useEffect(() => {
    if (!configuredGiveaways.length) {
      setGiveawayRemainingById({});
      return;
    }
    setGiveawayRemainingById((prev) => {
      const next: Record<string, number> = {};
      for (const g of configuredGiveaways) {
        const total = coercePositiveInt((g as any)?.quantity, 1);
        const prevVal = prev[g.id];
        const keep = typeof prevVal === "number" && Number.isFinite(prevVal) ? prevVal : total;
        next[g.id] = Math.max(0, Math.min(keep, total));
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [giveawaysSignature]);

  const giveawayPrizeOptions = configuredGiveaways.map((g) => {
    const linkedItem = g.linkedItemId
      ? configuredProducts.find((p) => p.id === g.linkedItemId)
      : undefined;
    const label = coerceItemTitle(linkedItem) || g.title || "";
    return { id: g.id, label };
  });

  const giveawayControlItems = useMemo(() => {
    return configuredGiveaways.map((g) => {
      const linkedItem = g.linkedItemId
        ? configuredProducts.find((p) => p.id === g.linkedItemId)
        : undefined;
      const label = coerceItemTitle(linkedItem) || g.title || "";
      const imageUrl = coerceItemImageUrl(linkedItem) || g.imageUrl || "";
      const totalQty = coercePositiveInt((g as any)?.quantity, 1);
      const remaining =
        typeof giveawayRemainingById[g.id] === "number" && Number.isFinite(giveawayRemainingById[g.id])
          ? giveawayRemainingById[g.id]
          : totalQty;
      return {
        id: g.id,
        label,
        imageUrl,
        totalQty,
        remaining,
      };
    });
  }, [configuredGiveaways, configuredProducts, giveawayRemainingById]);

  const nextAvailableGiveawayId = giveawayControlItems.find((g) => g.remaining > 0)?.id || "";

  const selectedIsValid =
    !!selectedGiveawayId && giveawayControlItems.some((g) => g.id === selectedGiveawayId);
  const selectedControlItem = selectedIsValid
    ? giveawayControlItems.find((g) => g.id === selectedGiveawayId)
    : undefined;
  const selectedIsCompleted = !!selectedControlItem && selectedControlItem.remaining <= 0;

  const effectiveGiveawayId =
    selectedIsValid && (!selectedIsCompleted || giveawayActive) ? selectedGiveawayId : nextAvailableGiveawayId;

  const effectiveGiveawayMeta = giveawayControlItems.find((g) => g.id === effectiveGiveawayId);

  const selectedGiveaway = configuredGiveaways.find((g) => g.id === effectiveGiveawayId);

  const linkedPrizeItem = selectedGiveaway?.linkedItemId
    ? configuredProducts.find((p) => p.id === selectedGiveaway.linkedItemId)
    : undefined;

  const giveawayPrizeLabel = coerceItemTitle(linkedPrizeItem) || selectedGiveaway?.title || "";
  const giveawayPrizeImageUrl = coerceItemImageUrl(linkedPrizeItem) || selectedGiveaway?.imageUrl || "";
  const giveawayPrizeRemainingQty =
    typeof effectiveGiveawayMeta?.remaining === "number" && Number.isFinite(effectiveGiveawayMeta.remaining)
      ? effectiveGiveawayMeta.remaining
      : undefined;
  const giveawayPrizeCompleted = typeof giveawayPrizeRemainingQty === "number" ? giveawayPrizeRemainingQty <= 0 : false;

  // File attachment dialog
  const [attachDialogOpen, setAttachDialogOpen] = useState(false);

  // Attachments mock
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const scenes = useMemo<Scene[]>(() => {
    const rows = Array.isArray(studioData.scenes) ? studioData.scenes : [];
    return rows.map((entry, index) => {
      const row = entry as Record<string, unknown>;
      return {
        id: String(row.id || `scene_${index + 1}`),
        label: String(row.label || row.name || `Scene ${index + 1}`),
        desc: String(row.desc || row.description || "")
      };
    });
  }, [studioData.scenes]);

  useEffect(() => {
    if (activeSceneId && !scenes.some((scene) => scene.id === activeSceneId)) {
      setActiveSceneId("");
    }
  }, [activeSceneId, scenes]);

  const runOfShow = useMemo<Shot[]>(() => {
    const rows = Array.isArray(studioData.runOfShow) ? studioData.runOfShow : [];
    return rows.map((entry, index) => {
      const row = entry as Record<string, unknown>;
      return {
        id: String(row.id || `shot_${index + 1}`),
        label: String(row.label || row.name || ""),
        window: String(row.window || row.time || ""),
        scene: String(row.scene || "")
      };
    });
  }, [studioData.runOfShow]);

  const scriptCues = useMemo<string[]>(() => {
    if (!Array.isArray(studioData.scriptCues)) return [];
    return studioData.scriptCues.map((row, index) => String(row || `Cue ${index + 1}`));
  }, [studioData.scriptCues]);

  const commerceGoal: CommerceGoal = useMemo(() => {
    const row =
      studioData.commerceGoal && typeof studioData.commerceGoal === "object" && !Array.isArray(studioData.commerceGoal)
        ? (studioData.commerceGoal as Record<string, unknown>)
        : {};
    return {
      soldUnits: Number(row.soldUnits || 0) || 0,
      targetUnits: Number(row.targetUnits || 0) || 0,
      cartCount: Number(row.cartCount || 0) || 0,
      last5MinSales: Number(row.last5MinSales || 0) || 0
    };
  }, [studioData.commerceGoal]);

  const salesEvents = useMemo<SalesEvent[]>(() => {
    const rows = Array.isArray(studioData.salesEvents) ? studioData.salesEvents : [];
    return rows.map((entry, index) => {
      const row = entry as Record<string, unknown>;
      return {
        id: Number(row.id || index + 1),
        label: String(row.label || ""),
        time: String(row.time || "")
      };
    });
  }, [studioData.salesEvents]);

  const momentMarkers: MomentMarker[] = [];

  // Chat/QA mock
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatDraft, setChatDraft] = useState("");
  const [audienceTab, setAudienceTab] = useState<AudienceTab>("chat");

  const qaItems = useMemo<QAItem[]>(() => {
    const rows = Array.isArray(studioData.qaItems) ? studioData.qaItems : [];
    return rows.map((entry, index) => {
      const row = entry as Record<string, unknown>;
      return {
        id: Number(row.id || index + 1),
        question: String(row.question || ""),
        from: String(row.from || ""),
        status: String(row.status || "")
      };
    });
  }, [studioData.qaItems]);

  const viewersList = useMemo<Viewer[]>(() => {
    const rows = Array.isArray(studioData.viewersList) ? studioData.viewersList : [];
    return rows.map((entry, index) => {
      const row = entry as Record<string, unknown>;
      return {
        id: Number(row.id || index + 1),
        name: String(row.name || ""),
        tag: String(row.tag || "")
      };
    });
  }, [studioData.viewersList]);

  const aiPrompts = useMemo<string[]>(() => {
    if (!Array.isArray(studioData.aiPrompts)) return [];
    return studioData.aiPrompts.map((row) => String(row || ""));
  }, [studioData.aiPrompts]);

  // Mobile state
  const [mobilePanel, setMobilePanel] = useState<"products" | "chat">("chat");

  // Handlers
  const toggleLive = () => {
    setMode((prev) => {
      const next = prev === "lobby" ? "live" : "lobby";
      if (studioHydrated) {
        if (next === "live") {
          void creatorApi.startLiveStudio(studioId);
        } else {
          void creatorApi.endLiveStudio(studioId);
        }
      }
      return next;
    });
  };

  const handleOpenFlashConfig = () => setFlashConfigOpen(true);

  const handleStopFlashDealz = () => {
    setFlashDealzActive(false);
    setFlashDealzSeconds(0);
  };

  const handleApproveAttachment = (id: number) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
    // In real app, move to active
  };
  const handleRejectAttachment = (id: number) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleMarkMoment = () => {
    showToast("Moment marked for replay highlight 📌");
  };

  const handleInviteCoHost = () => {
    showToast("Invitation link copied to clipboard 🔗");
  };

  const handleAcceptCoHost = (name: string) => {
    setCoHosts(prev => prev.map(c =>
      c.name === name ? { ...c, status: "On-air 🔴" } : c
    ));
    showToast(`${name} is now on air 🔴`);
  };

  const handleRemoveCoHost = (name: string) => {
    setCoHosts(prev => prev.filter(c => c.name !== name));
    showToast(`${name} removed from studio`);
  };

  // Recording handlers with real MediaRecorder API
  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const audioUrl = URL.createObjectURL(audioBlob);
        const duration = recordingSecondsRef.current; // Read from ref to get actual value

        const newMsg: ChatMessage = {
          id: Date.now(),
          from: "You (Host)",
          body: `🎤 Voice message (${duration}s)`,
          time: "Now",
          audioUrl: audioUrl,
        };
        setChatMessages(prev => [...prev, newMsg]);
        showToast("Voice message sent!");

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      showToast("🎤 Recording... Speak now!");
    } catch {
      showToast("❌ Microphone access denied. Please allow microphone access.");
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // File attachment handler
  const handleAttachFile = () => {
    setAttachDialogOpen(true); // Open the dialog with file type options
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileUrl = URL.createObjectURL(file);
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    const newMsg: ChatMessage = {
      id: Date.now(),
      from: "You (Host)",
      body: isImage ? "📷 Shared a photo" : isVideo ? "🎥 Shared a video" : `📎 Shared ${file.name}`,
      time: "Now",
      attachmentUrl: fileUrl,
      attachmentType: isImage ? "image" : isVideo ? "video" : "file",
    };
    setChatMessages(prev => [...prev, newMsg]);
    showToast(`${isImage ? "Photo" : isVideo ? "Video" : "File"} shared on stream!`);

    // Reset input
    event.target.value = "";
    setAttachDialogOpen(false);
  };

  // Poll handlers
  const handleStartPoll = () => {
    if (!pollQuestion.trim()) {
      setPollQuestion("Do you like this product?");
    }
    setPollActive(true);
    setPollResults([0, 0]);
    showToast("📊 Poll started!");
  };

  const handleEndPoll = () => {
    setPollActive(false);
    showToast(`📊 Poll ended! Results: ${pollResults[0]} vs ${pollResults[1]}`);
  };

  // Giveaway handlers
  const handleStartGiveaway = () => {
    if (configuredGiveaways.length) {
      const anyAvailable = giveawayControlItems.some((g) => g.remaining > 0);
      if (!anyAvailable) {
        showToast("All giveaways are completed.");
        return;
      }
      if (!effectiveGiveawayId) {
        showToast("Select a giveaway prize to start.");
        return;
      }
      if (giveawayPrizeCompleted) {
        showToast("This giveaway is completed. Select another giveaway.");
        return;
      }
    }
    setGiveawayActive(true);
    setGiveawayEntries(0);
    showToast(`🎁 Giveaway started! Prize: ${giveawayPrizeLabel}. Viewers can enter now.`);
  };

  const handlePickWinner = () => {
    const activeGiveawayId = effectiveGiveawayId;
    const activePrizeLabel = giveawayPrizeLabel;
    const winnerIndex = viewersList.length > 0 ? Math.floor(Math.random() * viewersList.length) : -1;
    const winner = winnerIndex >= 0 ? viewersList[winnerIndex]?.name || "" : "";
    setGiveawayActive(false);
    showToast(`🎉 Winner: @${winner}! Congratulations!`);
    // Add system message
    setChatMessages(prev => [...prev, {
      id: Date.now(),
      from: "System",
      body: `🎉 Giveaway Winner: @${winner}! Prize: ${activePrizeLabel}`,
      time: "Now",
      system: true,
    }]);

    // Deduct remaining quantity for the active giveaway (UI only; no backend)
    if (configuredGiveaways.length && activeGiveawayId) {
      const activeGiveaway = configuredGiveaways.find((g) => g.id === activeGiveawayId);
      const totalQty = coercePositiveInt((activeGiveaway as any)?.quantity, 1);
      const currentRemaining =
        typeof giveawayRemainingById[activeGiveawayId] === "number" && Number.isFinite(giveawayRemainingById[activeGiveawayId])
          ? giveawayRemainingById[activeGiveawayId]
          : totalQty;
      const nextRemaining = Math.max(0, currentRemaining - 1);

      setGiveawayRemainingById((prev) => ({ ...prev, [activeGiveawayId]: nextRemaining }));

      if (nextRemaining <= 0) {
        // Auto-select the next available giveaway item (remaining > 0)
        const currentIdx = configuredGiveaways.findIndex((g) => g.id === activeGiveawayId);
        const scanOrder =
          currentIdx >= 0
            ? [...configuredGiveaways.slice(currentIdx + 1), ...configuredGiveaways.slice(0, currentIdx)]
            : configuredGiveaways;

        const nextAvailable = scanOrder.find((g) => {
          if (g.id === activeGiveawayId) return false;
          const total = coercePositiveInt((g as any)?.quantity, 1);
          const rem =
            typeof giveawayRemainingById[g.id] === "number" && Number.isFinite(giveawayRemainingById[g.id])
              ? giveawayRemainingById[g.id]
              : total;
          return rem > 0;
        })?.id;

        if (nextAvailable) {
          setSelectedGiveawayId(nextAvailable);
        } else {
          setSelectedGiveawayId("");
        }
      }
    }
  };

  // Pinned message handler
  const handlePinMessage = () => {
    if (chatDraft.trim()) {
      setPinnedMessage(chatDraft);
      setChatDraft("");
      showToast("📌 Message pinned to stream!");
    } else {
      showToast("Type a message to pin.");
    }
  };

  const handleUnpinMessage = () => {
    setPinnedMessage(null);
    showToast("Message unpinned");
  };

  // Note: handleAttachFile and handleFileChange are defined earlier with real file picker implementation

  const handleSendChat = () => {
    if (!chatDraft.trim()) return;
    const newMsg: ChatMessage = {
      id: Date.now(),
      from: "You (Host)",
      body: chatDraft,
      time: "Now",
    };
    setChatMessages((prev) => [...prev, newMsg]);
    setChatDraft("");
  };

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [viewerCount, setViewerCount] = useState(0);
  const [salesCount, setSalesCount] = useState(0);

  // Timer effect
  useEffect(() => {
    if (mode !== "live") {
      setElapsedSeconds(0);
      return;
    }

    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [mode]);

  // Recording timer effect
  useEffect(() => {
    if (!isRecording) {
      return;
    }

    const interval = setInterval(() => {
      setRecordingSeconds((prev) => {
        const newValue = prev + 1;
        recordingSecondsRef.current = newValue; // Keep ref in sync
        return newValue;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRecording]);

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const liveStats = {
    timer: mode === "live" ? formatTime(elapsedSeconds) : "–:–",
    viewers: viewerCount,
    sales: salesCount,
    connection: String(studioData.connection || "—"),
    bitrate: String(studioData.bitrate || "—"),
  };

  const typeLabel = mode === "live" ? "Live" : "Pre-live lobby";
  const studioTitle = String(studioData.title || studioData.sessionTitle || "Live Studio");
  const studioSupplier = String(studioData.supplierName || studioData.supplier || "");

  const rootClass =
    "min-h-screen w-full flex flex-col bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-900 dark:text-slate-50 transition-colors overflow-hidden h-[100dvh]";


  return (
    <div className={rootClass}>
      <PageHeader
        pageTitle="Live Studio"
        badge={
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-600 dark:text-slate-300">
              {studioSupplier ? `${studioTitle} · ${studioSupplier}` : studioTitle}
            </span>
            {/* Live stats */}
            <div className="hidden sm:flex items-center gap-2 text-xs mr-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-900 dark:bg-slate-900 text-slate-50 border border-slate-700 dark:border-slate-700 transition-colors">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>
                  {typeLabel} · {liveStats.timer}
                </span>
              </span>
              <TopStat label="Viewers" value={liveStats.viewers.toLocaleString()} />
              <TopStat label="Sales" value={liveStats.sales.toString()} />
              <TopStat label="Connection" value={liveStats.connection} />
              <TopStat label="Bitrate" value={liveStats.bitrate} />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setTipsOpen(true)}
                className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <span className="material-icons text-sm">help_outline</span>
                Studio tips
              </button>
            </div>
          </div>
        }
        className="border-b backdrop-blur-sm border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-slate-950/80 shadow-sm dark:shadow-[0_8px_30px_rgba(15,23,42,0.7)] transition-colors"
      />

      {/* Desktop / tablet layout */}
      <div className="hidden xl:flex flex-1 w-full flex-col overflow-hidden">
        <main className="flex-1 w-full p-4 sm:p-6 lg:p-8 pt-6 gap-6 overflow-hidden flex min-h-0">
          {/* Left column: products, co-hosts, attachments */}
          <section className="w-64 lg:w-72 xl:w-80 flex-shrink-0 flex flex-col gap-3 overflow-y-auto custom-scrollbar pb-28">
            <ProductPanel
              products={products}
              highlightedProductId={highlightedProductId}
              onHighlight={(id) => {
                setHighlightedProductId(id);
                if (id) showToast("Product highlighted on stream 🛍️");
                else showToast("Overlay removed");
              }}
              flashDealzActive={flashDealzActive}
              flashDealzSeconds={flashDealzSeconds}
              onConfigureFlash={handleOpenFlashConfig}
              onStopFlash={handleStopFlashDealz}
            />
            <CoHostPanel
              coHosts={coHosts}
              onInvite={handleInviteCoHost}
              onAccept={handleAcceptCoHost}
              onRemove={handleRemoveCoHost}
            />
            <AttachmentsPanel
              attachments={attachments}
              onApprove={handleApproveAttachment}
              onReject={handleRejectAttachment}
            />
          </section>

          {/* Center column: video + teleprompter + commerce HUD */}
          <section className="flex-1 flex flex-col gap-3 overflow-y-auto custom-scrollbar pb-28 min-h-0">
            <LiveVideoPanel
              mode={mode}
              micOn={micOn}
              camOn={camOn}
              screenShareOn={screenShareOn}
              activeSceneId={activeSceneId}
              scenes={scenes}
              setActiveSceneId={setActiveSceneId}
            />
            <TeleprompterPanel scriptCues={scriptCues} runOfShow={runOfShow} />
            <CommerceHudPanel
              commerceGoal={commerceGoal}
              salesEvents={salesEvents}
              momentMarkers={momentMarkers}
            />
          </section>

          {/* Right column: live audience & AI prompts */}
          <section className="w-72 lg:w-80 xl:w-96 flex-shrink-0 flex flex-col gap-3 min-h-0 overflow-y-auto custom-scrollbar pb-28">
            <ChatPanel
              activeTab={audienceTab}
              onTabChange={setAudienceTab}
              messages={chatMessages}
              qaItems={qaItems}
              viewers={viewersList}
              draft={chatDraft}
              onDraftChange={setChatDraft}
              onSend={handleSendChat}
              onAction={(action) => showToast(action)}
              isRecording={isRecording}
              recordingSeconds={recordingSeconds}
              onStartRecording={handleStartRecording}
              onStopRecording={handleStopRecording}
              pinnedMessage={pinnedMessage}
              onPinMessage={handlePinMessage}
              onUnpinMessage={handleUnpinMessage}
              pollActive={pollActive}
              pollQuestion={pollQuestion}
              pollResults={pollResults}
              onStartPoll={handleStartPoll}
              onEndPoll={handleEndPoll}
              giveawayActive={giveawayActive}
              giveawayEntries={giveawayEntries}
              giveawayPrizeLabel={giveawayPrizeLabel}
              giveawayPrizeImageUrl={giveawayPrizeImageUrl}
              giveawayItems={giveawayControlItems}
              giveawayPrizeOptions={giveawayPrizeOptions}
              selectedGiveawayId={effectiveGiveawayId}
              onSelectGiveawayId={(id) => setSelectedGiveawayId(id)}
              onStartGiveaway={handleStartGiveaway}
              onPickWinner={handlePickWinner}
              onAttachFile={handleAttachFile}
            />
            <AiPromptsPanel prompts={aiPrompts} />
          </section>
        </main>

        {/* Desktop bottom control bar */}
        <div className="flex-shrink-0 border-t border-slate-200 dark:border-slate-800">
          <StudioControlBar
            mode={mode}
            onToggleLive={toggleLive}
            micOn={micOn}
            onToggleMic={() => setMicOn((m) => !m)}
            camOn={camOn}
            onToggleCam={() => setCamOn((c) => !c)}
            screenShareOn={screenShareOn}
            onToggleScreenShare={() => setScreenShareOn((s) => !s)}
            activeSceneId={activeSceneId}
            scenes={scenes}
            setActiveSceneId={setActiveSceneId}
            onMarkMoment={handleMarkMoment}
            onToggleFilters={() => setFiltersOpen((v) => !v)}
            onOpenLanguagePanel={() => setLanguagePanelOpen(true)}
          />
        </div>
      </div>



      {/* Mobile studio */}
      <MobileStudio
        mode={mode}
        typeLabel={typeLabel}
        products={products}
        highlightedProductId={highlightedProductId}
        setHighlightedProductId={setHighlightedProductId}
        flashDealzActive={flashDealzActive}
        onOpenFlashConfig={handleOpenFlashConfig}
        onStopFlash={handleStopFlashDealz}
        chatMessages={chatMessages}
        chatDraft={chatDraft}
        setChatDraft={setChatDraft}
        onSendChat={handleSendChat}
        mobilePanel={mobilePanel}
        setMobilePanel={setMobilePanel}
        onToggleLive={toggleLive}
        onExit={handleExit}
        micOn={micOn}
        onToggleMic={() => setMicOn((m) => !m)}
        camOn={camOn}
        onToggleCam={() => setCamOn((c) => !c)}
        onMarkMoment={handleMarkMoment}
      />

      {/* Studio Tips Drawer */}
      {tipsOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-sm" onClick={() => setTipsOpen(false)}>
          <div
            className="w-full max-w-sm h-full bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col text-sm transition-colors animate-slide-in-right"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-semibold dark:font-bold">Studio Tips</h3>
              <button
                className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                onClick={() => setTipsOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-4 overflow-y-auto">
              <TipCard
                icon="💡"
                title="Lighting Matters"
                text="Position your main light source in front of you, slightly above eye level. Avoid backlighting."
              />
              <TipCard
                icon="🎤"
                title="Audio Clarity"
                text="Use a dedicated microphone if possible. Keep background noise to a minimum."
              />
              <TipCard
                icon="💬"
                title="Engage Early"
                text="Welcome viewers by name as they join. Mark key moments to create replay highlights."
              />
              <TipCard
                icon="🛍️"
                title="Flash Dealz"
                text="Use flash dealz sparingly to create urgency. Announce them 5 minutes in advance."
              />
            </div>
          </div>
        </div>
      )}

      {/* ... (existing overlays) */}

      {/* File Attachment Dialog */}
      {attachDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setAttachDialogOpen(false)}>
          <div
            className="w-full max-w-xs bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-4 text-sm transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold dark:font-bold text-slate-900 dark:text-slate-100 mb-3">Share on Stream</h3>
            <div className="space-y-2">
              <label className="w-full flex items-center gap-3 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                <span className="text-xl">📷</span>
                <span className="text-slate-900 dark:text-slate-100">Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
              <label className="w-full flex items-center gap-3 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                <span className="text-xl">🎥</span>
                <span className="text-slate-900 dark:text-slate-100">Video Clip</span>
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
              <label className="w-full flex items-center gap-3 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                <span className="text-xl">📄</span>
                <span className="text-slate-900 dark:text-slate-100">Document</span>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
              <label className="w-full flex items-center gap-3 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                <span className="text-xl">📁</span>
                <span className="text-slate-900 dark:text-slate-100">Any File</span>
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            </div>
            <button
              onClick={() => setAttachDialogOpen(false)}
              className="mt-3 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-center"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-20 inset-x-0 flex justify-center pointer-events-none z-[100]">
          <div className="pointer-events-auto bg-slate-900 text-white text-sm px-4 py-2 rounded-full shadow-lg animate-fade-in-up flex items-center gap-2">
            <span>{toast.message}</span>
          </div>
        </div>
      )}

    </div>
  );
}

/* Small helper for header stats */
function TopStat({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex flex-col items-start px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs transition-colors">
      <span className="text-tiny text-slate-600 dark:text-slate-400">{label}</span>
      <span className="text-sm font-semibold dark:font-bold text-slate-900 dark:text-slate-50">{value}</span>
    </span>
  );
}

/* LEFT COLUMN – Product, Co-host, Attachments */

type ProductPanelProps = {
  products: Product[];
  highlightedProductId: string;
  onHighlight: (id: string) => void;
  flashDealzActive: boolean;
  flashDealzSeconds: number;
  onConfigureFlash: () => void;
  onStopFlash: () => void;
};

function ProductPanel({
  products,
  highlightedProductId,
  onHighlight,
  flashDealzActive,
  flashDealzSeconds,
  onConfigureFlash,
  onStopFlash,
}: ProductPanelProps) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 flex flex-col gap-2 text-sm transition-colors">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-xs font-semibold dark:font-bold text-slate-900 dark:text-slate-50">Products on this live</h3>
        <span className="text-xs text-slate-600 dark:text-slate-400">{products.length} items</span>
      </div>
      <div className="space-y-1.5 max-h-52 overflow-y-auto">
        {products.map((p: Product) => {
          const active = p.id === highlightedProductId;
          return (
            <button
              key={p.id}
              className={
                "w-full text-left border rounded-xl px-2.5 py-1.5 flex flex-col gap-0.5 " +
                (active
                  ? "bg-[#f77f00]/10 dark:bg-[#f77f00]/10 border-[#f77f00] text-slate-900 dark:text-slate-50"
                  : "bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-200 hover:border-slate-400 dark:hover:border-slate-600 transition-colors")
              }
              onClick={() => onHighlight(p.id)}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold dark:font-bold truncate">{p.name}</span>
                <span className="text-xs text-emerald-400">{p.price}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                <span>{p.stock}</span>
                <span>{p.tag}</span>
              </div>
            </button>
          );
        })}
      </div>
      <div className="mt-1 border-t border-slate-200 dark:border-slate-800 pt-2 flex flex-col gap-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-700 dark:text-slate-300">Pinned product overlay</span>
          <span className="text-slate-600 dark:text-slate-400 text-tiny">
            {highlightedProductId ? "Active" : "None"}
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <button
            className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            onClick={() => onHighlight(highlightedProductId || "")}
          >
            Highlight now
          </button>
          <button
            className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-200 border border-slate-300 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            onClick={() => onHighlight("")}
          >
            Remove overlay
          </button>
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="flex flex-col text-xs text-slate-700 dark:text-slate-300">
            <span>Flash deal</span>
            <span className="text-tiny text-slate-600 dark:text-slate-300">
              Limited-time discount overlay with timer.
            </span>
          </div>
          <div className="flex items-center gap-1">
            {flashDealzActive && (
              <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-tiny">
                {flashDealzSeconds}s left
              </span>
            )}
            <button
              className={
                "px-2.5 py-1 rounded-full text-xs text-white " +
                (flashDealzActive
                  ? "bg-red-500 hover:bg-red-600"
                  : "bg-[#f77f00] hover:bg-[#e26f00]")
              }
              onClick={flashDealzActive ? onStopFlash : onConfigureFlash}
            >
              {flashDealzActive ? "Stop flash deal" : "Start flash deal"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CoHostPanel({
  coHosts,
  onInvite,
  onAccept,
  onRemove,
}: {
  coHosts: CoHost[];
  onInvite: () => void;
  onAccept: (name: string) => void;
  onRemove: (name: string) => void;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 flex flex-col gap-2 text-sm transition-colors">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold dark:font-bold text-slate-900 dark:text-slate-50">Co-host & crew</h3>
        <button className="text-xs text-[#f77f00] hover:underline" onClick={onInvite}>
          Invite
        </button>
      </div>
      <div className="space-y-1 max-h-32 overflow-y-auto">
        {coHosts.map((c) => (
          <div key={c.id} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-xs text-slate-900 dark:text-slate-100">
                {c.name
                  .split(" ")
                  .map((w: string) => w[0])
                  .join("")}
              </span>
              <div className="flex flex-col">
                <span className="text-slate-900 dark:text-slate-100">{c.name}</span>
                <span className="text-slate-600 dark:text-slate-300">{c.status}</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                className="px-2 py-0.5 rounded-full border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-tiny hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                onClick={() => onAccept(c.name)}
              >
                Accept
              </button>
              <button
                className="px-2 py-0.5 rounded-full border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-tiny hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                onClick={() => onRemove(c.name)}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AttachmentsPanel({
  attachments,
  onApprove,
  onReject,
}: {
  attachments: Attachment[];
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
}) {
  const pending = attachments.filter((a) => a.status === "Pending");
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 flex flex-col gap-2 text-sm transition-colors">
      <h3 className="text-xs font-semibold dark:font-bold text-slate-900 dark:text-slate-50">Attachments queue</h3>
      <p className="text-xs text-slate-600 dark:text-slate-300">
        Viewers can send images or questions. Nothing appears on screen until you approve.
      </p>
      <div className="space-y-1 max-h-28 overflow-y-auto">
        {pending.map((a) => (
          <div
            key={a.id}
            className="flex items-center justify-between text-xs border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 bg-slate-50 dark:bg-slate-950 transition-colors"
          >
            <div className="flex flex-col">
              <span className="text-slate-900 dark:text-slate-100">{a.label}</span>
              <span className="text-slate-600 dark:text-slate-300">
                {a.type.toUpperCase()} · {a.from}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-tiny"
                onClick={() => onApprove(a.id)}
              >
                Approve
              </button>
              <button
                className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200 text-tiny hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                onClick={() => onReject(a.id)}
              >
                Reject
              </button>
            </div>
          </div>
        ))}
        {pending.length === 0 && (
          <p className="text-xs text-slate-500 dark:text-slate-300">No pending attachments.</p>
        )}
      </div>
    </div>
  );
}

/* CENTER – Live video + lobby, teleprompter, commerce */

type LiveVideoPanelProps = {
  mode: Mode;
  micOn: boolean;
  camOn: boolean;
  screenShareOn: boolean;
  activeSceneId: string;
  scenes: Scene[];
  setActiveSceneId: (id: string) => void;
};

function LiveVideoPanel({
  mode,
  micOn,
  camOn,
  screenShareOn,
  activeSceneId,
  scenes,
  setActiveSceneId,
}: LiveVideoPanelProps) {
  const activeScene = scenes.find((s: Scene) => s.id === activeSceneId) || null;

  if (mode === "lobby") {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-3 md:p-4 flex flex-col gap-3 h-full transition-colors">
        <LobbyPanel
          micOn={micOn}
          camOn={camOn}
          screenShareOn={screenShareOn}
          scenes={scenes}
          activeSceneId={activeSceneId}
          setActiveSceneId={setActiveSceneId}
        />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-3 md:p-4 flex flex-col gap-3 h-full transition-colors">
      <div className="relative flex-1 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 flex items-center justify-center transition-colors">
        <span className="text-sm text-slate-600 dark:text-slate-400">
          Live video preview · Scene:{" "}
          <span className="font-medium text-slate-900 dark:text-slate-100">{activeScene?.label || "—"}</span>
        </span>
        {screenShareOn && (
          <span className="absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full bg-slate-900 dark:bg-slate-900 border border-slate-700 dark:border-slate-700 text-slate-100 transition-colors">
            Screen sharing
          </span>
        )}
        {!camOn && (
          <span className="absolute bottom-2 left-2 text-xs px-2 py-0.5 rounded-full bg-red-500 text-white">
            Camera off
          </span>
        )}
        <div className="absolute top-2 right-2 flex flex-col gap-1 text-xs items-end">
          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 text-emerald-200 border border-emerald-400/60">
            <span className="material-icons text-base">graphic_eq</span>
            <span>AI Audio: ON (Multi)</span>
          </div>
          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 text-sky-100 border border-sky-400/60">
            <span className="material-icons text-base">subtitles</span>
            <span>Captions: ON</span>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
          <span>Scene presets</span>
          <span className="text-slate-900 dark:text-slate-100">Active: {activeScene.label}</span>
        </div>
        <div className="flex gap-1 overflow-x-auto pb-1">
          {scenes.map((s: Scene) => (
            <button
              key={s.id}
              className={
                "px-2.5 py-1 rounded-xl border text-xs min-w-[120px] text-left transition-colors " +
                (s.id === activeSceneId
                  ? "bg-[#f77f00] border-[#f77f00] text-white"
                  : "bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900")
              }
              onClick={() => setActiveSceneId(s.id)}
            >
              <span className="font-semibold dark:font-bold">{s.label}</span>
              <span className="block text-tiny text-slate-600 dark:text-slate-400">{s.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

type LobbyPanelProps = {
  micOn: boolean;
  camOn: boolean;
  screenShareOn: boolean;
  scenes: Scene[];
  activeSceneId: string;
  setActiveSceneId: (id: string) => void;
};

function LobbyPanel({
  micOn,
  camOn,
  screenShareOn,
  scenes,
  activeSceneId,
  setActiveSceneId,
}: LobbyPanelProps) {
  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex-1 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 flex flex-col items-center justify-center gap-2 transition-colors">
        <span className="text-sm text-slate-700 dark:text-slate-300 mb-1">
          Pre-live lobby · Device & scene check
        </span>
        <div className="flex gap-2 text-xs text-slate-900 dark:text-slate-200">
          <LobbyToggle label="Camera" on={camOn} />
          <LobbyToggle label="Microphone" on={micOn} />
          <LobbyToggle label="Screen share" on={screenShareOn} disabled />
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-300 mt-2 max-w-xs text-center">
          Check your framing, lighting and audio levels. You’re not live yet – only you and crew
          can see this.
        </p>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs text-slate-600 dark:text-slate-400">Scene presets</span>
        <div className="flex gap-1 overflow-x-auto pb-1">
          {scenes.map((s: Scene) => (
            <button
              key={s.id}
              className={
                "px-2.5 py-1 rounded-xl border text-xs min-w-[120px] text-left transition-colors " +
                (s.id === activeSceneId
                  ? "bg-[#f77f00] border-[#f77f00] text-white"
                  : "bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900")
              }
              onClick={() => setActiveSceneId(s.id)}
            >
              <span className="font-semibold dark:font-bold">{s.label}</span>
              <span className="block text-tiny text-slate-600 dark:text-slate-400">{s.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function LobbyToggle({
  label,
  on,
  disabled,
}: {
  label: string;
  on: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      className={
        "px-2.5 py-1 rounded-full border text-xs " +
        (disabled
          ? "border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-300 cursor-not-allowed"
          : on
            ? "bg-emerald-500 border-emerald-500 text-white"
            : "bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300")
      }
      disabled={disabled}
    >
      {label}: {on ? "On" : "Off"}
    </button>
  );
}

type TeleprompterPanelProps = {
  scriptCues: string[];
  runOfShow: Shot[];
};

function TeleprompterPanel({ scriptCues, runOfShow }: TeleprompterPanelProps) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 flex flex-col gap-2 text-sm max-h-48 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">📜</span>
          <h3 className="text-xs font-semibold dark:font-bold text-slate-900 dark:text-slate-50">Script teleprompter</h3>
        </div>
        <span className="text-xs text-slate-600 dark:text-slate-300">Dynamic cues</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-2">
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {scriptCues.map((cue: string, idx: number) => (
            <div
              key={idx}
              className={
                "text-xs px-2 py-1 rounded-lg " +
                (idx === 1
                  ? "bg-[#f77f00]/20 dark:bg-[#f77f00]/20 text-slate-900 dark:text-slate-50"
                  : "bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-200")
              }
            >
              {idx === 1 && (
                <span className="mr-1 text-tiny uppercase tracking-wide text-[#f77f00]">
                  Up next:
                </span>
              )}
              {cue}
            </div>
          ))}
        </div>
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-2 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-200 max-h-32 overflow-y-auto transition-colors">
          <div className="flex items-center justify-between mb-1">
            <span className="text-slate-900 dark:text-slate-200">Run-of-show</span>
            <span className="text-tiny text-slate-600 dark:text-slate-300">Shot list</span>
          </div>
          <ul className="space-y-1">
            {runOfShow.map((shot: Shot) => (
              <li
                key={shot.id}
                className="flex items-center justify-between gap-2"
              >
                <div className="flex flex-col">
                  <span className="font-medium text-slate-900 dark:text-slate-200">{shot.label}</span>
                  <span className="text-slate-600 dark:text-slate-300">Scene: {shot.scene}</span>
                </div>
                <span className="text-slate-600 dark:text-slate-400 text-tiny">{shot.window}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

type CommerceHudPanelProps = {
  commerceGoal: CommerceGoal;
  salesEvents: SalesEvent[];
  momentMarkers: MomentMarker[];
};

function CommerceHudPanel({ commerceGoal, salesEvents, momentMarkers }: CommerceHudPanelProps) {
  const progress = Math.min(
    commerceGoal.soldUnits / (commerceGoal.targetUnits || 1),
    1
  );

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 flex flex-col gap-2 text-sm transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">💰</span>
          <div>
            <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-50">Commerce HUD</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Live sales, goal tracking and marked moments.
            </p>
          </div>
        </div>
        <span className="text-xs text-slate-600 dark:text-slate-400">
          Goal: {commerceGoal.targetUnits} units
        </span>
      </div>
      <div className="flex items-center justify-between gap-3 text-xs">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-slate-600 dark:text-slate-400">Progress</span>
            <span className="text-slate-900 dark:text-slate-100">
              {commerceGoal.soldUnits}/{commerceGoal.targetUnits} sold
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${progress * 100}%`, backgroundColor: EV_ORANGE }}
            />
          </div>
        </div>
        <div className="flex flex-col items-end text-xs">
          <span className="text-slate-600 dark:text-slate-400">In carts</span>
          <span className="text-slate-900 dark:text-slate-100 font-semibold">
            {commerceGoal.cartCount}
          </span>
          <span className="text-slate-600 dark:text-slate-300">
            {commerceGoal.last5MinSales} sales · 5 min
          </span>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-2 bg-slate-50 dark:bg-slate-950 transition-colors">
          <h4 className="text-xs font-semibold mb-1 text-slate-900 dark:text-slate-200">
            Live sales feed
          </h4>
          <ul className="space-y-1 max-h-24 overflow-y-auto text-xs text-slate-900 dark:text-slate-200">
            {salesEvents.map((e: SalesEvent) => (
              <li
                key={e.id}
                className="flex items-center justify-between gap-2"
              >
                <span>{e.label}</span>
                <span className="text-slate-600 dark:text-slate-300 text-tiny">{e.time}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-2 bg-slate-50 dark:bg-slate-950 transition-colors">
          <h4 className="text-xs font-semibold mb-1 text-slate-900 dark:text-slate-200">
            Moments for replay
          </h4>
          {momentMarkers.length === 0 ? (
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Use "Mark moment" to flag highlights for clipping.
            </p>
          ) : (
            <ul className="space-y-1 max-h-24 overflow-y-auto text-xs text-slate-900 dark:text-slate-200">
              {momentMarkers.map((m: MomentMarker) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between gap-2"
                >
                  <span>{m.label}</span>
                  <span className="text-slate-600 dark:text-slate-300 text-tiny">{m.time}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

/* RIGHT – Live audience & chat (segmented) */

function ChatPanel({
  activeTab,
  onTabChange,
  messages,
  qaItems,
  viewers,
  draft,
  onDraftChange,
  onSend,
  onAction,
  // New props for enhanced functionality
  isRecording,
  recordingSeconds,
  onStartRecording,
  onStopRecording,
  pinnedMessage,
  onPinMessage,
  onUnpinMessage,
  pollActive,
  pollQuestion,
  pollResults,
  onStartPoll,
  onEndPoll,
  giveawayActive,
  giveawayEntries,
  giveawayPrizeLabel,
  giveawayPrizeImageUrl,
  giveawayItems,
  giveawayPrizeOptions,
  selectedGiveawayId,
  onSelectGiveawayId,
  onStartGiveaway,
  onPickWinner,
  onAttachFile,
}: {
  activeTab: AudienceTab;
  onTabChange: (tab: AudienceTab) => void;
  messages: ChatMessage[];
  qaItems: QAItem[];
  viewers: Viewer[];
  draft: string;
  onDraftChange: (v: string) => void;
  onSend: () => void;
  onAction: (action: string) => void;
  isRecording?: boolean;
  recordingSeconds?: number;
  onStartRecording?: () => void;
  onStopRecording?: () => void;
  pinnedMessage?: string | null;
  onPinMessage?: () => void;
  onUnpinMessage?: () => void;
  pollActive?: boolean;
  pollQuestion?: string;
  pollResults?: number[];
  onStartPoll?: () => void;
  onEndPoll?: () => void;
  giveawayActive?: boolean;
  giveawayEntries?: number;
  giveawayPrizeLabel?: string;
  giveawayPrizeImageUrl?: string;
  giveawayItems?: Array<{ id: string; label: string; totalQty: number; remaining: number; imageUrl?: string }>;
  giveawayPrizeOptions?: Array<{ id: string; label: string }>;
  selectedGiveawayId?: string;
  onSelectGiveawayId?: (id: string) => void;
  onStartGiveaway?: () => void;
  onPickWinner?: () => void;
  onAttachFile?: () => void;
}) {
  const handleMicClick = () => {
    if (isRecording && onStopRecording) {
      onStopRecording();
    } else if (onStartRecording) {
      onStartRecording();
    } else {
      onAction("🎤 Recording feature ready");
    }
  };

  const handleAttachClick = () => {
    if (onAttachFile) {
      onAttachFile();
    } else {
      onAction("📎 File picker opened");
    }
  };

  const uiGiveawayItems: Array<{ id: string; label: string; totalQty: number; remaining: number; imageUrl?: string }> =
    giveawayItems && giveawayItems.length
      ? giveawayItems
      : giveawayPrizeOptions && giveawayPrizeOptions.length
        ? giveawayPrizeOptions.map((g) => ({ id: g.id, label: g.label, totalQty: 1, remaining: 1 }))
        : [];

  const selectedGiveawayMeta = selectedGiveawayId
    ? uiGiveawayItems.find((g) => g.id === selectedGiveawayId)
    : undefined;
  const selectedGiveawayCompleted = !!selectedGiveawayMeta && selectedGiveawayMeta.remaining <= 0;
  const availableGiveawayCount = uiGiveawayItems.filter((g) => g.remaining > 0).length;
  const anyAvailableGiveaway = availableGiveawayCount > 0;
  const isGiveawayActive = !!giveawayActive;
  const disableGiveawayButton =
    !isGiveawayActive && uiGiveawayItems.length > 0 && (!selectedGiveawayId || selectedGiveawayCompleted || !anyAvailableGiveaway);

  const renderBody = () => {
    if (activeTab === "qa") {
      return (
        <div className="space-y-2">
          {qaItems.map((q) => (
            <div
              key={q.id}
              className="rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-semibold truncate text-sm text-slate-900 dark:text-slate-100">
                  {q.question}
                </span>
                <span className="text-xs text-slate-600 dark:text-slate-300 truncate">
                  {q.from}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span
                  className={
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full " +
                    (q.status === "pinned"
                      ? "bg-emerald-100/10 dark:bg-emerald-100/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/50"
                      : "bg-slate-200 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700")
                  }
                >
                  <span className="material-icons text-lg">
                    {q.status === "pinned" ? "push_pin" : "help_outline"}
                  </span>
                  {q.status === "pinned" ? "Pinned" : "Waiting"}
                </span>
                <button
                  className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                  onClick={() => onAction(`Answered ${q.from} live!`)}
                >
                  Answer live
                </button>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (activeTab === "viewers") {
      return (
        <div className="space-y-1.5">
          {viewers.map((v) => (
            <div
              key={v.id}
              className="flex items-center justify-between gap-3 px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-7 w-7 rounded-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {v.name
                    .split(" ")
                    .map((p: string) => p[0])
                    .join("")}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="truncate text-sm text-slate-900 dark:text-slate-100">
                    {v.name}
                  </span>
                  {v.tag && (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400">{v.tag}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs">
                <button
                  className="px-2.5 py-1 rounded-full border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  onClick={() => onAction(`Muted ${v.name}`)}
                >
                  Mute
                </button>
                <button
                  className="px-2.5 py-1 rounded-full border border-rose-300 dark:border-rose-500/70 text-rose-600 dark:text-rose-300 bg-rose-50 dark:bg-rose-900/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors"
                  onClick={() => onAction(`Banned ${v.name}`)}
                >
                  Ban
                </button>
              </div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-1.5">
        {messages.map((m) => {
          const hasAudio = !!m.audioUrl;
          const hasAttachment = !!m.attachmentUrl;

          return (
            <div key={m.id} className="text-xs">
              <span
                className={
                  "font-semibold " +
                  (m.system ? "text-slate-500 dark:text-slate-400" : "text-slate-900 dark:text-slate-100")
                }
              >
                {m.system ? "System" : m.from}
              </span>
              <span className="text-slate-600 dark:text-slate-300 ml-1">· {m.time}</span>

              {/* Voice message with real audio player */}
              {hasAudio && (
                <div className="mt-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20">
                  <div className="flex items-center gap-2 w-full">
                    <span className="text-lg">🎤</span>
                    <audio controls className="h-8 flex-1" style={{ maxWidth: "200px" }}>
                      <source src={m.audioUrl} type="audio/webm" />
                      Your browser does not support audio playback.
                    </audio>
                    <span className="text-xs text-slate-600 dark:text-slate-400">
                      {m.body.match(/\d+/)?.[0] || "0"}s
                    </span>
                  </div>
                </div>
              )}

              {/* Image attachment */}
              {hasAttachment && m.attachmentType === "image" && (
                <div className="mt-1 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                  <img
                    src={m.attachmentUrl}
                    alt="Shared photo"
                    className="max-w-full max-h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => window.open(m.attachmentUrl, "_blank")}
                  />
                </div>
              )}

              {/* Video attachment */}
              {hasAttachment && m.attachmentType === "video" && (
                <div className="mt-1 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                  <video
                    controls
                    className="max-w-full max-h-48"
                  >
                    <source src={m.attachmentUrl} />
                    Your browser does not support video playback.
                  </video>
                </div>
              )}

              {/* File attachment */}
              {hasAttachment && m.attachmentType === "file" && (
                <div className="mt-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-lg">📎</span>
                  <a
                    href={m.attachmentUrl}
                    download
                    className="text-blue-500 hover:underline flex-1 truncate"
                  >
                    {m.body}
                  </a>
                </div>
              )}

              {/* Regular text message */}
              {!hasAudio && !hasAttachment && (
                <p className="text-slate-800 dark:text-slate-200 whitespace-pre-line">{m.body}</p>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 flex flex-col flex-1 min-h-0 overflow-hidden transition-colors">
      <div className="mb-2 flex-shrink-0">
        <h3 className="text-xs font-semibold mb-1 text-slate-900 dark:text-slate-50">Live audience &amp; chat</h3>
        <div className="inline-flex rounded-full bg-slate-100 dark:bg-slate-800 p-0.5 text-xs transition-colors">
          <button
            className={
              "px-3 py-1 rounded-full " +
              (activeTab === "chat"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm"
                : "bg-transparent text-slate-500 dark:text-slate-300")
            }
            onClick={() => onTabChange("chat")}
          >
            Chat
          </button>
          <button
            className={
              "px-3 py-1 rounded-full " +
              (activeTab === "qa"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm"
                : "bg-transparent text-slate-500 dark:text-slate-300")
            }
            onClick={() => onTabChange("qa")}
          >
            Q&amp;A
          </button>
          <button
            className={
              "px-3 py-1 rounded-full " +
              (activeTab === "viewers"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm"
                : "bg-transparent text-slate-500 dark:text-slate-300")
            }
            onClick={() => onTabChange("viewers")}
          >
            Viewers
          </button>
        </div>
      </div>

      {/* Pinned Message Banner */}
      {pinnedMessage && (
        <div className="flex-shrink-0 mb-2 px-3 py-2 rounded-xl bg-[#f77f00]/10 border border-[#f77f00]/30 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-lg">📌</span>
            <span className="text-slate-900 dark:text-slate-100 font-medium">{pinnedMessage}</span>
          </div>
          {onUnpinMessage && (
            <button
              onClick={onUnpinMessage}
              className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            >
              Unpin
            </button>
          )}
        </div>
      )}

      {/* Active Poll Banner */}
      {pollActive && (
        <div className="flex-shrink-0 mb-2 px-3 py-2 rounded-xl bg-purple-500/10 border border-purple-500/30">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-lg">📊</span>
              <span className="text-slate-900 dark:text-slate-100 font-semibold">Live Poll</span>
            </div>
            {onEndPoll && (
              <button
                onClick={onEndPoll}
                className="px-2 py-0.5 rounded-full bg-purple-500 text-white text-xs hover:bg-purple-600"
              >
                End Poll
              </button>
            )}
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-300 mb-2">{pollQuestion || "Do you like this product?"}</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-4 overflow-hidden">
                <div className="bg-emerald-500 h-full transition-all" style={{ width: `${Math.min(100, ((pollResults?.[0] || 0) / Math.max(1, (pollResults?.[0] || 0) + (pollResults?.[1] || 0))) * 100)}%` }} />
              </div>
              <span className="text-slate-900 dark:text-slate-100">Yes: {pollResults?.[0] || 0}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-4 overflow-hidden">
                <div className="bg-rose-500 h-full transition-all" style={{ width: `${Math.min(100, ((pollResults?.[1] || 0) / Math.max(1, (pollResults?.[0] || 0) + (pollResults?.[1] || 0))) * 100)}%` }} />
              </div>
              <span className="text-slate-900 dark:text-slate-100">No: {pollResults?.[1] || 0}</span>
            </div>
          </div>
        </div>
      )}

      {/* Active Giveaway Banner */}
      {giveawayActive && (
        <div className="flex-shrink-0 mb-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs min-w-0">
              <span className="text-lg animate-bounce flex-shrink-0">🎁</span>
              {giveawayPrizeImageUrl ? (
                <img
                  src={giveawayPrizeImageUrl}
                  alt=""
                  className="h-8 w-8 rounded-lg object-cover border border-amber-500/20 flex-shrink-0"
                />
              ) : null}
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-slate-900 dark:text-slate-100 font-semibold">Giveaway Active!</span>
                  <span className="text-amber-600 dark:text-amber-400">{giveawayEntries || 0} entries</span>
                  {selectedGiveawayMeta && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-tiny">
                      {selectedGiveawayMeta.remaining} remaining
                    </span>
                  )}
                </div>
                {giveawayPrizeLabel && (
                  <div className="text-xs text-slate-700 dark:text-slate-300 truncate max-w-[240px]">
                    Prize: {giveawayPrizeLabel}
                  </div>
                )}
              </div>
            </div>
            {onPickWinner && (
              <button
                onClick={onPickWinner}
                className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-xs hover:bg-amber-600"
              >
                Pick Winner 🎉
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 bg-slate-50 dark:bg-slate-950 overflow-y-auto transition-colors mb-2">
        {renderBody()}
      </div>

      <div className="flex-shrink-0 space-y-2 pt-2">
        <div className="flex items-center gap-1 text-xs">
          <button
            onClick={handleMicClick}
            className={
              "rounded-full border flex items-center justify-center cursor-pointer transition-all " +
              (isRecording
                ? "bg-red-500 border-red-500 text-white animate-pulse px-2 py-1 gap-1"
                : "h-7 w-7 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800")
            }
            title={isRecording ? "Stop recording" : "Record voice message"}
            type="button"
          >
            <span className="text-sm">{isRecording ? "⏹️" : "🎤"}</span>
            {isRecording && (
              <span className="text-xs font-semibold">{recordingSeconds || 0}s</span>
            )}
          </button>
          <button
            onClick={handleAttachClick}
            className="h-7 w-7 rounded-full border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 cursor-pointer transition-colors"
            title="Attach file"
            type="button"
          >
            <span className="text-sm">📎</span>
          </button>
          <input
            className="flex-1 border border-slate-300 dark:border-slate-700 rounded-full px-2 py-1 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none placeholder:text-slate-500 dark:placeholder:text-slate-400 transition-colors"
            placeholder="Type a reply or pin a highlight…"
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
          />
          <button
            className="px-2.5 py-1 rounded-full text-xs font-semibold text-white"
            style={{ backgroundColor: EV_ORANGE }}
            onClick={onSend}
          >
            Send
          </button>
        </div>

        {/* Giveaway selection (configured in Live Builder) */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2 transition-colors">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎁</span>
              <span className="text-xs font-semibold dark:font-bold text-slate-900 dark:text-slate-100">Giveaways</span>
            </div>
            {uiGiveawayItems.length > 0 && (
              <span
                className={
                  "px-2 py-0.5 rounded-full border text-tiny " +
                  (anyAvailableGiveaway
                    ? "bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                    : "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300")
                }
              >
                {anyAvailableGiveaway ? `${availableGiveawayCount} available` : "All completed"}
              </span>
            )}
          </div>

          {uiGiveawayItems.length === 0 ? (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">
              No giveaways configured in Live Builder.
            </p>
          ) : (
            <div className="mt-2 space-y-1 max-h-28 overflow-y-auto">
              {uiGiveawayItems.map((g, idx) => {
                const isSelected = !!selectedGiveawayId && g.id === selectedGiveawayId;
                const isCompleted = g.remaining <= 0;
                const disabled = !onSelectGiveawayId || !!giveawayActive || isCompleted;

                return (
                  <label
                    key={g.id}
                    className={
                      "w-full flex items-center gap-2 rounded-xl border px-2 py-1.5 transition-colors " +
                      (isSelected
                        ? "bg-[#f77f00]/10 dark:bg-[#f77f00]/10 border-[#f77f00]"
                        : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700") +
                      (disabled ? " opacity-60 cursor-not-allowed" : " cursor-pointer")
                    }
                    title={
                      isCompleted
                        ? "Completed"
                        : giveawayActive
                          ? "Prize switching is disabled while giveaway is active"
                          : "Select as active giveaway"
                    }
                  >
                    <input
                      type="radio"
                      name="activeGiveawayPrize"
                      className="h-3.5 w-3.5"
                      checked={isSelected}
                      disabled={disabled}
                      onChange={() => {
                        if (!disabled && onSelectGiveawayId) onSelectGiveawayId(g.id);
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold dark:font-bold text-slate-900 dark:text-slate-100 truncate">
                          {g.label || `Giveaway ${idx + 1}`}
                        </span>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-tiny">
                            Total: {g.totalQty}
                          </span>
                          {isCompleted ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-tiny">
                              Completed
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-tiny">
                              {g.remaining} Remaining
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-1 text-xs">
          <button
            className={
              "px-2.5 py-1 rounded-full border transition-colors " +
              (pollActive
                ? "bg-purple-500 border-purple-500 text-white"
                : "bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900")
            }
            onClick={() => pollActive ? (onEndPoll && onEndPoll()) : (onStartPoll && onStartPoll())}
          >
            {pollActive ? "End Poll" : "Poll"}
          </button>
          <button
            className={
              "px-2.5 py-1 rounded-full border transition-colors " +
              (giveawayActive
                ? "bg-amber-500 border-amber-500 text-white"
                : disableGiveawayButton
                  ? "bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 opacity-70 cursor-not-allowed"
                  : "bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900")
            }
            onClick={() => giveawayActive ? (onPickWinner && onPickWinner()) : (onStartGiveaway && onStartGiveaway())}
            disabled={disableGiveawayButton}
          >
            {giveawayActive ? "Pick Winner" : "Giveaway"}
          </button>
          <button
            className={
              "px-2.5 py-1 rounded-full border transition-colors " +
              (pinnedMessage
                ? "bg-[#f77f00] border-[#f77f00] text-white"
                : "bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900")
            }
            onClick={() => pinnedMessage ? (onUnpinMessage && onUnpinMessage()) : (onPinMessage && onPinMessage())}
          >
            {pinnedMessage ? "Unpin" : "Pin message"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AiPromptsPanel({ prompts }: { prompts: string[] }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 flex flex-col gap-2 text-sm transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">💡</span>
          <h3 className="text-xs font-semibold dark:font-bold text-slate-900 dark:text-slate-50">Live AI prompts</h3>
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-300">Real-time hints</span>
      </div>
      <ul className="space-y-1 max-h-40 overflow-y-auto">
        {prompts.map((p, idx) => (
          <li
            key={idx}
            className="border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-200 transition-colors"
          >
            {p}
          </li>
        ))}
      </ul>
      <div className="mt-1 text-xs text-slate-500 dark:text-slate-300">
        <span className="font-semibold text-slate-700 dark:text-slate-300 mr-1">Sentiment:</span>
        <span>
          Viewers are most engaged during visuals and pricing moments. Revisit shipping and
          bundles if questions keep repeating.
        </span>
      </div>
    </div>
  );
}

/* Desktop bottom bar – includes Language & AI audio button */

function StudioControlBar({
  mode,
  onToggleLive,
  micOn,
  onToggleMic,
  camOn,
  onToggleCam,
  screenShareOn,
  onToggleScreenShare,
  activeSceneId,
  scenes,
  setActiveSceneId,
  onMarkMoment,
  onToggleFilters,
  onOpenLanguagePanel,
}: {
  mode: Mode;
  onToggleLive: () => void;
  micOn: boolean;
  onToggleMic: () => void;
  camOn: boolean;
  onToggleCam: () => void;
  screenShareOn: boolean;
  onToggleScreenShare: () => void;
  activeSceneId: string;
  scenes: Scene[];
  setActiveSceneId: (id: string) => void;
  onMarkMoment: () => void;
  onToggleFilters: () => void;
  onOpenLanguagePanel: () => void;
}) {
  return (
    <div className="hidden xl:flex fixed bottom-0 left-80 right-0 z-40 items-center justify-between px-3 md:px-6 py-2 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm text-sm transition-colors border-t border-slate-200 dark:border-slate-800">
      <div className="flex items-center gap-2">
        <button
          className={
            "px-4 py-1.5 rounded-full text-sm font-semibold text-white " +
            (mode === "live" ? "bg-red-600 hover:bg-red-700" : "bg-[#f77f00] hover:bg-[#e26f00]")
          }
          onClick={onToggleLive}
        >
          {mode === "live" ? "End live" : "Go live"}
        </button>
        <button
          className={
            "px-3 py-1.5 rounded-full border text-xs transition-colors " +
            (micOn
              ? "bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100"
              : "bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-500 dark:text-slate-400")
          }
          onClick={onToggleMic}
        >
          {micOn ? "Mic on" : "Mic off"}
        </button>
        <button
          className={
            "px-3 py-1.5 rounded-full border text-xs transition-colors " +
            (camOn
              ? "bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100"
              : "bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-500 dark:text-slate-400")
          }
          onClick={onToggleCam}
        >
          {camOn ? "Cam on" : "Cam off"}
        </button>
        <button
          className={
            "px-3 py-1.5 rounded-full border text-xs transition-colors " +
            (screenShareOn
              ? "bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100"
              : "bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-500 dark:text-slate-400")
          }
          onClick={onToggleScreenShare}
        >
          Screen share
        </button>
        <button
          className="px-3 py-1.5 rounded-full border border-slate-300 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
          onClick={onMarkMoment}
        >
          Mark moment
        </button>
        <button
          className="px-3 py-1.5 rounded-full border border-slate-300 dark:border-slate-600 text-xs text-slate-700 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors inline-flex items-center gap-1.5"
          onClick={onToggleFilters}
        >
          <span className="material-icons text-base">auto_awesome</span>
          AR Filters
        </button>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <button
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
          onClick={onOpenLanguagePanel}
        >
          <span className="material-icons text-base">translate</span>
          Language &amp; AI audio
        </button>
        <span className="text-slate-600 dark:text-slate-400">Scene:</span>
        <select
          className="border border-slate-300 dark:border-slate-700 rounded-full px-2 py-0.5 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors"
          value={activeSceneId}
          onChange={(e) => setActiveSceneId(e.target.value)}
        >
          {scenes.map((s: Scene) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

/* AR Filters tray (desktop) */

export function FiltersTray({
  activeId,
  onSelect,
}: {
  activeId: number | null;
  onSelect: (id: number, label: string) => void;
}) {
  const categories = ["Beauty", "Fun", "Background", "Brand"];
  const filters = [
    { id: 1, label: "Soft Glam" },
    { id: 2, label: "Studio Glow" },
    { id: 3, label: "Neon Night" },
    { id: 4, label: "Clean Backdrop" },
    { id: 5, label: "Brand Frame" },
  ];

  return (
    <div className="fixed left-1/2 -translate-x-1/2 bottom-4 md:bottom-5 w-full max-w-xl rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl px-3 py-2 md:px-4 md:py-3 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm z-40 transition-colors animate-fade-in-up">
      <div className="flex items-center justify-between mb-2 text-sm">
        <span className="font-semibold inline-flex items-center gap-1 text-slate-900 dark:text-slate-50">
          <span className="material-icons text-base text-amber-500">
            auto_awesome
          </span>
          AR Filters
        </span>
        <div className="flex gap-1 overflow-x-auto max-w-[60%] hide-scrollbar">
          {categories.map((c) => (
            <span
              key={c}
              className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs whitespace-nowrap transition-colors"
            >
              {c}
            </span>
          ))}
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
        {filters.map((f) => {
          const isActive = f.id === activeId;
          return (
            <div
              key={f.id}
              className={
                "min-w-[80px] max-w-[80px] flex-shrink-0 rounded-xl border flex flex-col items-center justify-center py-2 cursor-pointer transition-all " +
                (isActive
                  ? "bg-[#f77f00]/10 border-[#f77f00]"
                  : "bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:border-emerald-400")
              }
              onClick={() => onSelect(f.id, f.label)}
            >
              <div
                className={
                  "h-9 w-9 rounded-full mb-1 transition-colors " +
                  (isActive ? "bg-[#f77f00]" : "bg-slate-200 dark:bg-slate-700")
                }
              />
              <span
                className={
                  "text-xs text-center px-1 " +
                  (isActive
                    ? "text-slate-900 dark:text-slate-50 font-semibold"
                    : "text-slate-900 dark:text-slate-100")
                }
              >
                {f.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* Flash Deal Control overlay */

export function FlashDealControl({
  onClose,
  onStart,
}: {
  onClose: () => void;
  onStart: (duration: number, discount: number) => void;
}) {
  const [duration, setDuration] = useState<number>(5);
  const [discount, setDiscount] = useState<number>(15);

  const durationOptions = [5, 10, 15];

  return (
    <div className="fixed right-4 top-20 z-50">
      <div className="w-72 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl px-3.5 py-3 text-sm transition-colors">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="material-icons text-base" style={{ color: EV_ORANGE }}>
              bolt
            </span>
            <div className="flex flex-col">
              <span className="text-md font-semibold">Flash Deal Control</span>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <button
              className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
              onClick={onClose}
              aria-label="Close"
            >
              ✕
            </button>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold">Live-only</span>
          </div>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-200 mb-2">
          Configure a limited-time offer with a countdown overlay for viewers.
        </p>
        <div className="mb-2">
          <span className="text-xs text-slate-500 dark:text-slate-300 mr-2">Duration</span>
          {durationOptions.map((d) => (
            <button
              key={d}
              className={
                "px-2 py-0.5 rounded-full text-xs mr-1 " +
                (duration === d
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium transition-colors")
              }
              onClick={() => setDuration(d)}
            >
              {d} min
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-slate-500 dark:text-slate-300">Extra discount</span>
          <input
            className="w-12 px-1 py-0.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm"
            value={discount}
            onChange={(e) => setDiscount(Number(e.target.value) || 0)}
          />
          <span className="text-xs text-slate-500 dark:text-slate-300">%</span>
        </div>
        <button
          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold text-white"
          style={{ backgroundColor: EV_ORANGE }}
          onClick={() => onStart(duration, discount)}
        >
          <span className="material-icons text-base">play_arrow</span>
          Start flash deal
        </button>
        <button
          className="mt-2 text-xs text-slate-500 dark:text-slate-300 hover:text-slate-700 dark:hover:text-slate-100 w-full text-center transition-colors"
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/* Language & AI audio overlay */

export function LanguagePanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed right-4 top-20 z-50">
      <div className="w-80 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl px-4 py-3 text-sm transition-colors">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="material-icons text-base text-slate-700 dark:text-slate-100 font-medium transition-colors">
              translate
            </span>
            <span className="text-md font-semibold">Language &amp; AI audio</span>
          </div>
          <button
            className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="mb-2">
          <span className="block text-xs font-semibold text-slate-600 dark:text-slate-200 mb-1">
            Stream language (creator)
          </span>
          <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-50 transition-colors">
            <span className="material-icons text-lg text-slate-500 dark:text-slate-300">
              record_voice_over
            </span>
            English (source)
          </div>
        </div>
        <div className="mb-2">
          <span className="block text-xs font-semibold text-slate-600 dark:text-slate-200 mb-1">
            AI audio languages for viewers
          </span>
          <div className="flex flex-wrap gap-1">
            {["French", "Arabic", "Swahili"].map((l) => (
              <span
                key={l}
                className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-50 transition-colors"
              >
                {l}
              </span>
            ))}
          </div>
        </div>
        <div className="mb-2">
          <span className="block text-xs font-semibold text-slate-600 dark:text-slate-200 mb-1">
            Captions
          </span>
          <label className="inline-flex items-center gap-1 text-xs text-slate-700 dark:text-slate-100 font-medium transition-colors">
            <input type="checkbox" defaultChecked /> Auto-enable captions
          </label>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-300">
          Viewers can still change their own language and choose between AI audio and
          captions in their app.
        </p>
      </div>
    </div>
  );
}

/* MOBILE studio */

type MobileStudioProps = {
  mode: Mode;
  typeLabel: string;
  products: Product[];
  highlightedProductId: string;
  setHighlightedProductId: (id: string) => void;
  flashDealzActive: boolean;
  onOpenFlashConfig: () => void;
  onStopFlash: () => void;
  chatMessages: ChatMessage[];
  chatDraft: string;
  setChatDraft: (value: string) => void;
  onSendChat: () => void;
  mobilePanel: "products" | "chat";
  setMobilePanel: (panel: "products" | "chat") => void;
  onToggleLive: () => void;
  onExit: () => void;
  micOn: boolean;
  onToggleMic: () => void;
  camOn: boolean;
  onToggleCam: () => void;
  onMarkMoment: () => void;
};

function MobileStudio({
  mode,

  products,
  highlightedProductId,
  setHighlightedProductId,
  flashDealzActive,
  onOpenFlashConfig,
  onStopFlash,
  chatMessages,
  chatDraft,
  setChatDraft,
  onSendChat,
  mobilePanel,
  setMobilePanel,
  onToggleLive,
  onExit,
  micOn,
  onToggleMic,
  camOn,
  onToggleCam,
  onMarkMoment,
}: MobileStudioProps) {
  return (
    <div className="xl:hidden fixed inset-0 z-[60] flex flex-col bg-white dark:bg-slate-950 transition-colors">
      {/* Video/Preview Area - Fixed height */}
      <div className="h-[25vh] min-h-[180px] max-h-[250px] border-b border-slate-200 dark:border-slate-800 bg-slate-900 flex flex-col items-center justify-center transition-colors relative flex-shrink-0 overflow-hidden group">

        {/* Simulated Camera Feed Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900 opacity-100" />
        {mode === "live" && (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black opacity-80 animate-pulse-slow" />
        )}

        {/* Grid Overlay (Camera Viewfinder effect) */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="w-full h-full border-[0.5px] border-white/20 grid grid-cols-3 grid-rows-3" />
        </div>

        <button
          onClick={onExit}
          className="absolute top-3 right-3 p-2 rounded-full bg-black/40 text-white/90 hover:bg-black/60 transition-colors z-50 backdrop-blur-sm"
        >
          <span className="material-icons text-xl">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </span>
        </button>

        {mode === "lobby" ? (
          <div className="relative z-10 flex flex-col items-center gap-3">
            <div className="h-16 w-16 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center backdrop-blur-sm">
              <span className="text-3xl">📹</span>
            </div>
            <div className="text-center">
              <div className="text-white font-medium mb-1 drop-shadow-md">Pre-live Lobby</div>
              <div className="text-xs text-slate-300 drop-shadow-sm">Check your setup before going live</div>
            </div>
            <div className="flex items-center gap-3 text-xs mt-1">
              <button
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border backdrop-blur-sm transition-colors ${camOn ? "bg-black/40 border-white/10 text-slate-200" : "bg-red-500/20 border-red-500/50 text-red-200"}`}
                onClick={onToggleCam}
              >
                <span className={`h-2 w-2 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)] ${camOn ? "bg-emerald-500" : "bg-red-500"}`}></span>
                <span>{camOn ? "Camera" : "Cam Off"}</span>
              </button>
              <button
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border backdrop-blur-sm transition-colors ${micOn ? "bg-black/40 border-white/10 text-slate-200" : "bg-red-500/20 border-red-500/50 text-red-200"}`}
                onClick={onToggleMic}
              >
                <span className={`h-2 w-2 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)] ${micOn ? "bg-emerald-500" : "bg-red-500"}`}></span>
                <span>{micOn ? "Mic" : "Mic Off"}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-600/90 text-white text-xs font-bold shadow-sm backdrop-blur-sm">
              <span className="h-2 w-2 rounded-full bg-white animate-pulse"></span>
              LIVE
            </div>

            {/* Center "On Air" Indicator / Avatar */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
                <div className="h-20 w-20 rounded-full bg-slate-800 border-2 border-red-500 flex items-center justify-center relative z-10 shadow-lg">
                  <span className="text-3xl">🎥</span>
                </div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-white drop-shadow-md">You're Live!</div>
                <div className="text-xs text-slate-300">Broadcasting to 842 viewers</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content Area - Scrollable */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Tabs - Fixed */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-xs transition-colors flex-shrink-0">
          <div className="flex gap-1">
            <button
              className={
                "px-2.5 py-0.5 rounded-full transition-colors whitespace-nowrap " +
                (mobilePanel === "products"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  : "bg-transparent dark:bg-slate-950 text-slate-600 dark:text-slate-300")
              }
              onClick={() => setMobilePanel("products")}
            >
              Products
            </button>
            <button
              className={
                "px-2.5 py-0.5 rounded-full transition-colors whitespace-nowrap " +
                (mobilePanel === "chat"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  : "bg-transparent dark:bg-slate-950 text-slate-600 dark:text-slate-300")
              }
              onClick={() => setMobilePanel("chat")}
            >
              Chat
            </button>
          </div>
          <span className="text-slate-600 dark:text-slate-400 text-tiny hidden sm:inline">Swipe up to browse</span>
        </div>
        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-2 bg-white dark:bg-slate-950 transition-colors min-h-0">
          {mobilePanel === "products" ? (
            <div className="space-y-1">
              {products.map((p: Product) => (
                <button
                  key={p.id}
                  className={
                    "w-full text-left border rounded-xl px-2.5 py-1.5 text-xs mb-1 transition-colors " +
                    (p.id === highlightedProductId
                      ? "bg-[#f77f00]/20 dark:bg-[#f77f00]/20 border-[#f77f00] text-slate-900 dark:text-slate-50"
                      : "bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-200")
                  }
                  onClick={() => setHighlightedProductId(p.id)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{p.name}</span>
                    <span className="text-emerald-600 dark:text-emerald-400">{p.price}</span>
                  </div>
                  <div className="text-tiny text-slate-600 dark:text-slate-400">
                    {p.stock} · {p.tag}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {chatMessages.map((m: ChatMessage) => (
                <div key={m.id} className="text-xs">
                  <span
                    className={
                      "font-semibold " +
                      (m.system ? "text-slate-500 dark:text-slate-400" : "text-slate-900 dark:text-slate-100")
                    }
                  >
                    {m.system ? "System" : m.from}
                  </span>
                  <span className="text-slate-600 dark:text-slate-300 ml-1">· {m.time}</span>
                  <p className="text-slate-800 dark:text-slate-200 whitespace-pre-line mt-0.5">{m.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat Input - Fixed above controls */}
      <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-1.5 flex items-center gap-1 text-xs transition-colors flex-shrink-0">
        <input
          className="flex-1 border border-slate-300 dark:border-slate-700 rounded-full px-2 py-1 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none placeholder:text-slate-500 dark:placeholder:text-slate-400 transition-colors text-xs"
          placeholder="Reply to viewers…"
          value={chatDraft}
          onChange={(e) => setChatDraft(e.target.value)}
        />
        <button
          className="px-2.5 py-1 rounded-full bg-[#f77f00] text-white text-xs whitespace-nowrap flex-shrink-0"
          onClick={onSendChat}
        >
          Send
        </button>
      </div>

      {/* Bottom Controls - Fixed above FooterNav */}
      <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-1.5 flex items-center justify-between gap-2 text-xs transition-colors flex-shrink-0">
        <button
          className="px-2 py-1 rounded-full border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 flex-1 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors whitespace-nowrap text-xs"
          onClick={onMarkMoment}
        >
          Highlight
        </button>
        <button
          className={
            "px-2 py-1 rounded-full flex-1 text-white whitespace-nowrap text-xs " +
            (flashDealzActive ? "bg-red-600" : "bg-[#f77f00]")
          }
          onClick={flashDealzActive ? onStopFlash : onOpenFlashConfig}
        >
          {flashDealzActive ? "Stop flash" : "Flash deal"}
        </button>
        <button
          className={
            "px-2 py-1 rounded-full flex-1 transition-colors whitespace-nowrap text-xs " +
            (mode === "live"
              ? "bg-red-600 text-white"
              : "bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700")
          }
          onClick={onToggleLive}
        >
          {mode === "live" ? "End live" : "Go live"}
        </button>
      </div>
    </div>
  );
}

export { LiveStudioPage };



export function TipCard({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="flex gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
      <div className="text-xl shrink-0">{icon}</div>
      <div className="flex flex-col gap-1">
        <h4 className="font-semibold text-slate-900 dark:text-slate-100">{title}</h4>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{text}</p>
      </div>
    </div>
  );
}
