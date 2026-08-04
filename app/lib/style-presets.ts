export type GeneratorMode = "txt-img" | "img-img" | "img-vid" | "txt-vid";

export type StylePreset = {
  id: string;
  name: string;
  modes: GeneratorMode[];
  baseModelIds: string[];
  engine: string;
  trigger?: string;
  hiddenPrompt?: string;
  file?: string;
  strength?: number;
  source?: string;
  swatch: string;
};

export type BaseModelPreset = {
  id: string;
  name: string;
  modes: GeneratorMode[];
  ready: boolean;
};

export const BASE_MODELS: BaseModelPreset[] = [
  { id: "wai-anima", name: "WAI-ANIMA v1.0", modes: ["txt-img", "img-img"], ready: true },
  { id: "anima-aesthetic", name: "Anima Aesthetic v1.1", modes: ["txt-img", "img-img"], ready: true },
  { id: "wan22-i2v", name: "Wan 2.2 I2V-A14B", modes: ["img-vid"], ready: true },
  { id: "wan22-t2v", name: "Wan 2.2 T2V 14B", modes: ["txt-vid"], ready: true },
  { id: "wan21-t2v", name: "Wan 2.1 T2V 14B", modes: ["txt-vid"], ready: false },
];

export const DEFAULT_BASE_MODEL: Record<GeneratorMode, string> = {
  "txt-img": "anima-aesthetic",
  "img-img": "anima-aesthetic",
  "img-vid": "wan22-i2v",
  "txt-vid": "wan22-t2v",
};

const ANIMA_IMAGE_MODES: GeneratorMode[] = ["txt-img", "img-img"];
const ANIMA_BASES = ["anima-aesthetic", "wai-anima"];

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: "original",
    name: "Original",
    modes: ["txt-img", "img-img", "img-vid", "txt-vid"],
    baseModelIds: [],
    engine: "No LoRA",
    swatch: "linear-gradient(145deg, #ff9b54, #8b2808 70%, #24110a)",
  },
  {
    id: "wan22-2d",
    name: "2D Animation",
    modes: ["img-vid"],
    baseModelIds: ["wan22-i2v"],
    engine: "Wan 2.2 I2V-A14B",
    trigger: "2D animation effects",
    source: "https://civitai.com/models/1920897",
    swatch: "linear-gradient(145deg, #f8d849, #f06543 48%, #6846d7)",
  },
  {
    id: "ghibli",
    name: "Storybook Anime",
    modes: ["txt-vid"],
    baseModelIds: ["wan21-t2v"],
    engine: "Wan 2.1 T2V 14B",
    trigger: "Studio Ghibli style",
    file: "studio-ghibli-wan2.1-t2v-14b.safetensors",
    source: "https://huggingface.co/Muapi/studio-ghibli-wan2.1-t2v-14b",
    swatch: "linear-gradient(145deg, #8fd1aa, #70a9d2 55%, #f3d487)",
  },
  {
    id: "anima-xipa", name: "Xipa", modes: ANIMA_IMAGE_MODES, baseModelIds: ANIMA_BASES,
    engine: "Anima", trigger: "@xipa2026late03-05", file: "Anima_Xipa_Style_v2.safetensors", strength: 1,
    source: "https://civitai.red/models/2487573/xipa-style-anima?modelVersionId=3179330",
    swatch: "linear-gradient(145deg, #7fd0ff, #6a71de 52%, #f39bc4)",
  },
  {
    id: "anima-niji", name: "Niji", modes: ANIMA_IMAGE_MODES, baseModelIds: ANIMA_BASES,
    engine: "Anima", trigger: "@NJSW33T", file: "Anima_Niji_Sweet_Spot_v4.safetensors", strength: 1,
    source: "https://civitai.red/models/2554999/niji-sweet-spot?modelVersionId=3040615",
    swatch: "linear-gradient(145deg, #ffcf6d, #ec75aa 52%, #775ed9)",
  },
  {
    id: "anima-busoft", name: "Soft Anime", modes: ANIMA_IMAGE_MODES, baseModelIds: ANIMA_BASES,
    engine: "Anima", trigger: "@BuSoft3", file: "Anima_BuAnime_Soft_v3.safetensors", strength: 1,
    source: "https://civitai.red/models/2645819/buanime-nsfw-style-pack-anima?modelVersionId=3178787",
    swatch: "linear-gradient(145deg, #ffb7aa, #e26f8e 55%, #754b8c)",
  },
  {
    id: "anima-deepthroat", name: "Deepthroat", modes: ANIMA_IMAGE_MODES, baseModelIds: ANIMA_BASES,
    engine: "Anima", trigger: "fellatio", file: "Anima_Deepthroat_Slider.safetensors", strength: 1,
    source: "https://civitai.red/models/2535814/deepthroat-slider?modelVersionId=3059807",
    swatch: "linear-gradient(145deg, #e7a1ba, #a63d68 58%, #3c1e3f)",
  },
  {
    id: "anima-suuru", name: "Suuru", modes: ANIMA_IMAGE_MODES, baseModelIds: ANIMA_BASES,
    engine: "Anima", trigger: "@suurusstyle2", file: "Anima_Suuru_Style_v1.safetensors", strength: 1,
    source: "https://civitai.red/models/2420817/suuru-or-style?modelVersionId=3125420",
    swatch: "linear-gradient(145deg, #f2e6d1, #bb8b69 52%, #4e536b)",
  },
  {
    id: "anima-linelore", name: "Line Art", modes: ANIMA_IMAGE_MODES, baseModelIds: ANIMA_BASES,
    engine: "Anima", trigger: "LineLore, hshiart", file: "Anima_LineLore_v1.safetensors", strength: 1,
    source: "https://civitai.red/models/1175632/hs-style-gallery?modelVersionId=3010462",
    swatch: "linear-gradient(145deg, #f0eee7 0 42%, #555 43% 58%, #171719 59%)",
  },
  {
    id: "anima-microdetails", name: "Micro Detail", modes: ANIMA_IMAGE_MODES, baseModelIds: ANIMA_BASES,
    engine: "Anima", trigger: "addmicrodetails", file: "Anima_Micro_Details_v1.safetensors", strength: 1,
    source: "https://civitai.red/models/1377820/add-micro-details-concept-illustrious-or-pony-or-noobai?modelVersionId=3128378",
    swatch: "linear-gradient(145deg, #e6c48d, #6b8da4 50%, #263748)",
  },
  {
    id: "anima-queue", name: "Sex Queue", modes: ANIMA_IMAGE_MODES, baseModelIds: ANIMA_BASES,
    engine: "Anima", trigger: "Queue_sexV3", file: "Anima_Queue_Sex_v3.safetensors", strength: 1,
    source: "https://civitai.red/models/2754154/queue-sex-v3?modelVersionId=3098764",
    swatch: "linear-gradient(145deg, #d0a1bd, #80546f 52%, #302737)",
  },
  {
    id: "anima-puffy", name: "Puffy Pussy", modes: ANIMA_IMAGE_MODES, baseModelIds: ANIMA_BASES,
    engine: "Anima", trigger: "pussy, covered pussy", file: "Anima_Puffy_Mons_Slider.safetensors", strength: 1,
    source: "https://civitai.red/models/2536481/puffy-pussyfat-mons-slider?modelVersionId=3056382",
    swatch: "linear-gradient(145deg, #f1b7c7, #ce718d 55%, #703f60)",
  },
  {
    id: "anima-ripping", name: "Ripped Clothes", modes: ANIMA_IMAGE_MODES, baseModelIds: ANIMA_BASES,
    engine: "Anima",
    trigger: "ripping clothes by others",
    hiddenPrompt: "torn clothing, ripped open fabric, shredded outfit, damaged clothes, fabric pulled apart, visible tears and holes in the clothing",
    file: "Anima_Ripping_Clothes_v1.safetensors",
    strength: 1.25,
    source: "https://civitai.red/models/2762116/ripping-clothes-anima?modelVersionId=3108593",
    swatch: "linear-gradient(145deg, #8d9eb2, #514d61 52%, #cc6b4e)",
  },
];
