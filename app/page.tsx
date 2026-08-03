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
import type { GeneratorMode } from "./lib/style-presets";

type RunStatus = "idle" | "uploading" | "queued" | "generating" | "complete" | "error";

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

const DEFAULT_NEGATIVE =
  "watermark, text, subtitles, letterbox, pillarbox, frame, border, split screen, noise, artifacts, blur, vignette, worst quality, low quality, score_1, score_2, score_3, blurry, jpeg artifacts, sepia, low quality, worst quality, blurry, bad anatomy, extra limbs, deformed, watermark, text, signature, bareness, artifacts, copyrights name, jpeg_artifacts, scan_artifacts, bad hands, missing fingers, extra digit, fewer digits, artistic error, ye-pop, deviantart, logo, patreon logo,monochrome, greyscale,censored, mosaic censoring, 色调艳丽，过曝，静态，细节模糊不清，字幕，风格，作品，画作，画面，静止，整体发灰，最差质量，低质量，JPEG压缩残留，丑陋的，残缺的，多余的手指，画得不好的手部，画得不好的脸部，畸形的，毁容的，形态畸形的肢体，手指融合，静止不动的画面，杂乱的背景，三条腿，背景人很多，倒着走";
const DEFAULT_BRIDGE_URL = "https://bridge.shadowframe.tech";

const STATUS_COPY: Record<RunStatus, string> = {
  idle: "Ready when you are",
  uploading: "Uploading source image",
  queued: "Waiting for the GPU",
  generating: "Creating your video",
  complete: "Video ready",
  error: "Generation stopped",
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

function normalizeBridgeUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

function bridgeRequest(path: string, bridgeUrl: string, bridgeToken: string, init: RequestInit = {}) {
  const url = bridgeUrl ? new URL(path, `${bridgeUrl}/`).toString() : path;
  const headers = new Headers(init.headers);
  if (bridgeToken) headers.set("Authorization", `Bearer ${bridgeToken}`);
  return fetch(url, { ...init, headers });
}

export default function Home() {
  const [showSplash, setShowSplash] = useState(true);
  const [mode, setMode] = useState<GeneratorMode>("img-vid");
  const [baseModelId, setBaseModelId] = useState(DEFAULT_BASE_MODEL["img-vid"]);
  const [styleId, setStyleId] = useState("original");
  const [file, setFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [positivePrompt, setPositivePrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState(DEFAULT_NEGATIVE);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [width, setWidth] = useState(720);
  const [height, setHeight] = useState(1280);
  const [length, setLength] = useState(93);
  const [hiresScale, setHiresScale] = useState(2);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 900_000_000_000_000));
  const [fastMode, setFastMode] = useState(true);
  const [status, setStatus] = useState<RunStatus>("idle");
  const [error, setError] = useState("");
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
  const runTokenRef = useRef(0);

  const isRunning = ["uploading", "queued", "generating"].includes(status);
  const requiresImage = mode.startsWith("img-");
  const createsVideo = mode.endsWith("-vid");
  const availableBaseModels = BASE_MODELS.filter((model) => model.modes.includes(mode));
  const selectedBaseModel = BASE_MODELS.find((model) => model.id === baseModelId) ?? availableBaseModels[0];
  const availableStyles = STYLE_PRESETS.filter((style) => style.id === "original" || style.baseModelIds.includes(baseModelId));
  const selectedStyle = STYLE_PRESETS.find((style) => style.id === styleId) ?? STYLE_PRESETS[0];
  const isAnimaBase = baseModelId === "wai-anima" || baseModelId === "anima-aesthetic";
  const workflowArtwork = baseModelId === "anima-aesthetic"
    ? { src: "/models/anima.png", alt: "Anima model artwork" }
    : baseModelId === "wai-anima"
      ? { src: "/models/wai-anima.png", alt: "WAI-ANIMA model artwork" }
      : { src: "/models/wan22.png", alt: "Wan 2.2 model artwork" };
  const selectedStyleInstalled = !selectedStyle.file || installedLoras.some((name) => name.endsWith(selectedStyle.file as string));
  const estimatedTotalSeconds = createsVideo
    ? fastMode ? 300 : 900
    : mode === "img-img" ? 150 : isAnimaBase ? 55 : 90;
  const timeProgress = (elapsedSeconds / estimatedTotalSeconds) * 100;
  const progress = status === "uploading"
    ? Math.max(6, Math.min(18, timeProgress))
    : status === "queued"
      ? Math.max(20, Math.min(30, timeProgress))
      : status === "generating"
        ? Math.min(96, 32 + (timeProgress * 0.64))
        : status === "complete" ? 100 : 0;
  const remainingSeconds = Math.max(0, estimatedTotalSeconds - elapsedSeconds);
  const isLocalPage = typeof window !== "undefined" && ["localhost", "127.0.0.1"].includes(window.location.hostname);

  const aspectLabel = useMemo(() => {
    const divisor = (a: number, b: number): number => (b === 0 ? a : divisor(b, a % b));
    const d = divisor(width, height);
    return `${width / d}:${height / d}`;
  }, [width, height]);

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    if (!bridgeInitialized) return;
    let active = true;
    const checkComfy = async () => {
      try {
        if (!isLocalPage && (!bridgeUrl || !bridgeToken)) throw new Error("Bridge not paired");
        const response = await bridgeRequest("/api/comfy?path=/system_stats", bridgeUrl, bridgeToken, { cache: "no-store" });
        if (active) setComfyOnline(response.ok);
        if (response.ok) {
          const loraResponse = await bridgeRequest("/api/comfy?path=/models/loras", bridgeUrl, bridgeToken, { cache: "no-store" });
          if (active && loraResponse.ok) setInstalledLoras(await loraResponse.json() as string[]);
        }
      } catch {
        if (active) setComfyOnline(false);
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
    };
  }, [imagePreview]);

  useEffect(() => {
    if (!isRunning || runStartedAt === null) return;
    const updateElapsed = () => setElapsedSeconds(Math.max(0, (Date.now() - runStartedAt) / 1000));
    updateElapsed();
    const timer = window.setInterval(updateElapsed, 1000);
    return () => window.clearInterval(timer);
  }, [isRunning, runStartedAt]);

  const acceptFile = (nextFile: File) => {
    if (!nextFile.type.startsWith("image/")) {
      setError("Choose a JPG, PNG, or WebP image.");
      setStatus("error");
      return;
    }
    setFile(nextFile);
    setImagePreview(URL.createObjectURL(nextFile));
    setResult(null);
    setError("");
    setStatus("idle");
  };

  const onFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0];
    if (nextFile) acceptFile(nextFile);
  };

  const onDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setDragging(false);
    const nextFile = event.dataTransfer.files?.[0];
    if (nextFile) acceptFile(nextFile);
  };

  const resetImage = () => {
    setFile(null);
    setImagePreview("");
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
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
    setMode(nextMode);
    setBaseModelId(DEFAULT_BASE_MODEL[nextMode]);
    setStyleId("original");
    setError("");
    setStatus("idle");
    setResult(null);
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
    } else {
      setHiresScale(2);
    }
  };

  const selectBaseModel = (nextBaseModelId: string) => {
    setBaseModelId(nextBaseModelId);
    setStyleId("original");
    setResult(null);
    setError("");
    setStatus("idle");
    if (nextBaseModelId === "wai-anima" || nextBaseModelId === "anima-aesthetic") setHiresScale(1.5);
  };

  const enterGenerator = () => {
    selectMode("txt-img");
    setShowSplash(false);
    if (!isLocalPage && (!bridgeUrl || !bridgeToken)) setConnectionOpen(true);
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
    if (styleId !== "original" && !isAnimaBase) {
      setError(`${selectedStyle.name} still needs its ${selectedStyle.engine} LoRA workflow before it can generate.`);
      setStatus("error");
      return;
    }
    if (!selectedStyleInstalled) {
      setError(`${selectedStyle.name} needs ${selectedStyle.file} in ComfyUI's LoRA folder.`);
      setStatus("error");
      return;
    }
    if (requiresImage && !file) {
      setError("Drop in a source image first.");
      setStatus("error");
      return;
    }
    if (!positivePrompt.trim()) {
      setError(`Add a positive prompt describing the ${createsVideo ? "motion" : "image"} you want.`);
      setStatus("error");
      return;
    }

    const runToken = ++runTokenRef.current;
    setError("");
    setResult(null);
    setRunStartedAt(Date.now());
    setElapsedSeconds(0);

    try {
      let imageName = "";
      if (requiresImage && file) {
        setStatus("uploading");
        const uploadBody = new FormData();
        uploadBody.append("image", file);
        uploadBody.append("type", "input");
        uploadBody.append("overwrite", "true");
        const uploadResponse = await bridgeRequest("/api/comfy?path=/upload/image", bridgeUrl, bridgeToken, {
          method: "POST",
          body: uploadBody,
        });
        if (!uploadResponse.ok) throw new Error("ComfyUI could not accept the source image.");
        const uploaded = (await uploadResponse.json()) as { name: string; subfolder?: string };
        imageName = uploaded.subfolder ? `${uploaded.subfolder}/${uploaded.name}` : uploaded.name;
      }

      setStatus("queued");
      const generationResponse = await bridgeRequest("/api/generate", bridgeUrl, bridgeToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageName,
          positivePrompt: positivePrompt.trim(),
          negativePrompt: negativePrompt.trim(),
          width,
          height,
          length,
          seed,
          fastMode,
          hiresScale,
          mode,
          styleId,
          baseModelId,
        }),
      });
      const generation = (await generationResponse.json()) as { prompt_id?: string; error?: string };
      if (!generationResponse.ok || !generation.prompt_id) {
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
            prompt: positivePrompt.trim(),
          };
          setResult(completed);
          setSessionOutputs((current) => [completed, ...current].slice(0, 4));
          setStatus("complete");
          setRunStartedAt(null);
          setElapsedSeconds(estimatedTotalSeconds);
          setSeed(Math.floor(Math.random() * 900_000_000_000_000));
          return;
        }
        const serialized = JSON.stringify(entry ?? "");
        if (/execution_error|error/i.test(serialized)) {
          throw new Error("ComfyUI reported an error while running this workflow.");
        }
      }
      throw new Error("Generation timed out before an output was returned.");
    } catch (caught) {
      setStatus("error");
      setRunStartedAt(null);
      const message = caught instanceof Error ? caught.message : "Something went wrong.";
      setError(/failed to fetch/i.test(message) ? "The Shadowframe Bridge is unreachable. Start the launcher and reconnect." : message);
      setComfyOnline(false);
    }
  };

  const cancelGeneration = async () => {
    runTokenRef.current += 1;
    await bridgeRequest("/api/comfy?path=/interrupt", bridgeUrl, bridgeToken, { method: "POST" }).catch(() => undefined);
    setStatus("idle");
    setRunStartedAt(null);
    setElapsedSeconds(0);
    setError("");
  };

  if (showSplash) {
    return (
      <main className="splash-shell">
        <header className="splash-nav">
          <a className="brand" href="#top" aria-label="Shadowframe AI home">
            <span className="brand-mark">S</span>
            <span>SHADOWFRAME AI</span>
          </a>
          <button className="splash-nav-button" type="button" onClick={enterGenerator}>Open studio <ArrowRight size={15} /></button>
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
              <img src="/models/anima.png" alt="Artwork generated with Anima" />
              <div><span>IMAGE MODEL</span><strong>Anima</strong><small>High-detail illustration</small></div>
            </article>
            <article className="splash-model splash-model-top">
              <img src="/models/wai-anima.png" alt="Artwork generated with WAI-ANIMA" />
              <div><span>IMAGE MODEL</span><strong>WAI-ANIMA</strong></div>
            </article>
            <article className="splash-model splash-model-bottom">
              <img src="/models/wan22.png" alt="Artwork generated with Wan 2.2" />
              <div><span>VIDEO MODEL</span><strong>Wan 2.2</strong></div>
            </article>
          </div>
        </section>

        <section className="splash-feature-row" aria-label="Shadowframe features">
          <div><Sparkles size={19} /><span><strong>Four creative modes</strong><small>Text and image generation</small></span></div>
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
          <span className="brand-mark">S</span>
          <span>SHADOWFRAME AI</span>
        </button>
        <nav className="mode-switcher" aria-label="Generation mode">
          <button className={`mode-button ${mode === "txt-img" ? "active" : ""}`} type="button" onClick={() => selectMode("txt-img")}><Sparkles size={15} /> Text → Image</button>
          <button className={`mode-button ${mode === "img-img" ? "active" : ""}`} type="button" onClick={() => selectMode("img-img")}><ImageIcon size={15} /> Image → Image</button>
          <button className={`mode-button ${mode === "img-vid" ? "active" : ""}`} type="button" onClick={() => selectMode("img-vid")}><Video size={15} /> Image → Video</button>
          <button className={`mode-button ${mode === "txt-vid" ? "active" : ""}`} type="button" onClick={() => selectMode("txt-vid")}><Film size={15} /> Text → Video</button>
        </nav>
        <button className={`connection ${comfyOnline ? "online" : "offline"}`} type="button" onClick={() => { setConnectionError(""); setConnectionOpen(true); }}>
          {comfyOnline ? <Wifi size={15} /> : <WifiOff size={15} />}
          <span>{comfyOnline === null ? "Checking bridge" : comfyOnline ? "ComfyUI connected" : bridgeUrl ? "Bridge offline" : "Connect bridge"}</span>
        </button>
      </header>

      {connectionOpen && (
        <div className="connection-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setConnectionOpen(false); }}>
          <section className="connection-dialog" role="dialog" aria-modal="true" aria-labelledby="bridge-title">
            <button className="dialog-close" type="button" aria-label="Close bridge settings" onClick={() => setConnectionOpen(false)}><X size={17} /></button>
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

      <section className="workspace">
        <aside className="control-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Create</p>
              <h1>{mode === "txt-img" ? "Turn words into an image" : mode === "img-img" ? "Transform a source image" : mode === "txt-vid" ? "Turn words into motion" : "Bring a still image to life"}</h1>
            </div>
            <Film size={22} />
          </div>

          {requiresImage && <>
            <input ref={fileInputRef} className="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={onFileInput} />
            <button
            className={`dropzone ${dragging ? "dragging" : ""} ${imagePreview ? "has-image" : ""}`}
            type="button"
            onClick={() => fileInputRef.current?.click()}
            onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
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

          <label className="field-label" htmlFor="positive-prompt">Positive prompt <span>Required</span></label>
          <div className="prompt-wrap">
            <textarea
              id="positive-prompt"
              value={positivePrompt}
              onChange={(event) => setPositivePrompt(event.target.value)}
              placeholder={createsVideo ? "Describe the motion, camera, lighting, and final look…" : mode === "img-img" ? "Describe exactly how the source image should change…" : "Describe the subject, composition, lighting, and final look…"}
              maxLength={2000}
            />
            <small>{positivePrompt.length}/2000</small>
          </div>

          <label className="field-label" htmlFor="negative-prompt">Negative prompt</label>
          <div className="prompt-wrap compact">
            <textarea id="negative-prompt" value={negativePrompt} onChange={(event) => setNegativePrompt(event.target.value)} maxLength={2000} />
            <small>{negativePrompt.length}/2000</small>
          </div>
          <p className="content-policy">Adult content is supported. Minors, sexual violence or coercion, and sexual content involving animals are prohibited.</p>

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
              <button key={style.id} className={`style-option ${styleId === style.id ? "selected" : ""}`} type="button" onClick={() => { setStyleId(style.id); setError(""); setStatus("idle"); }}>
                <i style={{ background: style.swatch }} />
                <strong>{style.name}</strong>
                {style.id !== "original" && <small>{!style.file || installedLoras.some((name) => name.endsWith(style.file as string)) ? "LoRA" : "Setup"}</small>}
              </button>
            ))}
          </div>
          {selectedStyle.id !== "original" && (
            <div className="style-note">
              <span>{selectedStyleInstalled ? `Installed for ${selectedBaseModel.name}` : `${selectedStyle.file} required`}</span>
              {selectedStyle.source && <a href={selectedStyle.source} target="_blank" rel="noreferrer">View source</a>}
            </div>
          )}

          <button className={`advanced-toggle ${advancedOpen ? "open" : ""}`} type="button" onClick={() => setAdvancedOpen((open) => !open)}>
            <span><SlidersHorizontal size={16} /> Advanced settings</span>
            <ChevronDown size={17} />
          </button>

          {advancedOpen && (
            <div className="advanced-grid">
              {mode !== "img-img" && <>
                <label>Width<input type="number" value={width} step={16} min={256} max={1536} onChange={(event) => setWidth(Number(event.target.value))} /></label>
                <label>Height<input type="number" value={height} step={16} min={256} max={1536} onChange={(event) => setHeight(Number(event.target.value))} /></label>
              </>}
              {createsVideo ? <label>Frames<input type="number" value={length} step={4} min={17} max={241} onChange={(event) => setLength(Number(event.target.value))} /></label> : (
                <label>Output scale<select value={hiresScale} onChange={(event) => setHiresScale(Number(event.target.value))}><option value={1}>1× original</option>{isAnimaBase ? <option value={1.5}>1.5× recommended</option> : <><option value={2}>2× high-res</option><option value={4}>4× ultra-res</option></>}</select></label>
              )}
              <label>Seed<input type="number" value={seed} min={0} onChange={(event) => setSeed(Number(event.target.value))} /></label>
              {createsVideo && <button className={`fast-toggle ${fastMode ? "enabled" : ""}`} type="button" onClick={() => setFastMode((enabled) => !enabled)}>
                <span><Sparkles size={15} /> Fast 4-step mode</span><i />
              </button>}
            </div>
          )}

          {error && <div className="error-message">{error}</div>}

          <button className="generate-button" type="button" onClick={isRunning ? cancelGeneration : generate}>
            {isRunning ? <><X size={18} /> Cancel generation</> : !comfyOnline ? <><WifiOff size={18} /> Connect bridge</> : <><Play size={18} fill="currentColor" /> Generate {createsVideo ? "video" : "image"}</>}
          </button>
        </aside>

        <section className="stage-panel">
          <div className="stage-toolbar">
            <div>
              <span className="live-dot" />
              <span>{STATUS_COPY[status]}</span>
            </div>
            <div className="stage-tags"><span>{aspectLabel}</span>{createsVideo ? <><span>{length} frames</span><span>{fastMode ? "4-step" : "20-step"}</span></> : <><span>{hiresScale}× output</span><span>{mode === "txt-img" ? "12-step" : "40-step"}</span></>}</div>
          </div>

          <div className={`media-stage ${!imagePreview && !result ? "empty" : ""}`}>
            {result ? (
              result.kind === "video" ? <video key={result.url} src={result.url} controls autoPlay playsInline /> : <img key={result.url} src={result.url} alt="Generated result" />
            ) : imagePreview ? (
              <img src={imagePreview} alt="Source preview" />
            ) : (
              <div className="empty-stage">
                <span>{createsVideo ? <Video size={34} /> : <ImageIcon size={34} />}</span>
                <h2>Your {createsVideo ? "video" : "image"} will appear here</h2>
                <p>{requiresImage ? "Add an image and prompt to begin." : "Add a prompt to begin."}</p>
              </div>
            )}

            {isRunning && (
              <div className="generation-overlay">
                <LoaderCircle className="spinner" size={34} />
                <strong>{STATUS_COPY[status]}</strong>
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
            <div><strong>{result ? result.filename : "Output preview"}</strong><span>{result ? (result.kind === "video" ? "MP4 · H.264" : "High-resolution image") : createsVideo ? "Video · 720 × 1280 default" : `Image · ${width * hiresScale} × ${height * hiresScale} target`}</span></div>
            {result ? (
              <a className="download-button" href={result.url} download={result.filename}><Download size={17} /> Download {createsVideo ? "video" : "image"}</a>
            ) : (
              <button className="download-button disabled" type="button" disabled><Download size={17} /> Download {createsVideo ? "video" : "image"}</button>
            )}
          </div>
        </section>

        <aside className="activity-panel">
          <div className="activity-heading"><div><p className="eyebrow">Session</p><h2>Recent generations</h2></div><Clock3 size={20} /></div>

          <div className={`status-card status-${status}`}>
            <span className="status-icon">{isRunning ? <LoaderCircle className="spinner" size={23} /> : status === "complete" ? <Sparkles size={23} /> : <Film size={23} />}</span>
            <div><strong>{STATUS_COPY[status]}</strong><small>{isRunning ? "You can keep this window open" : status === "complete" ? "Saved by ComfyUI" : createsVideo ? "Wan video workflow" : `${selectedBaseModel.name} image workflow`}</small></div>
          </div>

          <div className="recent-grid">
            {sessionOutputs.length ? sessionOutputs.map((output, index) => (
              <button key={output.id} className={`recent-card ${result?.id === output.id ? "selected" : ""}`} type="button" onClick={() => setResult(output)}>
                {output.kind === "video" ? <video src={output.url} muted preload="metadata" /> : <img src={output.url} alt="Generated thumbnail" />}
                <span>0{index + 1}</span>
              </button>
            )) : (
              <div className="empty-history">{createsVideo ? <Video size={25} /> : <ImageIcon size={25} />}<strong>No generations yet</strong><span>Your latest creations will collect here.</span></div>
            )}
          </div>

          <div className="workflow-card">
            <div className="workflow-art"><img src={workflowArtwork.src} alt={workflowArtwork.alt} /></div>
            <div><p className="eyebrow">Workflow</p><h3>{selectedBaseModel.name}</h3><span>{createsVideo ? "High + low noise · FP8" : isAnimaBase ? "25-step · Anima · local" : mode === "txt-img" ? "12-step · FP8 · local" : "40-step · FP8 · local"}</span></div>
            <div className="workflow-specs">{createsVideo ? <><span>{width} × {height}</span><span>16 FPS</span><span>H.264</span></> : <><span>{hiresScale}× output</span><span>PNG</span><span>Local</span></>}</div>
          </div>
        </aside>
      </section>
    </main>
  );
}
