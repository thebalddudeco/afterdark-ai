import workflowTemplate from "../../lib/workflow-template.json";
import textVideoWorkflowTemplate from "../../lib/txt-video-workflow.json";
import animaImageWorkflowTemplate from "../../lib/anima-image-workflow.json";
import animaImageEditWorkflowTemplate from "../../lib/anima-img-image-workflow.json";
import { STYLE_PRESETS } from "../../lib/style-presets";
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

function prohibitedPromptReason(prompt: string) {
  if (CHILD_CONTENT.test(prompt)) return "Content involving minors is not permitted.";
  if (SEXUAL_VIOLENCE.test(prompt)) return "Sexual violence, rape, and non-consensual content are not permitted.";
  if (ANIMAL_SEXUAL_CONTENT.test(prompt)) return "Sexual content involving animals is not permitted.";
  return "";
}

function withStyleTrigger(prompt: string, trigger?: string) {
  const userPrompt = prompt.trim();
  const normalizedTrigger = trigger?.trim();
  if (!normalizedTrigger) return userPrompt;
  if (userPrompt.toLocaleLowerCase().includes(normalizedTrigger.toLocaleLowerCase())) return userPrompt;
  return `${normalizedTrigger}, ${userPrompt}`;
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
      "txt-img": ["wai-anima", "anima-aesthetic"],
      "img-img": ["wai-anima", "anima-aesthetic"],
      "img-vid": ["wan22-i2v"],
      "txt-vid": ["wan22-t2v"],
    };
    if (!supportedBaseModels[mode].includes(baseModelId)) {
      return respond({ error: "The selected base model workflow is not installed yet." }, { status: 400 });
    }
    const isWaiAnima = baseModelId === "wai-anima";
    const isAnimaFamily = (mode === "txt-img" || mode === "img-img") && (isWaiAnima || baseModelId === "anima-aesthetic");
    const selectedStyle = STYLE_PRESETS.find((style) => style.id === (body.styleId || "original"));
    if (!selectedStyle || (selectedStyle.id !== "original" && !selectedStyle.baseModelIds.includes(baseModelId))) {
      return respond({ error: "The selected LoRA is not compatible with this base model." }, { status: 400 });
    }
    if (selectedStyle.id !== "original" && !isAnimaFamily) {
      return respond({ error: "This LoRA workflow is not installed yet." }, { status: 400 });
    }
    const effectivePositivePrompt = withStyleTrigger(body.positivePrompt, selectedStyle.trigger);
    const selectedTemplate = isAnimaFamily
      ? mode === "img-img" ? animaImageEditWorkflowTemplate : animaImageWorkflowTemplate
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

    if (isAnimaFamily && mode === "img-img") {
      workflow["1"].inputs.image = body.imageName as string;
      workflow["2"].inputs.unet_name = isWaiAnima ? "waiANIMA_v10Base10.safetensors" : "anima-aesthetic-v1.1.safetensors";
      workflow["5"].inputs.text = `masterpiece, best quality, score_7, ${effectivePositivePrompt}`;
      workflow["6"].inputs.text = body.negativePrompt || "";
      workflow["8"].inputs.seed = seed;
      workflow["8"].inputs.denoise = fidelitySettings.denoise;
      workflow["10"].inputs.scale_by = hiresScale;
      workflow["11"].inputs.filename_prefix = isWaiAnima ? "image/ShadowframeAI_WAI_ANIMA_i2i" : "image/ShadowframeAI_ANIMA_i2i";
      if (selectedStyle.id !== "original" && selectedStyle.file) {
        workflow["12"] = {
          class_type: "LoraLoader",
          inputs: {
            model: ["2", 0],
            clip: ["3", 0],
            lora_name: selectedStyle.file,
            strength_model: (selectedStyle.strength ?? 1) * fidelitySettings.loraStrength,
            strength_clip: (selectedStyle.strength ?? 1) * fidelitySettings.loraStrength,
          },
        };
        workflow["5"].inputs.clip = ["12", 1];
        workflow["6"].inputs.clip = ["12", 1];
        workflow["8"].inputs.model = ["12", 0];
      }
    } else if (isAnimaFamily) {
      workflow["1"].inputs.unet_name = isWaiAnima ? "waiANIMA_v10Base10.safetensors" : "anima-aesthetic-v1.1.safetensors";
      workflow["3"].inputs.text = `masterpiece, best quality, score_7, ${effectivePositivePrompt}`;
      workflow["4"].inputs.text = body.negativePrompt || "";
      workflow["5"].inputs.width = width;
      workflow["5"].inputs.height = height;
      workflow["6"].inputs.seed = seed;
      workflow["9"].inputs.scale_by = hiresScale;
      workflow["10"].inputs.filename_prefix = isWaiAnima ? "image/ShadowframeAI_WAI_ANIMA" : "image/ShadowframeAI_ANIMA";
      if (selectedStyle.id !== "original" && selectedStyle.file) {
        workflow["11"] = {
          class_type: "LoraLoader",
          inputs: {
            model: ["1", 0],
            clip: ["2", 0],
            lora_name: selectedStyle.file,
            strength_model: selectedStyle.strength ?? 1,
            strength_clip: selectedStyle.strength ?? 1,
          },
        };
        workflow["3"].inputs.clip = ["11", 1];
        workflow["4"].inputs.clip = ["11", 1];
        workflow["6"].inputs.model = ["11", 0];
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
      return respond({ error: "ComfyUI rejected the workflow.", details: result }, { status: upstream.status });
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
