"use client";

import {
  ArrowRight,
  ChevronDown,
  Clock3,
  Cpu,
  Download,
  Film,
  Image as ImageIcon,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  Play,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  UploadCloud,
  Video,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { BASE_MODELS, DEFAULT_BASE_MODEL, STYLE_PRESETS } from "./lib/style-presets";
import type { GeneratorMode, StylePreset } from "./lib/style-presets";
import { IS_PUBLIC_RELEASE, OUTFIT_REPLACE_ENABLED, PUBLIC_ALLOWED_BASE_MODELS, PUBLIC_SAFE_STYLE_IDS } from "./lib/feature-flags";

type RunStatus = "idle" | "uploading" | "queued" | "generating" | "complete" | "error";
type ReferenceFidelity = "high" | "balanced" | "creative";

type MediaOutput = {
  filename: string;
  subfolder?: string;
  type?: string;
  kind: "image" | "video";
};

type SessionOutput = MediaOutput & {
  id: string;
  url: string;
  prompt: string;
};

type RepairAction = {
  packId: string;
  label: string;
};

type ModeSettings = {
  baseModelId: string;
  selectedStyleIds: string[];
  width: number;
  height: number;
  length: number;
  hiresScale: number;
  referenceFidelity: ReferenceFidelity;
  fastMode: boolean;
};

type ImageSlot = "source" | "garment";
type ToolDescriptor = {
  mode: GeneratorMode;
  label: string;
  title: string;
  description: string;
  icon: "sparkles" | "image" | "video" | "film";
  promptLabel?: string;
  promptPlaceholder?: string;
  promptHint?: string;
  sourceLabel?: string;
  sourceHint?: string;
  garmentLabel?: string;
  garmentHint?: string;
  stageTitle: string;
  stageHint: string;
  outputHint: string;
  historyEmptyTitle: string;
  historyEmptyHint: string;
  summaryPoints: string[];
};

const DEFAULT_NEGATIVE =
  "watermark, text, subtitles, letterbox, pillarbox, frame, border, split screen, noise, artifacts, blur, vignette, worst quality, low quality, score_1, score_2, score_3, blurry, jpeg artifacts, sepia, low quality, worst quality, blurry, bad anatomy, extra limbs, deformed, watermark, text, signature, bareness, artifacts, copyrights name, jpeg_artifacts, scan_artifacts, bad hands, missing fingers, extra digit, fewer digits, artistic error, ye-pop, deviantart, logo, patreon logo,monochrome, greyscale,censored, mosaic censoring, 色调艳丽，过曝，静态，细节模糊不清，字幕，风格，作品，画作，画面，静止，整体发灰，最差质量，低质量，JPEG压缩残留，丑陋的，残缺的，多余的手指，画得不好的手部，画得不好的脸部，畸形的，毁容的，形态畸形的肢体，手指融合，静止不动的画面，杂乱的背景，三条腿，背景人很多，倒着走";
const DEFAULT_BRIDGE_URL = "https://bridge.shadowframe.tech";
const ASPECT_PRESETS = [
  { label: "1:1", width: 1024, height: 1024 },
  { label: "2:1", width: 1536, height: 768 },
  { label: "3:2", width: 1536, height: 1024 },
  { label: "4:3", width: 1344, height: 1008 },
  { label: "16:9", width: 1536, height: 864 },
  { label: "9:16", width: 864, height: 1536 },
  { label: "3:4", width: 1008, height: 1344 },
  { label: "1:2", width: 768, height: 1536 },
];
const PUBLIC_UPLOAD_MAX_MB = 12;
const PUBLIC_UPLOAD_MIN_DIMENSION = 256;
const PUBLIC_UPLOAD_MAX_DIMENSION = 4096;
const PUBLIC_UPLOAD_MAX_ASPECT_RATIO = 3.2;
const PUBLIC_ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const PUBLIC_EXPLICIT_UPLOAD_NAME = /\b(?:nude|nudity|naked|topless|bottomless|breast|nipples?|areola|boobs?|pussy|vagina|cameltoe|genitals?|porn|deepthroat|bondage|see[- ]?through|transparent)\b/i;

const STATUS_COPY: Record<RunStatus, string> = {
  idle: "Ready when you are",
  uploading: "Uploading source image",
  queued: "Waiting for the GPU",
  generating: "Creating your output",
  complete: "Output ready",
  error: "Generation stopped",
};

const CREATOR_MODE_LABELS: Record<GeneratorMode, string> = {
  "txt-img": "Text → Image",
  "img-img": "Image → Image",
  "img-vid": "Image → Video",
  "txt-vid": "Text → Video",
  "outfit": "Outfit Replace",
};

const PUBLIC_TOOL_DESCRIPTORS: Record<GeneratorMode, ToolDescriptor> = {
  "txt-img": {
    mode: "txt-img",
    label: "Anime Style",
    title: "Create anime artwork",
    description: "Turn a short idea into a polished, safe anime-style illustration.",
    icon: "sparkles",
    promptLabel: "What should we create?",
    promptPlaceholder: "Example: a quiet ramen shop at night, warm lantern light, cozy cinematic anime mood…",
    promptHint: "Keep it short. Focus on subject, mood, setting, and color.",
    stageTitle: "Your anime artwork will appear here",
    stageHint: "Describe a safe scene to begin.",
    outputHint: "Styled image ready for download when complete.",
    historyEmptyTitle: "No anime artwork yet",
    historyEmptyHint: "Your finished anime renders will appear here during this session.",
    summaryPoints: ["Short guided prompt", "Anime-safe rendering", "Local image generation"],
  },
  "img-img": {
    mode: "img-img",
    label: "Photo Restyle",
    title: "Restyle a source image",
    description: "Upload a source photo or illustration and give it a clean, guided anime finish.",
    icon: "image",
    promptLabel: "How should it be restyled?",
    promptPlaceholder: "Example: soft anime shading, cherry blossom palette, cleaner linework, gentle expression…",
    promptHint: "Describe the new look you want, not a whole new scene.",
    sourceLabel: "Source image",
    sourceHint: "Upload the image you want to restyle.",
    stageTitle: "Your restyled image will appear here",
    stageHint: "Add a source image and a short style note.",
    outputHint: "Restyled image ready for download when complete.",
    historyEmptyTitle: "No restyles yet",
    historyEmptyHint: "Your transformed images will appear here during this session.",
    summaryPoints: ["Keeps your source image", "Applies a guided new style", "Safe-for-work public output"],
  },
  "img-vid": {
    mode: "img-vid",
    label: "Bring Photo to Life",
    title: "Animate a still image",
    description: "Add gentle cinematic motion to a single image using a locked safe workflow.",
    icon: "video",
    promptLabel: "How should it move?",
    promptPlaceholder: "Example: slow camera drift, soft wind in the hair, gentle blinking, cinematic atmosphere…",
    promptHint: "Describe motion and mood. Keep it subtle and cinematic.",
    sourceLabel: "Still image",
    sourceHint: "Upload the image you want to animate.",
    stageTitle: "Your motion clip will appear here",
    stageHint: "Add an image and a short motion note.",
    outputHint: "Animated clip ready for download when complete.",
    historyEmptyTitle: "No motion clips yet",
    historyEmptyHint: "Your generated motion clips will appear here during this session.",
    summaryPoints: ["Image-to-video workflow", "Gentle motion only", "Local GPU rendering"],
  },
  "txt-vid": {
    mode: "txt-vid",
    label: "Motion Scene",
    title: "Create a motion scene",
    description: "Describe a safe cinematic scene and turn it into a short video clip.",
    icon: "film",
    promptLabel: "Describe the scene",
    promptPlaceholder: "Example: a rainy neon alley, slow dolly camera move, reflective puddles, moody cinematic lighting…",
    promptHint: "Keep it short and visual: subject, environment, movement, and mood.",
    stageTitle: "Your motion scene will appear here",
    stageHint: "Describe a safe cinematic moment to begin.",
    outputHint: "Motion clip ready for download when complete.",
    historyEmptyTitle: "No motion scenes yet",
    historyEmptyHint: "Your generated scenes will appear here during this session.",
    summaryPoints: ["Text-to-video workflow", "Short cinematic clips", "Curated public-safe output"],
  },
  "outfit": {
    mode: "outfit",
    label: "Wardrobe Swap",
    title: "Swap clothing only",
    description: "Replace clothing with a reference outfit while keeping the overall composition aligned.",
    icon: "image",
    sourceLabel: "Subject photo",
    sourceHint: "Upload the person or source image you want to keep aligned.",
    garmentLabel: "Clothing reference",
    garmentHint: "Upload the outfit image you want to transfer.",
    stageTitle: "Your wardrobe swap will appear here",
    stageHint: "Add a subject photo and a clothing reference.",
    outputHint: "Wardrobe swap image ready for download when complete.",
    historyEmptyTitle: "No wardrobe swaps yet",
    historyEmptyHint: "Your outfit-swapped images will appear here during this session.",
    summaryPoints: ["Composition-preserving swap", "SFW clothing transfer", "No anatomy or nudity changes"],
  },
};

const PUBLIC_MODE_DEFAULTS: Record<GeneratorMode, Partial<ModeSettings>> = {
  "txt-img": {
    baseModelId: "anima-aesthetic",
    selectedStyleIds: ["anima-busoft"],
    width: 1024,
    height: 1024,
    hiresScale: 1.5,
    referenceFidelity: "balanced",
    fastMode: true,
  },
  "img-img": {
    baseModelId: "anima-aesthetic",
    selectedStyleIds: ["anima-xipa"],
    width: 1024,
    height: 1024,
    hiresScale: 1.5,
    referenceFidelity: "balanced",
    fastMode: true,
  },
  "img-vid": {
    baseModelId: "wan22-i2v",
    selectedStyleIds: ["wan22-2d"],
    width: 720,
    height: 1280,
    length: 93,
    referenceFidelity: "balanced",
    fastMode: true,
  },
  "txt-vid": {
    baseModelId: "wan22-t2v",
    selectedStyleIds: [],
    width: 640,
    height: 640,
    length: 81,
    referenceFidelity: "balanced",
    fastMode: true,
  },
  "outfit": {
    baseModelId: "catvton",
    selectedStyleIds: [],
    width: 1024,
    height: 1024,
    hiresScale: 1,
    referenceFidelity: "high",
    fastMode: true,
  },
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatRemaining(seconds: number) {
  if (seconds < 60) return `${Math.max(1, Math.ceil(seconds))} sec`;
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.ceil(seconds % 60);
  return remainder ? `${minutes} min ${remainder} sec` : `${minutes} min`;
}

async function readImageDimensions(file: File) {
  const objectUrl = URL.createObjectURL(file);
  try {
    const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = () => reject(new Error("That image could not be read."));
      image.src = objectUrl;
    });
    return dimensions;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function validatePublicUploadFile(file: File, slot: ImageSlot) {
  const slotLabel = slot === "garment" ? "reference outfit image" : "source image";
  if (!PUBLIC_ALLOWED_IMAGE_TYPES.has(file.type)) {
    return `Public Shadowframe accepts JPEG, PNG, or WebP files only for the ${slotLabel}.`;
  }
  if (file.size <= 0 || file.size > PUBLIC_UPLOAD_MAX_MB * 1024 * 1024) {
    return `Public Shadowframe accepts ${slotLabel}s up to ${PUBLIC_UPLOAD_MAX_MB} MB.`;
  }
  if (PUBLIC_EXPLICIT_UPLOAD_NAME.test(file.name)) {
    return `Rename that ${slotLabel} before uploading it to the public release.`;
  }

  const { width, height } = await readImageDimensions(file);
  const aspectRatio = Math.max(width, height) / Math.max(1, Math.min(width, height));
  if (width < PUBLIC_UPLOAD_MIN_DIMENSION || height < PUBLIC_UPLOAD_MIN_DIMENSION || width > PUBLIC_UPLOAD_MAX_DIMENSION || height > PUBLIC_UPLOAD_MAX_DIMENSION || aspectRatio > PUBLIC_UPLOAD_MAX_ASPECT_RATIO) {
    return `Public Shadowframe accepts ${slotLabel}s between ${PUBLIC_UPLOAD_MIN_DIMENSION} and ${PUBLIC_UPLOAD_MAX_DIMENSION} pixels with a moderate aspect ratio.`;
  }
  return "";
}

function createSeed() {
  return Math.floor(Math.random() * 900_000_000_000_000);
}

function createTimestamp() {
  return Date.now();
}

function findMedia(value: unknown): MediaOutput | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.filename === "string" && /\.(mp4|webm|mov|png|jpe?g|webp)$/i.test(candidate.filename)) {
    return {
      filename: candidate.filename,
      subfolder: typeof candidate.subfolder === "string" ? candidate.subfolder : "",
      type: typeof candidate.type === "string" ? candidate.type : "output",
      kind: /\.(mp4|webm|mov)$/i.test(candidate.filename) ? "video" : "image",
    };
  }
  for (const nested of Object.values(candidate)) {
    const found = findMedia(nested);
    if (found) return found;
  }
  return null;
}

function mediaPathFor(media: MediaOutput) {
  const query = new URLSearchParams({
    path: "/view",
    filename: media.filename,
    subfolder: media.subfolder ?? "",
    type: media.type ?? "output",
  });
  return `/api/comfy?${query.toString()}`;
}

function comfyRuntimeError(entry: unknown) {
  if (!entry || typeof entry !== "object") return "";
  const messages = (entry as { status?: { messages?: unknown[] } }).status?.messages;
  if (!Array.isArray(messages)) return "";
  for (const message of messages) {
    if (!Array.isArray(message) || message[0] !== "execution_error") continue;
    const payload = message[1] as { exception_message?: unknown; node_type?: unknown; node_id?: unknown };
    const exception = typeof payload?.exception_message === "string" ? payload.exception_message.trim() : "";
    const nodeType = typeof payload?.node_type === "string" ? payload.node_type : "";
    const nodeId = typeof payload?.node_id === "string" ? payload.node_id : "";
    if (exception) return nodeType ? `${exception} (${nodeType}${nodeId ? ` node ${nodeId}` : ""})` : exception;
  }
  return "";
}

function friendlyRuntimeError(message: string) {
  if (/LoadCatVTONPipeline|LoadAutoMasker|AutoMasker|CatVTON|DensePose|detectron2|No module named/i.test(message)) {
    return "Outfit Replace needs the local CatVTON runtime. Repair or reinstall the current Shadowframe Core package, then restart Shadowframe.";
  }
  if (/size mismatch|copying a param with shape/i.test(message)) {
    return "The PhotoReal model pack is stale or mismatched. Shadowframe can repair it automatically.";
  }
  return message;
}

function normalizeBridgeUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

function bridgeRequest(path: string, bridgeUrl: string, bridgeToken: string, init: RequestInit = {}) {
  const url = bridgeUrl ? new URL(path, `${bridgeUrl}/`).toString() : path;
  const headers = new Headers(init.headers);
  if (bridgeToken) headers.set("Authorization", `Bearer ${bridgeToken}`);
  return fetch(url, { ...init, headers });
}

function modeIcon(mode: GeneratorMode) {
  switch (mode) {
    case "txt-img":
      return <Sparkles size={15} />;
    case "img-img":
    case "outfit":
      return <ImageIcon size={15} />;
    case "img-vid":
      return <Video size={15} />;
    case "txt-vid":
      return <Film size={15} />;
    default:
      return <Sparkles size={15} />;
  }
}

export default function Home() {
  const [showSplash, setShowSplash] = useState(true);
  const initialMode: GeneratorMode = IS_PUBLIC_RELEASE ? "txt-img" : "img-vid";
  const initialDefaults = PUBLIC_MODE_DEFAULTS[initialMode];
  const [mode, setMode] = useState<GeneratorMode>(initialMode);
  const [baseModelId, setBaseModelId] = useState(
    IS_PUBLIC_RELEASE
      ? (initialDefaults.baseModelId ?? DEFAULT_BASE_MODEL[initialMode])
      : DEFAULT_BASE_MODEL["img-vid"],
  );
  const [selectedStyleIds, setSelectedStyleIds] = useState<string[]>(IS_PUBLIC_RELEASE ? (initialDefaults.selectedStyleIds ?? []) : []);
  const [sliderSelections, setSliderSelections] = useState<Record<string, string>>({});
  const [sliderDialogStyleId, setSliderDialogStyleId] = useState("");
  const [modeSettings, setModeSettings] = useState<Partial<Record<GeneratorMode, ModeSettings>>>({});
  const [runningMode, setRunningMode] = useState<GeneratorMode | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [garmentFile, setGarmentFile] = useState<File | null>(null);
  const [garmentPreview, setGarmentPreview] = useState("");
  const [positivePrompt, setPositivePrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState(DEFAULT_NEGATIVE);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [width, setWidth] = useState(IS_PUBLIC_RELEASE ? (initialDefaults.width ?? 720) : 720);
  const [height, setHeight] = useState(IS_PUBLIC_RELEASE ? (initialDefaults.height ?? 1280) : 1280);
  const [length, setLength] = useState(IS_PUBLIC_RELEASE ? (initialDefaults.length ?? 93) : 93);
  const [hiresScale, setHiresScale] = useState(IS_PUBLIC_RELEASE ? (initialDefaults.hiresScale ?? 2) : 2);
  const [referenceFidelity, setReferenceFidelity] = useState<ReferenceFidelity>(IS_PUBLIC_RELEASE ? (initialDefaults.referenceFidelity ?? "balanced") : "balanced");
  const [seed, setSeed] = useState(() => createSeed());
  const [fastMode, setFastMode] = useState(IS_PUBLIC_RELEASE ? (initialDefaults.fastMode ?? true) : true);
  const [status, setStatus] = useState<RunStatus>("idle");
  const [error, setError] = useState("");
  const [repairAction, setRepairAction] = useState<RepairAction | null>(null);
  const [repairingPack, setRepairingPack] = useState(false);
  const [repairMessage, setRepairMessage] = useState("");
  const [comfyOnline, setComfyOnline] = useState<boolean | null>(null);
  const [bridgeUrl, setBridgeUrl] = useState("");
  const [bridgeToken, setBridgeToken] = useState("");
  const [bridgeUrlInput, setBridgeUrlInput] = useState("");
  const [bridgeTokenInput, setBridgeTokenInput] = useState("");
  const [bridgeInitialized, setBridgeInitialized] = useState(false);
  const [connectionOpen, setConnectionOpen] = useState(false);
  const [connectionTesting, setConnectionTesting] = useState(false);
  const [connectionError, setConnectionError] = useState("");
  const [installedLoras, setInstalledLoras] = useState<string[]>([]);
  const [result, setResult] = useState<SessionOutput | null>(null);
  const [sessionOutputs, setSessionOutputs] = useState<SessionOutput[]>([]);
  const [dragging, setDragging] = useState(false);
  const [runStartedAt, setRunStartedAt] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const garmentInputRef = useRef<HTMLInputElement>(null);
  const runTokenRef = useRef(0);
  const uploadedImageRef = useRef<{ fingerprint: string; imageName: string } | null>(null);
  const uploadedGarmentRef = useRef<{ fingerprint: string; imageName: string } | null>(null);
  const bridgeHealthFailuresRef = useRef(0);

  const isRunning = ["uploading", "queued", "generating"].includes(status);
  const isOutfitMode = mode === "outfit";
  const requiresImage = mode.startsWith("img-") || isOutfitMode;
  const createsVideo = mode.endsWith("-vid");
  const outputKind = createsVideo ? "video" : "image";
  const availableModes: GeneratorMode[] = OUTFIT_REPLACE_ENABLED
    ? ["txt-img", "img-img", "img-vid", "txt-vid", "outfit"]
    : ["txt-img", "img-img", "img-vid", "txt-vid"];
  const publicModes = availableModes.filter((candidate) => candidate !== "outfit" || OUTFIT_REPLACE_ENABLED);
  const visibleModes = IS_PUBLIC_RELEASE ? publicModes : availableModes;
  const statusCopy: Record<RunStatus, string> = {
    ...STATUS_COPY,
    generating: `Creating your ${outputKind}`,
    complete: `${outputKind[0].toUpperCase()}${outputKind.slice(1)} ready`,
  };
  const allowedBaseModelsForMode = IS_PUBLIC_RELEASE
    ? PUBLIC_ALLOWED_BASE_MODELS[mode]
    : null;
  const availableBaseModels = BASE_MODELS.filter((model) => {
    if (!model.modes.includes(mode)) return false;
    if (!OUTFIT_REPLACE_ENABLED && model.id === "catvton") return false;
    if (IS_PUBLIC_RELEASE && allowedBaseModelsForMode && !allowedBaseModelsForMode.includes(model.id as never)) return false;
    return true;
  });
  const selectedBaseModel = BASE_MODELS.find((model) => model.id === baseModelId) ?? availableBaseModels[0];
  const availableStyles = STYLE_PRESETS.filter((style) => {
    if (!(style.id === "original" || style.baseModelIds.includes(baseModelId))) return false;
    if (!style.modes.includes(mode)) return false;
    if (IS_PUBLIC_RELEASE && !PUBLIC_SAFE_STYLE_IDS.includes(style.id as (typeof PUBLIC_SAFE_STYLE_IDS)[number])) return false;
    return true;
  });
  const selectedStyles = selectedStyleIds
    .map((id) => STYLE_PRESETS.find((style) => style.id === id))
    .filter((style): style is StylePreset => Boolean(style) && style.baseModelIds.includes(baseModelId));
  const selectedStyleFiles = selectedStyles.filter((style) => style.file);
  const sliderDialogStyle = STYLE_PRESETS.find((style) => style.id === sliderDialogStyleId);
  const isAnimaBase = baseModelId === "wai-anima" || baseModelId === "anima-aesthetic";
  const selectedStylesInstalled = selectedStyleFiles.every((style) => installedLoras.some((name) => name.replaceAll("\\", "/").endsWith(style.file as string)));
  const estimatedTotalSeconds = createsVideo
    ? fastMode ? 300 : 900
    : isOutfitMode ? 120 : mode === "img-img" ? 150 : isAnimaBase ? 55 : 90;
  const timeProgress = (elapsedSeconds / estimatedTotalSeconds) * 100;
  const progress = status === "uploading"
    ? Math.max(6, Math.min(18, timeProgress))
    : status === "queued"
      ? Math.max(20, Math.min(30, timeProgress))
      : status === "generating"
        ? Math.min(96, 32 + (timeProgress * 0.64))
        : status === "complete" ? 100 : 0;
  const remainingSeconds = Math.max(0, estimatedTotalSeconds - elapsedSeconds);
  const generationAwayFromTab = isRunning && runningMode !== null && runningMode !== mode;
  const isLocalPage = typeof window !== "undefined" && ["localhost", "127.0.0.1"].includes(window.location.hostname);
  const currentTool = PUBLIC_TOOL_DESCRIPTORS[mode];
  const publicPromptLabel = currentTool.promptLabel ?? "Creative direction";
  const publicPromptPlaceholder = currentTool.promptPlaceholder ?? "Describe the look you want…";
  const publicPromptHint = currentTool.promptHint ?? "Keep it short and visual.";
  const publicSourceLabel = currentTool.sourceLabel ?? "Source image";
  const publicSourceHint = currentTool.sourceHint ?? "Upload an image to begin.";
  const publicGarmentLabel = currentTool.garmentLabel ?? "Clothing reference";
  const publicGarmentHint = currentTool.garmentHint ?? "Upload the clothing reference image.";
  const publicInputType = isOutfitMode ? "Dual image input" : requiresImage ? "Image input" : "Text input";
  const publicOutputType = createsVideo ? "Video output" : "Image output";

  const aspectLabel = useMemo(() => {
    const divisor = (a: number, b: number): number => (b === 0 ? a : divisor(b, a % b));
    const d = divisor(width, height);
    return `${width / d}:${height / d}`;
  }, [width, height]);

  const publicStageTags = isOutfitMode
    ? [aspectLabel, "guided swap", "SFW only"]
    : createsVideo
      ? [aspectLabel, "guided motion", "SFW only"]
      : [aspectLabel, "guided render", "SFW only"];

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      if (!active) return;
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const pairedUrl = normalizeBridgeUrl(hash.get("bridge") || "");
      const pairedToken = hash.get("token") || "";
      const storedUrl = sessionStorage.getItem("shadowframe.bridge.url") || "";
      const storedToken = sessionStorage.getItem("shadowframe.bridge.token") || "";
      const initialUrl = pairedUrl || storedUrl || DEFAULT_BRIDGE_URL;
      const initialToken = pairedToken || storedToken;

      if (pairedUrl && pairedToken) {
        sessionStorage.setItem("shadowframe.bridge.url", pairedUrl);
        sessionStorage.setItem("shadowframe.bridge.token", pairedToken);
        window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
      }

      setBridgeUrl(initialUrl);
      setBridgeToken(initialToken);
      setBridgeUrlInput(initialUrl);
      setBridgeTokenInput(initialToken);
      setBridgeInitialized(true);
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!bridgeInitialized) return;
    let active = true;
    const checkComfy = async () => {
      try {
        if (!isLocalPage && (!bridgeUrl || !bridgeToken)) throw new Error("Bridge not paired");
        const response = await bridgeRequest("/api/comfy?path=/system_stats", bridgeUrl, bridgeToken, { cache: "no-store" });
        if (response.ok) {
          bridgeHealthFailuresRef.current = 0;
          if (active) setComfyOnline(true);
          const loraResponse = await bridgeRequest("/api/comfy?path=/models/loras", bridgeUrl, bridgeToken, { cache: "no-store" });
          if (active && loraResponse.ok) setInstalledLoras(await loraResponse.json() as string[]);
        } else if (response.status === 401 || response.status === 403) {
          bridgeHealthFailuresRef.current = 3;
          if (active) setComfyOnline(false);
        } else {
          bridgeHealthFailuresRef.current += 1;
          if (active && bridgeHealthFailuresRef.current >= 3) setComfyOnline(false);
        }
      } catch {
        bridgeHealthFailuresRef.current += 1;
        if (active && bridgeHealthFailuresRef.current >= 3) setComfyOnline(false);
      }
    };
    checkComfy();
    const timer = window.setInterval(checkComfy, 8000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [bridgeInitialized, bridgeToken, bridgeUrl, isLocalPage]);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      if (garmentPreview) URL.revokeObjectURL(garmentPreview);
    };
  }, [garmentPreview, imagePreview]);

  useEffect(() => {
    if (!isRunning || runStartedAt === null) return;
    const updateElapsed = () => setElapsedSeconds(Math.max(0, (Date.now() - runStartedAt) / 1000));
    updateElapsed();
    const timer = window.setInterval(updateElapsed, 1000);
    return () => window.clearInterval(timer);
  }, [isRunning, runStartedAt]);

  const acceptFile = async (nextFile: File, slot: ImageSlot = "source") => {
    if (!nextFile.type.startsWith("image/")) {
      setError("Choose a JPG, PNG, or WebP image.");
      setStatus("error");
      return;
    }
    if (IS_PUBLIC_RELEASE) {
      const uploadError = await validatePublicUploadFile(nextFile, slot);
      if (uploadError) {
        setError(uploadError);
        setStatus("error");
        return;
      }
    }
    if (slot === "garment") {
      setGarmentFile(nextFile);
      uploadedGarmentRef.current = null;
      setGarmentPreview(URL.createObjectURL(nextFile));
    } else {
      setFile(nextFile);
      uploadedImageRef.current = null;
      setImagePreview(URL.createObjectURL(nextFile));
    }
    setResult(null);
    setError("");
    setStatus("idle");
  };

  const onFileInput = async (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0];
    if (nextFile) await acceptFile(nextFile);
  };

  const onGarmentInput = async (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0];
    if (nextFile) await acceptFile(nextFile, "garment");
  };

  const onDrop = async (event: DragEvent<HTMLButtonElement>, slot: ImageSlot = "source") => {
    event.preventDefault();
    setDragging(false);
    const nextFile = event.dataTransfer.files?.[0];
    if (nextFile) await acceptFile(nextFile, slot);
  };

  const resetImage = () => {
    setFile(null);
    uploadedImageRef.current = null;
    setImagePreview("");
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const resetGarmentImage = () => {
    setGarmentFile(null);
    uploadedGarmentRef.current = null;
    setGarmentPreview("");
    setResult(null);
    if (garmentInputRef.current) garmentInputRef.current.value = "";
  };

  const captureModeSettings = (): ModeSettings => ({
    baseModelId,
    selectedStyleIds,
    width,
    height,
    length,
    hiresScale,
    referenceFidelity,
    fastMode,
  });

  const applyModeSettings = (nextMode: GeneratorMode, settings?: ModeSettings) => {
    if (IS_PUBLIC_RELEASE) {
      const publicDefaults = PUBLIC_MODE_DEFAULTS[nextMode];
      setBaseModelId(publicDefaults.baseModelId ?? DEFAULT_BASE_MODEL[nextMode]);
      setSelectedStyleIds(publicDefaults.selectedStyleIds ?? []);
      setWidth(publicDefaults.width ?? width);
      setHeight(publicDefaults.height ?? height);
      setLength(publicDefaults.length ?? length);
      setHiresScale(publicDefaults.hiresScale ?? hiresScale);
      setReferenceFidelity(publicDefaults.referenceFidelity ?? "balanced");
      setFastMode(publicDefaults.fastMode ?? true);
      return;
    }
    if (settings) {
      setBaseModelId(settings.baseModelId);
      setSelectedStyleIds(settings.selectedStyleIds);
      setWidth(settings.width);
      setHeight(settings.height);
      setLength(settings.length);
      setHiresScale(settings.hiresScale);
      setReferenceFidelity(settings.referenceFidelity);
      setFastMode(settings.fastMode);
      return;
    }
    setBaseModelId(DEFAULT_BASE_MODEL[nextMode]);
    setSelectedStyleIds([]);
    if (nextMode === "txt-vid") {
      setWidth(640);
      setHeight(640);
      setLength(81);
      setFastMode(true);
    } else if (nextMode === "img-vid") {
      setWidth(720);
      setHeight(1280);
      setLength(93);
    } else if (nextMode === "txt-img") {
      setWidth(1024);
      setHeight(1024);
      setHiresScale(2);
    } else if (nextMode === "outfit") {
      setHiresScale(1);
      setReferenceFidelity("high");
    } else {
      setHiresScale(2);
    }
  };

  const saveBridgeConnection = async () => {
    const nextUrl = normalizeBridgeUrl(bridgeUrlInput);
    const nextToken = bridgeTokenInput.trim();
    if (!isLocalPage && !/^https:\/\//i.test(nextUrl)) {
      setConnectionError("Enter the secure https:// tunnel address shown by the Shadowframe Bridge launcher.");
      return;
    }
    if (!isLocalPage && !nextToken) {
      setConnectionError("Enter the private access key shown by the Shadowframe Bridge launcher.");
      return;
    }

    setConnectionTesting(true);
    setConnectionError("");
    try {
      const response = await bridgeRequest("/api/comfy?path=/system_stats", nextUrl, nextToken, { cache: "no-store" });
      if (!response.ok) {
        const details = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(details.error || "The bridge answered, but ComfyUI is not ready.");
      }
      sessionStorage.setItem("shadowframe.bridge.url", nextUrl);
      sessionStorage.setItem("shadowframe.bridge.token", nextToken);
      if (nextUrl !== bridgeUrl || nextToken !== bridgeToken) uploadedImageRef.current = null;
      setBridgeUrl(nextUrl);
      setBridgeToken(nextToken);
      setComfyOnline(true);
      setConnectionOpen(false);
      setError("");
    } catch (caught) {
      setConnectionError(caught instanceof Error ? caught.message : "Unable to connect to the Shadowframe Bridge.");
    } finally {
      setConnectionTesting(false);
    }
  };

  const selectMode = (nextMode: GeneratorMode) => {
    if (nextMode === "outfit" && !OUTFIT_REPLACE_ENABLED) {
      setError("Outfit Replace is still being packaged for clean installs and is disabled in this release build.");
      return;
    }
    setModeSettings((current) => ({ ...current, [mode]: captureModeSettings() }));
    setMode(nextMode);
    setError("");
    applyModeSettings(nextMode, modeSettings[nextMode]);
  };

  const selectBaseModel = (nextBaseModelId: string) => {
    if (IS_PUBLIC_RELEASE) return;
    setBaseModelId(nextBaseModelId);
    setSelectedStyleIds([]);
    setResult(null);
    setError("");
    setRepairAction(null);
    setRepairMessage("");
    if (!isRunning) setStatus("idle");
    if (nextBaseModelId === "wai-anima" || nextBaseModelId === "anima-aesthetic") setHiresScale(1.5);
    if (nextBaseModelId === "ltx23-gtanimation") {
      setWidth(768);
      setHeight(512);
      setLength(25);
    } else if (mode === "img-vid") {
      setWidth(720);
      setHeight(1280);
      setLength(93);
    }
    if (nextBaseModelId === "catvton") setHiresScale(1);
  };

  const enterGenerator = () => {
    selectMode(IS_PUBLIC_RELEASE ? "txt-img" : "txt-img");
    setShowSplash(false);
    if (!isLocalPage && (!bridgeUrl || !bridgeToken)) setConnectionOpen(true);
  };

  const toggleStyle = (style: StylePreset) => {
    if (IS_PUBLIC_RELEASE) return;
    setError("");
    setRepairAction(null);
    setRepairMessage("");
    if (!isRunning) setStatus("idle");
    if (style.id === "original") {
      setSelectedStyleIds([]);
      return;
    }
    setSelectedStyleIds((current) => current.includes(style.id) ? current.filter((id) => id !== style.id) : [...current, style.id]);
    if (style.slider) {
      setSliderSelections((current) => ({ ...current, [style.id]: current[style.id] || style.slider?.defaultOptionId || "" }));
      setSliderDialogStyleId(style.id);
    }
  };

  const applyAspectRatio = (preset: typeof ASPECT_PRESETS[number]) => {
    setWidth(preset.width);
    setHeight(preset.height);
  };

  const generate = async () => {
    if (!comfyOnline) {
      setError("Start and connect the Shadowframe Bridge before generating.");
      setStatus("error");
      setConnectionOpen(true);
      return;
    }
    if (!selectedBaseModel.ready) {
      setError(`${selectedBaseModel.name} still needs its base workflow and model files before it can generate.`);
      setStatus("error");
      return;
    }
    if (!selectedStylesInstalled) {
      const missing = selectedStyleFiles.find((style) => !installedLoras.some((name) => name.replaceAll("\\", "/").endsWith(style.file as string)));
      setError(`${missing?.name ?? "Selected LoRA"} needs ${missing?.file ?? "its LoRA file"} in ComfyUI's LoRA folder.`);
      setStatus("error");
      return;
    }
    if (requiresImage && !file) {
      setError(isOutfitMode ? "Drop in the source model photo first." : "Drop in a source image first.");
      setStatus("error");
      return;
    }
    if (isOutfitMode && !garmentFile) {
      setError("Drop in an outfit reference image first.");
      setStatus("error");
      return;
    }
    if (!isOutfitMode && !positivePrompt.trim()) {
      setError(`Add a positive prompt describing the ${createsVideo ? "motion" : "image"} you want.`);
      setStatus("error");
      return;
    }

    const runToken = ++runTokenRef.current;
    const runStartedTimestamp = createTimestamp();
    setError("");
    setRepairAction(null);
    setRepairMessage("");
    setResult(null);
    setRunningMode(mode);
    setRunStartedAt(runStartedTimestamp);
    setElapsedSeconds(0);

    try {
      let imageName = "";
      let garmentImageName = "";
      if (requiresImage && file) {
        const fingerprint = `${file.name}:${file.size}:${file.lastModified}`;
        if (uploadedImageRef.current?.fingerprint === fingerprint) {
          imageName = uploadedImageRef.current.imageName;
        } else {
          setStatus("uploading");
          const uploadBody = new FormData();
          uploadBody.append("image", file);
          uploadBody.append("type", "input");
          uploadBody.append("overwrite", "true");
          const uploadResponse = await bridgeRequest("/api/comfy?path=/upload/image", bridgeUrl, bridgeToken, {
            method: "POST",
            body: uploadBody,
          });
          if (!uploadResponse.ok) {
            const uploadFailure = await uploadResponse.json().catch(() => ({} as { error?: string }));
            throw new Error(uploadFailure.error || "ComfyUI could not accept the source image.");
          }
          const uploaded = (await uploadResponse.json()) as { name: string; subfolder?: string };
          imageName = uploaded.subfolder ? `${uploaded.subfolder}/${uploaded.name}` : uploaded.name;
          uploadedImageRef.current = { fingerprint, imageName };
        }
      }
      if (isOutfitMode && garmentFile) {
        const fingerprint = `${garmentFile.name}:${garmentFile.size}:${garmentFile.lastModified}`;
        if (uploadedGarmentRef.current?.fingerprint === fingerprint) {
          garmentImageName = uploadedGarmentRef.current.imageName;
        } else {
          setStatus("uploading");
          const uploadBody = new FormData();
          uploadBody.append("image", garmentFile);
          uploadBody.append("type", "input");
          uploadBody.append("overwrite", "true");
          const uploadResponse = await bridgeRequest("/api/comfy?path=/upload/image", bridgeUrl, bridgeToken, {
            method: "POST",
            body: uploadBody,
          });
          if (!uploadResponse.ok) {
            const uploadFailure = await uploadResponse.json().catch(() => ({} as { error?: string }));
            throw new Error(uploadFailure.error || "ComfyUI could not accept the outfit reference image.");
          }
          const uploaded = (await uploadResponse.json()) as { name: string; subfolder?: string };
          garmentImageName = uploaded.subfolder ? `${uploaded.subfolder}/${uploaded.name}` : uploaded.name;
          uploadedGarmentRef.current = { fingerprint, imageName: garmentImageName };
        }
      }

      setStatus("queued");
      const generationResponse = await bridgeRequest("/api/generate", bridgeUrl, bridgeToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageName,
          garmentImageName,
          positivePrompt: isOutfitMode ? "" : positivePrompt.trim(),
          negativePrompt: isOutfitMode ? "" : negativePrompt.trim(),
          width,
          height,
          length,
          seed,
          fastMode,
          hiresScale,
          mode,
          styleIds: selectedStyleIds,
          sliderSelections,
          baseModelId,
          referenceFidelity,
        }),
      });
      const generation = (await generationResponse.json()) as { prompt_id?: string; error?: string; repairAction?: RepairAction };
      if (!generationResponse.ok || !generation.prompt_id) {
        if (generation.repairAction) setRepairAction(generation.repairAction);
        throw new Error(generation.error || "ComfyUI rejected the workflow.");
      }

      setStatus("generating");
      for (let attempt = 0; attempt < 1800; attempt += 1) {
        if (runTokenRef.current !== runToken) return;
        await sleep(2000);
        const historyResponse = await bridgeRequest(`/api/comfy?path=${encodeURIComponent(`/history/${generation.prompt_id}`)}`, bridgeUrl, bridgeToken, {
          cache: "no-store",
        });
        if (!historyResponse.ok) continue;
        const history = (await historyResponse.json()) as Record<string, unknown>;
        const entry = history[generation.prompt_id];
        const media = findMedia(entry);
        if (media) {
          const mediaResponse = await bridgeRequest(mediaPathFor(media), bridgeUrl, bridgeToken, { cache: "no-store" });
          if (!mediaResponse.ok) throw new Error("The generated file could not be downloaded from ComfyUI.");
          const mediaUrl = URL.createObjectURL(await mediaResponse.blob());
          const completed: SessionOutput = {
            ...media,
            id: generation.prompt_id,
            url: mediaUrl,
            prompt: isOutfitMode ? "Strict outfit replacement" : positivePrompt.trim(),
          };
          setResult(completed);
          setSessionOutputs((current) => [completed, ...current].slice(0, 4));
          setStatus("complete");
          setRunningMode(null);
          setRunStartedAt(null);
          setElapsedSeconds(estimatedTotalSeconds);
          const nextSeed = createSeed();
          setSeed(nextSeed);
          return;
        }
        const serialized = JSON.stringify(entry ?? "");
        if (/execution_error|error/i.test(serialized)) {
          throw new Error(comfyRuntimeError(entry) || "ComfyUI reported an error while running this workflow.");
        }
      }
      throw new Error("Generation timed out before an output was returned.");
    } catch (caught) {
      setStatus("error");
      setRunningMode(null);
      setRunStartedAt(null);
      const rawMessage = caught instanceof Error ? caught.message : "Something went wrong.";
      const message = friendlyRuntimeError(rawMessage);
      if (/PhotoReal model pack is stale|size mismatch|copying a param with shape/i.test(rawMessage) || /PhotoReal model pack is stale/i.test(message)) {
        setRepairAction((current) => current ?? { packId: "photoreal-models", label: "Repair PhotoReal Pack" });
      }
      let bridgeIsOnline = false;
      for (let attempt = 0; attempt < 2 && !bridgeIsOnline; attempt += 1) {
        try {
          const response = await bridgeRequest("/api/comfy?path=/system_stats", bridgeUrl, bridgeToken, { cache: "no-store" });
          bridgeIsOnline = response.ok;
        } catch {
          if (attempt === 0) await sleep(500);
        }
      }
      setComfyOnline(bridgeIsOnline);
      if (bridgeIsOnline) {
        bridgeHealthFailuresRef.current = 0;
        setError(message);
      } else {
        setError("The Shadowframe Bridge is unreachable. Start the launcher and reconnect.");
        setConnectionOpen(true);
      }
    }
  };

  const cancelGeneration = async () => {
    runTokenRef.current += 1;
    await bridgeRequest("/api/comfy?path=/interrupt", bridgeUrl, bridgeToken, { method: "POST" }).catch(() => undefined);
    setStatus("idle");
    setRunningMode(null);
    setRunStartedAt(null);
    setElapsedSeconds(0);
    setError("");
    setRepairAction(null);
    setRepairMessage("");
  };

  const repairPhotoRealPack = async () => {
    if (!repairAction || repairingPack) return;
    setRepairingPack(true);
    setRepairMessage("Repairing PhotoReal locally. Large model files can take a few minutes.");
    try {
      const response = await bridgeRequest("/api/repair-pack", bridgeUrl, bridgeToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId: repairAction.packId }),
      });
      const payload = (await response.json().catch(() => ({}))) as { message?: string; error?: string };
      if (!response.ok) throw new Error(payload.error || "PhotoReal repair failed.");
      setRepairMessage(payload.message || "PhotoReal was repaired. Try the RedCraft generation again.");
      setRepairAction(null);
      setError("");
      setStatus("idle");
      const health = await bridgeRequest("/api/comfy?path=/system_stats", bridgeUrl, bridgeToken, { cache: "no-store" }).catch(() => null);
      setComfyOnline(Boolean(health?.ok));
    } catch (caught) {
      setRepairMessage("");
      setError(caught instanceof Error ? caught.message : "PhotoReal repair failed.");
    } finally {
      setRepairingPack(false);
    }
  };

  if (showSplash) {
    return (
      <main className="splash-shell">
        <header className="splash-nav">
          <a className="brand" href="#top" aria-label="Shadowframe AI home">
            <img className="brand-mark-image" src="/brand/logo-mark-64.png" alt="" aria-hidden="true" />
            <span>SHADOWFRAME AI</span>
          </a>
        </header>

        <section className="splash-hero" id="top">
          <div className="splash-copy">
            <p className="splash-kicker"><span /> Private, local AI creation</p>
            <h1>Turn imagination<br />into <em>motion.</em></h1>
            <p className="splash-lede">Create striking images and cinematic video with powerful local models, your own prompts, and no cloud rendering queue.</p>
            <div className="splash-actions">
              <button className="splash-primary" type="button" onClick={enterGenerator}>Generate Now <ArrowRight size={18} /></button>
              <span><LockKeyhole size={14} /> Your work stays on your PC</span>
            </div>
          </div>

          <div className="splash-gallery" aria-label="Featured Shadowframe models">
            <article className="splash-model splash-model-main">
              <img src="/models/anima.jpg" alt="Red editorial portrait featured for Anima" />
              <div><span>IMAGE MODEL</span><strong>Anima</strong><small>High-detail illustration</small></div>
            </article>
            <article className="splash-model splash-model-top">
              <img src="/models/wai-anima.jpg" alt="Cinematic red roses featured for WAI-ANIMA" />
              <div><span>IMAGE MODEL</span><strong>WAI-ANIMA</strong></div>
            </article>
            <article className="splash-model splash-model-bottom">
              <img src="/models/wan22.jpg" alt="Orange horror-fashion portrait featured for Wan 2.2" />
              <div><span>VIDEO MODEL</span><strong>Wan 2.2</strong></div>
            </article>
          </div>
        </section>

        <section className="splash-feature-row" aria-label="Shadowframe features">
            <div><Sparkles size={19} /><span><strong>{IS_PUBLIC_RELEASE ? "Curated creative tools" : "Four creative modes"}</strong><small>{IS_PUBLIC_RELEASE ? "Guided local generation" : "Text and image generation"}</small></span></div>
            <div><Cpu size={19} /><span><strong>Local GPU power</strong><small>Runs through your ComfyUI</small></span></div>
            <div><LockKeyhole size={19} /><span><strong>Private by design</strong><small>Inputs remain on your machine</small></span></div>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand brand-button" type="button" onClick={() => setShowSplash(true)} aria-label="Return to Shadowframe AI home">
          <img className="brand-mark-image" src="/brand/logo-mark-64.png" alt="" aria-hidden="true" />
          <span>SHADOWFRAME AI</span>
        </button>
        <nav className="mode-switcher" aria-label={IS_PUBLIC_RELEASE ? "Creative tools" : "Generation mode"}>
          {visibleModes.map((modeId) => (
            <button key={modeId} className={`mode-button ${mode === modeId ? "active" : ""}`} type="button" onClick={() => selectMode(modeId)}>
              {modeIcon(modeId)}
              {IS_PUBLIC_RELEASE ? PUBLIC_TOOL_DESCRIPTORS[modeId].label : CREATOR_MODE_LABELS[modeId]}
            </button>
          ))}
        </nav>
        <button className={`connection ${comfyOnline ? "online" : "offline"}`} type="button" onClick={() => { setConnectionError(""); setConnectionOpen(true); }}>
          {comfyOnline ? <Wifi size={15} /> : <WifiOff size={15} />}
          <span>{comfyOnline === null ? "Checking bridge" : comfyOnline ? "ComfyUI connected" : bridgeUrl ? "Bridge offline" : "Connect bridge"}</span>
        </button>
      </header>

      {connectionOpen && (
        <div className="connection-backdrop" role="presentation">
          <section className="connection-dialog" role="dialog" aria-modal="true" aria-labelledby="bridge-title">
            <span className="dialog-icon"><KeyRound size={21} /></span>
            <p className="eyebrow">Private GPU connection</p>
            <h2 id="bridge-title">Connect Shadowframe Bridge</h2>
            <p className="dialog-copy">Enter the private access key shared by the PC owner. The permanent Shadowframe bridge address is already filled in.</p>
            <label>Bridge address<input type="url" value={bridgeUrlInput} placeholder={DEFAULT_BRIDGE_URL} onChange={(event) => setBridgeUrlInput(event.target.value)} /></label>
            <label>Private access key<input type="password" value={bridgeTokenInput} autoComplete="off" placeholder="Enter your private access key" onChange={(event) => setBridgeTokenInput(event.target.value)} /></label>
            {connectionError && <div className="connection-error">{connectionError}</div>}
            <button className="connect-button" type="button" disabled={connectionTesting} onClick={saveBridgeConnection}>
              {connectionTesting ? <><LoaderCircle className="spinner" size={16} /> Testing connection</> : <><Wifi size={16} /> Save and connect</>}
            </button>
            <small>The key works like a password. It is kept only in this browser session and is never saved to GitHub.</small>
          </section>
        </div>
      )}

      {repairAction && (
        <div className="repair-backdrop" role="presentation">
          <section className="repair-dialog" role="dialog" aria-modal="true" aria-labelledby="repair-title">
            <span className="dialog-icon"><RotateCcw size={21} /></span>
            <p className="eyebrow">Self repair available</p>
            <h2 id="repair-title">Repair PhotoReal Pack</h2>
            <p>RedCraft hit a model/runtime mismatch. Shadowframe can rerun the PhotoReal model-pack repair locally using the package it was installed from.</p>
            {repairMessage && <div className="repair-status">{repairMessage}</div>}
            <div className="repair-actions">
              <button type="button" onClick={repairPhotoRealPack} disabled={repairingPack}>
                {repairingPack ? <><LoaderCircle className="spinner" size={16} /> Repairing…</> : <><RotateCcw size={16} /> {repairAction.label}</>}
              </button>
              <button type="button" className="secondary" onClick={() => setRepairAction(null)} disabled={repairingPack}>Not now</button>
            </div>
          </section>
        </div>
      )}

      {sliderDialogStyle?.slider && (
        <div className="slider-backdrop" role="presentation" onClick={() => setSliderDialogStyleId("")}>
          <section className="slider-dialog" role="dialog" aria-modal="true" aria-labelledby="slider-title" onClick={(event) => event.stopPropagation()}>
            <p className="eyebrow">Slider LoRA</p>
            <h2 id="slider-title">{sliderDialogStyle.slider.label}</h2>
            <p>{sliderDialogStyle.description}</p>
            <div className="slider-options">
              {sliderDialogStyle.slider.options.map((option) => (
                <button
                  key={option.id}
                  className={sliderSelections[sliderDialogStyle.id] === option.id ? "selected" : ""}
                  type="button"
                  onClick={() => {
                    setSliderSelections((current) => ({ ...current, [sliderDialogStyle.id]: option.id }));
                    setSliderDialogStyleId("");
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      <section className="workspace">
        <aside className="control-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Create</p>
              <h1>{IS_PUBLIC_RELEASE ? currentTool.title : mode === "txt-img" ? "Turn words into an image" : mode === "img-img" ? "Transform a source image" : mode === "outfit" ? "Replace outfit only" : mode === "txt-vid" ? "Turn words into motion" : "Bring a still image to life"}</h1>
              {IS_PUBLIC_RELEASE && <p className="tool-summary">{currentTool.description}</p>}
            </div>
            <Film size={22} />
          </div>

          {IS_PUBLIC_RELEASE && (
            <section className="public-tool-guide" aria-label={`${currentTool.label} guide`}>
              <div className="public-tool-guide-header">
                <strong>{currentTool.label}</strong>
                <span>Public release tool</span>
              </div>
              <ul>
                {currentTool.summaryPoints.map((point) => <li key={point}>{point}</li>)}
              </ul>
            </section>
          )}

          {requiresImage && <>
            <input ref={fileInputRef} className="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={onFileInput} />
            {isOutfitMode && <label className="field-label">{IS_PUBLIC_RELEASE ? publicSourceLabel : "Source model photo"} <span>Required</span></label>}
            {IS_PUBLIC_RELEASE && <p className="field-helper">{publicSourceHint}</p>}
            <button
            className={`dropzone ${dragging ? "dragging" : ""} ${imagePreview ? "has-image" : ""}`}
            type="button"
            onClick={() => fileInputRef.current?.click()}
            onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => onDrop(event)}
          >
            {imagePreview ? (
              <>
                <img src={imagePreview} alt="Selected source" />
                <span className="replace-label"><RotateCcw size={14} /> Replace image</span>
              </>
            ) : (
              <>
                <span className="upload-icon"><UploadCloud size={23} /></span>
                <strong>Drop your image here</strong>
                <small>or click to browse · JPG, PNG, WebP</small>
              </>
            )}
            </button>
            {imagePreview && <button className="clear-image" type="button" onClick={resetImage}><X size={14} /> Remove</button>}
          </>}

          {isOutfitMode && <>
            <input ref={garmentInputRef} className="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={onGarmentInput} />
            <label className="field-label">{IS_PUBLIC_RELEASE ? publicGarmentLabel : "Outfit reference"} <span>Required</span></label>
            {IS_PUBLIC_RELEASE && <p className="field-helper">{publicGarmentHint}</p>}
            <button
              className={`dropzone ${garmentPreview ? "has-image" : ""}`}
              type="button"
              onClick={() => garmentInputRef.current?.click()}
              onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => onDrop(event, "garment")}
            >
              {garmentPreview ? (
                <>
                  <img src={garmentPreview} alt="Selected outfit reference" />
                  <span className="replace-label"><RotateCcw size={14} /> Replace outfit</span>
                </>
              ) : (
                <>
                  <span className="upload-icon"><UploadCloud size={23} /></span>
                  <strong>Drop outfit render here</strong>
                  <small>the garment to transfer · JPG, PNG, WebP</small>
                </>
              )}
            </button>
            {garmentPreview && <button className="clear-image" type="button" onClick={resetGarmentImage}><X size={14} /> Remove</button>}
          </>}

          {!isOutfitMode && <>
            <label className="field-label" htmlFor="positive-prompt">{IS_PUBLIC_RELEASE ? publicPromptLabel : "Positive prompt"} <span>Required</span></label>
            {IS_PUBLIC_RELEASE && <p className="field-helper">{publicPromptHint}</p>}
            <div className="prompt-wrap">
              <textarea
                id="positive-prompt"
                value={positivePrompt}
                onChange={(event) => setPositivePrompt(event.target.value)}
                placeholder={IS_PUBLIC_RELEASE
                  ? publicPromptPlaceholder
                  : createsVideo
                    ? "Describe the motion, camera, lighting, and final look…"
                    : mode === "img-img"
                      ? "Describe exactly how the source image should change…"
                      : "Describe the subject, composition, lighting, and final look…"}
                maxLength={2000}
              />
              <small>{positivePrompt.length}/2000</small>
            </div>

            {!IS_PUBLIC_RELEASE && <>
              <label className="field-label" htmlFor="negative-prompt">Negative prompt</label>
              <div className="prompt-wrap compact">
                <textarea id="negative-prompt" value={negativePrompt} onChange={(event) => setNegativePrompt(event.target.value)} maxLength={2000} />
                <small>{negativePrompt.length}/2000</small>
              </div>
              <p className="content-policy">Adult content is supported. Minors, sexual violence or coercion, and sexual content involving animals are prohibited.</p>
            </>}
            {IS_PUBLIC_RELEASE && <p className="content-policy">Public Shadowframe is SFW only. Unsafe text, unsafe uploads, and explicit content requests are blocked.</p>}
          </>}

          {!IS_PUBLIC_RELEASE && <>
            <label className="field-label" htmlFor="base-model">Base model</label>
            <select className="base-model-select" id="base-model" value={baseModelId} onChange={(event) => selectBaseModel(event.target.value)}>
              {availableBaseModels.map((model) => <option key={model.id} value={model.id}>{model.name}{model.ready ? "" : " · setup required"}</option>)}
            </select>

            <div className="style-heading">
              <label>Visual style</label>
              <span>{selectedBaseModel.name}</span>
            </div>
            <div className="style-strip">
              {availableStyles.map((style) => (
                <button
                  key={style.id}
                  className={`style-option ${(style.id === "original" ? selectedStyleIds.length === 0 : selectedStyleIds.includes(style.id)) ? "selected" : ""}`}
                  type="button"
                  data-description={style.description || `${style.name} LoRA for ${selectedBaseModel.name}.`}
                  onClick={() => toggleStyle(style)}
                >
                  <i style={{ background: style.swatch }} />
                  <strong>{style.name}</strong>
                  {style.id !== "original" && <small>{!style.file || installedLoras.some((name) => name.replaceAll("\\", "/").endsWith(style.file as string)) ? "LoRA" : "Setup"}</small>}
                </button>
              ))}
            </div>
            {selectedStyles.length > 0 && (
              <div className="style-note">
                <span>{selectedStylesInstalled ? `${selectedStyles.length} LoRA${selectedStyles.length === 1 ? "" : "s"} selected for ${selectedBaseModel.name}` : "One or more selected LoRAs needs setup"}</span>
              </div>
            )}
          </>}

          {IS_PUBLIC_RELEASE && (
            <div className="style-note public-tool-note">
              <span>Locked workflow: {selectedBaseModel.name}{selectedStyles.length ? ` · ${selectedStyles.map((style) => style.name).join(", ")}` : ""}</span>
            </div>
          )}

          <button className={`advanced-toggle ${advancedOpen ? "open" : ""}`} type="button" onClick={() => setAdvancedOpen((open) => !open)}>
            <span><SlidersHorizontal size={16} /> Advanced settings</span>
            <ChevronDown size={17} />
          </button>

          {advancedOpen && (
            <div className="advanced-grid">
              {(mode !== "img-img" || IS_PUBLIC_RELEASE) && (
                <div className="aspect-section">
                  <span>Aspect ratio</span>
                  <div className="aspect-buttons">
                    {ASPECT_PRESETS.map((preset) => <button key={preset.label} className={aspectLabel === preset.label ? "selected" : ""} type="button" onClick={() => applyAspectRatio(preset)}>{preset.label}</button>)}
                  </div>
                </div>
              )}
              {!IS_PUBLIC_RELEASE && mode !== "img-img" && !isOutfitMode && <>
                <div className="advanced-subheading">Custom Resolution</div>
                <label>Width<input type="number" value={width} step={16} min={256} max={1536} onChange={(event) => setWidth(Number(event.target.value))} /></label>
                <label>Height<input type="number" value={height} step={16} min={256} max={1536} onChange={(event) => setHeight(Number(event.target.value))} /></label>
              </>}
              {(mode === "img-img" || isOutfitMode) && (
                <label>Reference fidelity
                  <select value={referenceFidelity} onChange={(event) => setReferenceFidelity(event.target.value as ReferenceFidelity)}>
                    <option value="high">High — closest match</option>
                    <option value="balanced">Balanced — recommended</option>
                    <option value="creative">Creative — more freedom</option>
                  </select>
                </label>
              )}
              {createsVideo ? <label>Frames<input type="number" value={length} step={4} min={17} max={241} onChange={(event) => setLength(Number(event.target.value))} /></label> : !isOutfitMode && !IS_PUBLIC_RELEASE && (
                <label>Output scale<select value={hiresScale} onChange={(event) => setHiresScale(Number(event.target.value))}><option value={1}>1× original</option>{isAnimaBase ? <option value={1.5}>1.5× recommended</option> : <><option value={2}>2× high-res</option><option value={4}>4× ultra-res</option></>}</select></label>
              )}
              {!IS_PUBLIC_RELEASE && <label>Seed<input type="number" value={seed} min={0} onChange={(event) => setSeed(Number(event.target.value))} /></label>}
              {!IS_PUBLIC_RELEASE && createsVideo && <button className={`fast-toggle ${fastMode ? "enabled" : ""}`} type="button" onClick={() => setFastMode((enabled) => !enabled)}>
                <span><Sparkles size={15} /> Fast 4-step mode</span><i />
              </button>}
            </div>
          )}

          {error && <div className="error-message">{error}{repairAction && <button type="button" onClick={repairPhotoRealPack} disabled={repairingPack}>{repairingPack ? "Repairing…" : repairAction.label}</button>}</div>}
          {repairMessage && !repairAction && <div className="repair-message">{repairMessage}</div>}

          <button className="generate-button" type="button" onClick={isRunning ? cancelGeneration : generate}>
            {isRunning ? <><X size={18} /> Cancel generation</> : !comfyOnline ? <><WifiOff size={18} /> Connect bridge</> : <><Play size={18} fill="currentColor" /> Generate {createsVideo ? "video" : "image"}</>}
          </button>
        </aside>

        <section className="stage-panel">
          <div className="stage-toolbar">
            <div>
              <span className="live-dot" />
              <span>{statusCopy[status]}</span>
            </div>
            <div className="stage-tags">
              {IS_PUBLIC_RELEASE
                ? publicStageTags.map((tag) => <span key={tag}>{tag}</span>)
                : <><span>{aspectLabel}</span>{createsVideo ? <><span>{length} frames</span><span>{fastMode ? "4-step" : "20-step"}</span></> : isOutfitMode ? <><span>strict swap</span><span>source aligned</span></> : <><span>{hiresScale}× output</span><span>{mode === "txt-img" ? "12-step" : "40-step"}</span></>}</>}
            </div>
          </div>

          <div className={`media-stage ${!imagePreview && !result ? "empty" : ""}`}>
            {result ? (
              result.kind === "video" ? <video key={result.url} src={result.url} controls autoPlay playsInline /> : <img key={result.url} src={result.url} alt="Generated result" />
            ) : imagePreview ? (
              <img src={imagePreview} alt="Source preview" />
            ) : (
              <div className="empty-stage">
                <span>{createsVideo ? <Video size={34} /> : <ImageIcon size={34} />}</span>
                <h2>{IS_PUBLIC_RELEASE ? currentTool.stageTitle : `Your ${createsVideo ? "video" : "image"} will appear here`}</h2>
                <p>{IS_PUBLIC_RELEASE ? currentTool.stageHint : isOutfitMode ? "Add a source photo and outfit reference to begin." : requiresImage ? "Add an image and prompt to begin." : "Add a prompt to begin."}</p>
              </div>
            )}

            {isRunning && !generationAwayFromTab && (
              <div className="generation-overlay">
                <LoaderCircle className="spinner" size={34} />
                <strong>{statusCopy[status]}</strong>
                <span>{selectedBaseModel.name} is processing your request</span>
                <div className="progress-track"><i style={{ width: `${progress}%` }} /></div>
                <div className="progress-meta">
                  <span>{Math.round(progress)}% complete</span>
                  <span>{remainingSeconds > 0 ? `Est. ${formatRemaining(remainingSeconds)} remaining` : "Finishing up…"}</span>
                </div>
              </div>
            )}
          </div>

          <div className="stage-footer">
            <div>
              <strong>{result ? result.filename : IS_PUBLIC_RELEASE ? currentTool.label : "Output preview"}</strong>
              <span>{result ? (result.kind === "video" ? "MP4 · H.264" : "High-resolution image") : IS_PUBLIC_RELEASE ? currentTool.outputHint : createsVideo ? "Video · 720 × 1280 default" : isOutfitMode ? "Strict wardrobe replacement" : `Image · ${width * hiresScale} × ${height * hiresScale} target`}</span>
            </div>
            {result ? (
              <a className="download-button" href={result.url} download={result.filename}><Download size={17} /> Download {createsVideo ? "video" : "image"}</a>
            ) : (
              <button className="download-button disabled" type="button" disabled><Download size={17} /> Download {createsVideo ? "video" : "image"}</button>
            )}
          </div>
        </section>

        <aside className="activity-panel">
          <div className="activity-heading"><div><p className="eyebrow">{IS_PUBLIC_RELEASE ? "Tool details" : "Session"}</p><h2>{IS_PUBLIC_RELEASE ? `${currentTool.label} history` : "Recent generations"}</h2></div><Clock3 size={20} /></div>

          {IS_PUBLIC_RELEASE && (
            <div className="public-tool-brief">
              <strong>How this tool works</strong>
              <p>{currentTool.description}</p>
              <div className="public-tool-brief-grid">
                <span>{publicInputType}</span>
                <span>{publicOutputType}</span>
                <span>SFW only</span>
              </div>
            </div>
          )}

          <div className="recent-strip">
            {generationAwayFromTab && (
              <div className="running-card">
                <LoaderCircle className="spinner" size={18} />
                <strong>{statusCopy[status]}</strong>
                <span>{Math.round(progress)}% · {runningMode?.replace("-", " → ")}</span>
                <div className="progress-track mini"><i style={{ width: `${progress}%` }} /></div>
              </div>
            )}
            {sessionOutputs.length ? sessionOutputs.map((output, index) => (
              <button key={output.id} className={`recent-card ${result?.id === output.id ? "selected" : ""}`} type="button" onClick={() => setResult(output)}>
                {output.kind === "video" ? <video src={output.url} muted preload="metadata" /> : <img src={output.url} alt="Generated thumbnail" />}
                <span>0{index + 1}</span>
              </button>
            )) : (
              <div className="empty-history">
                {createsVideo ? <Video size={25} /> : <ImageIcon size={25} />}
                <strong>{IS_PUBLIC_RELEASE ? currentTool.historyEmptyTitle : "No generations yet"}</strong>
                <span>{IS_PUBLIC_RELEASE ? currentTool.historyEmptyHint : "Your latest creations will collect here."}</span>
              </div>
            )}
          </div>
        </aside>
      </section>
    </main>
  );
}
