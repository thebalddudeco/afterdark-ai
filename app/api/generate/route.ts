import workflowTemplate from "../../lib/workflow-template.json";
import textVideoWorkflowTemplate from "../../lib/txt-video-workflow.json";
import ltxImageVideoWorkflowTemplate from "../../lib/ltx-img-video-workflow.json";
import animaImageWorkflowTemplate from "../../lib/anima-image-workflow.json";
import animaImageEditWorkflowTemplate from "../../lib/anima-img-image-workflow.json";
import { STYLE_PRESETS } from "../../lib/style-presets";
import type { StylePreset } from "../../lib/style-presets";
import { authorizeBridgeRequest, bridgeJson, bridgeOptions } from "../../lib/bridge-security";

const COMFYUI_URL = process.env.COMFYUI_URL || "http://127.0.0.1:8188";

type WorkflowNode = { inputs: Record<string, unknown>; class_type: string };
type Workflow = Record<string, WorkflowNode>;
type ReferenceFidelity = "high" | "balanced" | "creative";

const REFERENCE_FIDELITY: Record<ReferenceFidelity, { denoise: number; loraStrength: number }> = {
  high: { denoise: 0.35, loraStrength: 0.7 },
  balanced: { denoise: 0.5, loraStrength: 0.85 },
  creative: { denoise: 0.7, loraStrength: 1 },
};

const CHILD_CONTENT = /\b(?:child|children|kid|kids|minor|minors|underage|preteen|teenager|schoolgirl|schoolboy|toddler|infant|baby|lolicon|shotacon)\b/i;
const SEXUAL_VIOLENCE = /\b(?:rape|raped|raping|sexual assault|sexually assault|forced sex|nonconsensual|non-consensual|without consent|sexual violence|sexual coercion)\b/i;
const ANIMAL_SEXUAL_CONTENT = /\b(?:bestiality|zoophilia|zoophile|animal sex|sex with (?:an? )?(?:animal|dog|cat|horse|pony|wolf|fox|goat|sheep|cow|pig))\b/i;
const MODEL_SHAPE_MISMATCH = /size mismatch|copying a param with shape/i;
const PHOTO_REAL_REPAIR_ACTION = {
  packId: "photoreal-models",
  label: "Repair PhotoReal Pack",
};

function prohibitedPromptReason(prompt: string) {
  if (CHILD_CONTENT.test(prompt)) return "Content involving minors is not permitted.";
  if (SEXUAL_VIOLENCE.test(prompt)) return "Sexual violence, rape, and non-consensual content are not permitted.";
  if (ANIMAL_SEXUAL_CONTENT.test(prompt)) return "Sexual content involving animals is not permitted.";
  return "";
}

function withStyleTrigger(prompt: string, selectedStyles: StylePreset[], sliderSelections: Record<string, string>) {
  const userPrompt = prompt.trim();
  const styleParts = selectedStyles.flatMap((style) => {
    const selectedOptionId = sliderSelections[style.id] || style.slider?.defaultOptionId;
    const selectedOption = style.slider?.options.find((option) => option.id === selectedOptionId);
    return [style.trigger, style.hiddenPrompt, selectedOption?.prompt];
  })
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));
  if (!styleParts.length) return userPrompt;
  const normalizedUserPrompt = userPrompt.toLocaleLowerCase();
  const missingParts = styleParts.filter((part) => !normalizedUserPrompt.includes(part.toLocaleLowerCase()));
  return missingParts.length ? `${missingParts.join(", ")}, ${userPrompt}` : userPrompt;
}

async function comfyClipLoaderOptions() {
  try {
    const response = await fetch(`${COMFYUI_URL}/object_info/CLIPLoader`, { cache: "no-store" });
    if (!response.ok) return { clipNames: [] as string[], clipTypes: [] as string[] };
    const info = await response.json() as {
      CLIPLoader?: {
        input?: {
          required?: {
            clip_name?: [string[]];
            type?: [string[]];
          };
        };
      };
    };
    return {
      clipNames: info.CLIPLoader?.input?.required?.clip_name?.[0] || [],
      clipTypes: info.CLIPLoader?.input?.required?.type?.[0] || [],
    };
  } catch {
    return { clipNames: [] as string[], clipTypes: [] as string[] };
  }
}

export async function POST(request: Request) {
  const authorizationError = authorizeBridgeRequest(request);
  if (authorizationError) return authorizationError;
  const respond = (body: unknown, init?: ResponseInit) => bridgeJson(request, body, init);
  try {
    const body = await request.json() as {
      imageName?: string;
      positivePrompt?: string;
      negativePrompt?: string;
      width?: number;
      height?: number;
      length?: number;
      seed?: number;
      fastMode?: boolean;
      hiresScale?: number;
      mode?: "txt-img" | "img-img" | "img-vid" | "txt-vid";
      styleId?: string;
      styleIds?: string[];
      sliderSelections?: Record<string, string>;
      baseModelId?: string;
      referenceFidelity?: ReferenceFidelity;
    };
    const mode = body.mode || "img-vid";
    const needsImage = mode === "img-vid" || mode === "img-img";
    if (!body.positivePrompt || (needsImage && !body.imageName)) {
      return respond({ error: needsImage ? "An image and positive prompt are required." : "A positive prompt is required." }, { status: 400 });
    }
    const prohibitedReason = prohibitedPromptReason(body.positivePrompt);
    if (prohibitedReason) {
      return respond({ error: prohibitedReason }, { status: 400 });
    }

    const defaultBaseModel = mode === "txt-img" || mode === "img-img" ? "anima-aesthetic" : mode === "txt-vid" ? "wan22-t2v" : "wan22-i2v";
    const baseModelId = body.baseModelId || defaultBaseModel;
    const supportedBaseModels: Record<string, string[]> = {
      "txt-img": ["wai-anima", "anima-aesthetic", "redcraft", "moody-pro"],
      "img-img": ["wai-anima", "anima-aesthetic", "redcraft", "moody-pro"],
      "img-vid": ["wan22-i2v", "ltx23-gtanimation"],
      "txt-vid": ["wan22-t2v"],
    };
    if (!supportedBaseModels[mode].includes(baseModelId)) {
      return respond({ error: "The selected base model workflow is not installed yet." }, { status: 400 });
    }
    const isWaiAnima = baseModelId === "wai-anima";
    const isAnimaFamily = (mode === "txt-img" || mode === "img-img") && (isWaiAnima || baseModelId === "anima-aesthetic");
    const isPhotoImageFamily = (mode === "txt-img" || mode === "img-img") && (baseModelId === "redcraft" || baseModelId === "moody-pro");
    const isImageFamily = isAnimaFamily || isPhotoImageFamily;
    const isLtxImageVideo = mode === "img-vid" && baseModelId === "ltx23-gtanimation";
    const requestedStyleIds = Array.isArray(body.styleIds) ? body.styleIds : (body.styleId ? [body.styleId] : ["original"]);
    const selectedStyles = requestedStyleIds
      .filter((id) => id !== "original")
      .map((id) => STYLE_PRESETS.find((style) => style.id === id))
      .filter((style): style is StylePreset => Boolean(style));
    if (selectedStyles.length !== requestedStyleIds.filter((id) => id !== "original").length || selectedStyles.some((style) => !style.baseModelIds.includes(baseModelId))) {
      return respond({ error: "The selected LoRA is not compatible with this base model." }, { status: 400 });
    }
    if (selectedStyles.length && !isImageFamily && !isLtxImageVideo) {
      return respond({ error: "This LoRA workflow is not installed yet." }, { status: 400 });
    }
    const sliderSelections = body.sliderSelections && typeof body.sliderSelections === "object" ? body.sliderSelections : {};
    const effectivePositivePrompt = withStyleTrigger(body.positivePrompt, selectedStyles, sliderSelections);
    const loraStyles = selectedStyles.filter((style) => style.file);
    const selectedTemplate = isImageFamily
      ? mode === "img-img" ? animaImageEditWorkflowTemplate : animaImageWorkflowTemplate
      : isLtxImageVideo
        ? ltxImageVideoWorkflowTemplate
      : mode === "txt-vid"
        ? textVideoWorkflowTemplate
        : workflowTemplate;
    const workflow = JSON.parse(JSON.stringify(selectedTemplate)) as Workflow;
    const width = Math.max(256, Math.min(1536, Number(body.width) || (mode === "txt-vid" ? 640 : 720)));
    const height = Math.max(256, Math.min(1536, Number(body.height) || (mode === "txt-vid" ? 640 : 1280)));
    const length = Math.max(17, Math.min(241, Number(body.length) || (mode === "txt-vid" ? 81 : 93)));
    const seed = Math.max(0, Number(body.seed) || 0);
    const supportedScales = isAnimaFamily ? [1, 1.5] : [1, 2, 4];
    const hiresScale = supportedScales.includes(Number(body.hiresScale)) ? Number(body.hiresScale) : (isAnimaFamily ? 1.5 : 2);
    const referenceFidelity = body.referenceFidelity && body.referenceFidelity in REFERENCE_FIDELITY
      ? body.referenceFidelity
      : "balanced";
    const fidelitySettings = REFERENCE_FIDELITY[referenceFidelity];

    const photoModelName = baseModelId === "redcraft"
      ? "redcraft23INT8INT4FP8_30Krea2.safetensors"
      : "moodyRealMix_xhsEdition.safetensors";
    const imageModelName = isWaiAnima
      ? "waiANIMA_v10Base10.safetensors"
      : baseModelId === "anima-aesthetic"
        ? "anima-aesthetic-v1.1.safetensors"
        : photoModelName;
    const imageClipName = baseModelId === "redcraft"
      ? "qwen3vl_4b_fp8_scaled.safetensors"
      : isPhotoImageFamily
        ? "qwen_2.5_vl_7b_fp8_scaled.safetensors"
        : "qwen_3_06b_base.safetensors";
    const imageClipType = baseModelId === "redcraft"
      ? "krea2"
      : isPhotoImageFamily
        ? "qwen_image"
        : "stable_diffusion";
    const imagePrefix = isWaiAnima
      ? "image/ShadowframeAI_WAI_ANIMA"
      : baseModelId === "anima-aesthetic"
        ? "image/ShadowframeAI_ANIMA"
        : baseModelId === "redcraft"
          ? "image/ShadowframeAI_REDCRAFT"
          : "image/ShadowframeAI_MOODY";

    if (baseModelId === "redcraft") {
      const { clipNames, clipTypes } = await comfyClipLoaderOptions();
      if (!clipTypes.includes("krea2")) {
        return respond({
          error: "RedCraft needs Krea2 support in ComfyUI. Update the local ComfyUI runtime before using RedCraft 2/3.",
        }, { status: 409 });
      }
      if (!clipNames.includes(imageClipName)) {
        return respond({
          error: `RedCraft needs ${imageClipName} in the PhotoReal model pack.`,
          repairAction: PHOTO_REAL_REPAIR_ACTION,
        }, { status: 409 });
      }
    }

    if (isImageFamily && mode === "img-img") {
      workflow["1"].inputs.image = body.imageName as string;
      workflow["2"].inputs.unet_name = imageModelName;
      workflow["3"].inputs.clip_name = imageClipName;
      workflow["3"].inputs.type = imageClipType;
      workflow["5"].inputs.text = `masterpiece, best quality, score_7, ${effectivePositivePrompt}`;
      workflow["6"].inputs.text = body.negativePrompt || "";
      workflow["8"].inputs.seed = seed;
      workflow["8"].inputs.denoise = fidelitySettings.denoise;
      workflow["8"].inputs.cfg = isPhotoImageFamily ? 3.5 : 4.5;
      workflow["8"].inputs.sampler_name = isPhotoImageFamily ? "euler" : "er_sde";
      workflow["10"].inputs.scale_by = hiresScale;
      workflow["11"].inputs.filename_prefix = `${imagePrefix}_i2i`;
      if (loraStyles.length) {
        let currentModel: [string, number] = ["2", 0];
        let currentClip: [string, number] = ["3", 0];
        loraStyles.forEach((style, index) => {
          const nodeId = String(12 + index);
          const selectedStyleFile = style.file?.replaceAll("/", "\\") as string;
          if (isPhotoImageFamily) {
            workflow[nodeId] = {
            class_type: "LoraLoaderModelOnly",
            inputs: {
              model: currentModel,
              lora_name: selectedStyleFile,
              strength_model: (style.strength ?? 1) * fidelitySettings.loraStrength,
            },
          };
            currentModel = [nodeId, 0];
          } else {
            workflow[nodeId] = {
            class_type: "LoraLoader",
            inputs: {
              model: currentModel,
              clip: currentClip,
              lora_name: selectedStyleFile,
              strength_model: (style.strength ?? 1) * fidelitySettings.loraStrength,
              strength_clip: (style.strength ?? 1) * fidelitySettings.loraStrength,
            },
          };
            currentModel = [nodeId, 0];
            currentClip = [nodeId, 1];
          }
        });
        workflow["8"].inputs.model = currentModel;
        if (!isPhotoImageFamily) {
          workflow["5"].inputs.clip = currentClip;
          workflow["6"].inputs.clip = currentClip;
        }
      }
    } else if (isImageFamily) {
      workflow["1"].inputs.unet_name = imageModelName;
      workflow["2"].inputs.clip_name = imageClipName;
      workflow["2"].inputs.type = imageClipType;
      workflow["3"].inputs.text = `masterpiece, best quality, score_7, ${effectivePositivePrompt}`;
      workflow["4"].inputs.text = body.negativePrompt || "";
      workflow["5"].inputs.width = width;
      workflow["5"].inputs.height = height;
      workflow["6"].inputs.seed = seed;
      workflow["6"].inputs.cfg = isPhotoImageFamily ? 3.5 : 4.5;
      workflow["6"].inputs.sampler_name = isPhotoImageFamily ? "euler" : "er_sde";
      workflow["9"].inputs.scale_by = hiresScale;
      workflow["10"].inputs.filename_prefix = imagePrefix;
      if (loraStyles.length) {
        let currentModel: [string, number] = ["1", 0];
        let currentClip: [string, number] = ["2", 0];
        loraStyles.forEach((style, index) => {
          const nodeId = String(11 + index);
          const selectedStyleFile = style.file?.replaceAll("/", "\\") as string;
          if (isPhotoImageFamily) {
            workflow[nodeId] = {
            class_type: "LoraLoaderModelOnly",
            inputs: {
              model: currentModel,
              lora_name: selectedStyleFile,
              strength_model: style.strength ?? 1,
            },
          };
            currentModel = [nodeId, 0];
          } else {
            workflow[nodeId] = {
            class_type: "LoraLoader",
            inputs: {
              model: currentModel,
              clip: currentClip,
              lora_name: selectedStyleFile,
              strength_model: style.strength ?? 1,
              strength_clip: style.strength ?? 1,
            },
          };
            currentModel = [nodeId, 0];
            currentClip = [nodeId, 1];
          }
        });
        workflow["6"].inputs.model = currentModel;
        if (!isPhotoImageFamily) {
          workflow["3"].inputs.clip = currentClip;
          workflow["4"].inputs.clip = currentClip;
        }
      }
    } else if (isLtxImageVideo) {
      const ltxWidth = Math.max(256, Math.min(1536, Math.round(width / 32) * 32));
      const ltxHeight = Math.max(256, Math.min(1536, Math.round(height / 32) * 32));
      const ltxLength = Math.max(9, Math.min(241, 1 + Math.round((length - 1) / 8) * 8));
      workflow["1"].inputs.image = body.imageName as string;
      workflow["4"].inputs.text = effectivePositivePrompt;
      workflow["5"].inputs.text = body.negativePrompt || "";
      workflow["7"].inputs.width = ltxWidth;
      workflow["7"].inputs.height = ltxHeight;
      workflow["7"].inputs.length = ltxLength;
      workflow["11"].inputs.frames_number = ltxLength;
      workflow["18"].inputs.noise_seed = seed;
      workflow["24"].inputs.filename_prefix = "video/ShadowframeAI_LTX";
      workflow["24"].inputs.format = "mp4";
      workflow["24"].inputs.codec = "h264";
      if (loraStyles.length) {
        const style = loraStyles[0];
        workflow["13"].inputs.lora_name = style.file?.replaceAll("/", "\\") as string;
        workflow["13"].inputs.strength_model = style.strength ?? 1;
      }
    } else if (mode === "txt-vid") {
      workflow["89"].inputs.text = effectivePositivePrompt;
      workflow["72"].inputs.text = body.negativePrompt || "";
      workflow["74"].inputs.width = width;
      workflow["74"].inputs.height = height;
      workflow["74"].inputs.length = length;
      workflow["81"].inputs.noise_seed = seed;
      workflow["80"].inputs.filename_prefix = "video/ShadowframeAI_t2v";
      workflow["80"].inputs.format = "mp4";
      workflow["80"].inputs.codec = "h264";
    } else {
      workflow["97"].inputs.image = body.imageName as string;
      workflow["129:93"].inputs.text = effectivePositivePrompt;
      workflow["129:89"].inputs.text = body.negativePrompt || "";
      workflow["129:98"].inputs.width = width;
      workflow["129:98"].inputs.height = height;
      workflow["129:98"].inputs.length = length;
      workflow["129:86"].inputs.noise_seed = seed;
      workflow["129:131"].inputs.value = body.fastMode !== false;
      workflow["108"].inputs.filename_prefix = "video/ShadowframeAI_i2v";
    }

    const clientId = crypto.randomUUID();
    const upstream = await fetch(`${COMFYUI_URL}/prompt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: workflow, client_id: clientId }),
    });
    const result = await upstream.json() as Record<string, unknown>;
    if (!upstream.ok) {
      const detailText = JSON.stringify(result);
      const error = MODEL_SHAPE_MISMATCH.test(detailText)
        ? "The PhotoReal model pack is stale or mismatched. Shadowframe can repair it automatically."
        : "ComfyUI rejected the workflow.";
      return respond({
        error,
        repairAction: MODEL_SHAPE_MISMATCH.test(detailText) ? PHOTO_REAL_REPAIR_ACTION : undefined,
        details: result,
      }, { status: upstream.status });
    }
    return respond(result);
  } catch (error) {
    return respond(
      { error: error instanceof Error ? error.message : "Unable to start generation." },
      { status: 503 },
    );
  }
}

export async function OPTIONS(request: Request) { return bridgeOptions(request); }
