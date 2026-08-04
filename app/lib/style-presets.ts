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
  { id: "redcraft", name: "RedCraft 2/3", modes: ["txt-img", "img-img"], ready: false },
  { id: "moody-pro", name: "Moody Real Mix", modes: ["txt-img", "img-img"], ready: false },
  { id: "wan22-i2v", name: "Wan 2.2 I2V-A14B", modes: ["img-vid"], ready: true },
  { id: "ltx23-gtanimation", name: "LTX 2.3 GTAnimation", modes: ["img-vid"], ready: false },
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
const PHOTO_IMAGE_MODES: GeneratorMode[] = ["txt-img", "img-img"];
const REDCRAFT_BASES = ["redcraft"];
const MOODY_BASES = ["moody-pro"];
const LTX_VIDEO_MODES: GeneratorMode[] = ["img-vid"];
const LTX_BASES = ["ltx23-gtanimation"];

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
  {
    id: "redcraft-skin", name: "Skin Tone", modes: PHOTO_IMAGE_MODES, baseModelIds: REDCRAFT_BASES,
    engine: "RedCraft", trigger: "skin tone slider", file: "skintone_v2_krea2_loraholic.safetensors", strength: 1,
    source: "https://civitai.red/models/2540631/skin-tone-slider-krea2-zit?modelVersionId=3187970",
    swatch: "linear-gradient(145deg, #f2c2a2, #b46f55 55%, #392018)",
  },
  {
    id: "redcraft-mons", name: "Mons Pubis", modes: PHOTO_IMAGE_MODES, baseModelIds: REDCRAFT_BASES,
    engine: "RedCraft", trigger: "mons pubis slider", file: "mons_pubis_krea2_loraholic.safetensors", strength: 1,
    source: "https://civitai.red/models/2809785/mons-pubis-slider-krea2?modelVersionId=3168548",
    swatch: "linear-gradient(145deg, #edb4a6, #a05c67 58%, #362032)",
  },
  {
    id: "redcraft-grain", name: "Purple Grain", modes: PHOTO_IMAGE_MODES, baseModelIds: REDCRAFT_BASES,
    engine: "RedCraft", trigger: "purple grainy photography", hiddenPrompt: "grainy film photography, purple color grade, editorial flash photography", file: "Purple_Grainy_Kr2_AM.safetensors", strength: 1,
    source: "https://civitai.red/models/2329053/purple-grainy-oror-photography-lora?modelVersionId=3110766",
    swatch: "linear-gradient(145deg, #d09cff, #6c3d95 50%, #24142f)",
  },
  {
    id: "redcraft-pornmaster", name: "Pornmaster", modes: PHOTO_IMAGE_MODES, baseModelIds: REDCRAFT_BASES,
    engine: "RedCraft", trigger: "pornmaster asian slider", file: "PornMaster_Krea2_Asian_slider_V1.safetensors", strength: 1,
    source: "https://civitai.red/models/2756475/pornmaster-krea2-asian-slider?modelVersionId=3101650",
    swatch: "linear-gradient(145deg, #f7b06c, #bb4a2f 56%, #30100b)",
  },
  {
    id: "redcraft-poster", name: "Purple Poster", modes: PHOTO_IMAGE_MODES, baseModelIds: REDCRAFT_BASES,
    engine: "RedCraft", trigger: "purple graphics poster", hiddenPrompt: "graphic poster composition, bold purple print design, stylized editorial layout", file: "Purple_Graphics_KR2.safetensors", strength: 1,
    source: "https://civitai.red/models/2326705/purple-graphics-oror-poster-lora?modelVersionId=3113770",
    swatch: "linear-gradient(145deg, #f17cff, #7b45d8 50%, #171136)",
  },
  {
    id: "redcraft-transparent", name: "Transparent", modes: PHOTO_IMAGE_MODES, baseModelIds: REDCRAFT_BASES,
    engine: "RedCraft", trigger: "transparent clothes", hiddenPrompt: "see-through fabric, sheer clothing, transparent fabric texture", file: "transparent_clothes_krea2_v1.safetensors", strength: 1,
    source: "https://civitai.red/models/161431/transparent-clothes?modelVersionId=3106124",
    swatch: "linear-gradient(145deg, #dff7ff, #8da7be 54%, #172336)",
  },
  {
    id: "redcraft-weirdart", name: "Weird Art", modes: PHOTO_IMAGE_MODES, baseModelIds: REDCRAFT_BASES,
    engine: "RedCraft", trigger: "idontknowhowtonamethisartstyle", file: "Krea2_Cinematic_Artstyle.safetensors", strength: 1,
    source: "https://civitai.red/models/2781650/idontknowhowtonamethisartstyle?modelVersionId=3132897",
    swatch: "linear-gradient(145deg, #a6f0d8, #6a67d8 46%, #d15b8f)",
  },
  {
    id: "redcraft-body", name: "Body Retouch", modes: PHOTO_IMAGE_MODES, baseModelIds: REDCRAFT_BASES,
    engine: "RedCraft", trigger: "female body retouched", hiddenPrompt: "retouched skin, polished body detail, refined anatomy", file: "krea2_rt_v1_5_epoch_10.safetensors", strength: 1,
    source: "https://civitai.red/models/2196685/z-female-body-retouched?modelVersionId=3186931",
    swatch: "linear-gradient(145deg, #f4c9ac, #b6725c 55%, #3c251b)",
  },
  {
    id: "redcraft-breast", name: "Breast Size", modes: PHOTO_IMAGE_MODES, baseModelIds: REDCRAFT_BASES,
    engine: "RedCraft", trigger: "breast size slider", file: "breast_size_v2_krea2_loraholic.safetensors", strength: 1,
    source: "https://civitai.red/models/2540187/breast-size-slider-krea-2-zit?modelVersionId=3131773",
    swatch: "linear-gradient(145deg, #f2b5bb, #b35d75 56%, #3b1d2b)",
  },
  {
    id: "redcraft-betterpussy", name: "Better Pussy", modes: PHOTO_IMAGE_MODES, baseModelIds: REDCRAFT_BASES,
    engine: "RedCraft", trigger: "better pussy", file: "krea2_better_pussy_poses_v4.1.safetensors", strength: 1,
    source: "https://civitai.red/models/2729157/krea2-better-pussy?modelVersionId=3111211",
    swatch: "linear-gradient(145deg, #efb2c1, #b96880 54%, #432635)",
  },
  {
    id: "redcraft-asianmix", name: "AsianMix", modes: PHOTO_IMAGE_MODES, baseModelIds: REDCRAFT_BASES,
    engine: "RedCraft", trigger: "turbo asianmix", file: "hina_krea2Turbo_lora_tqd_v3.0.safetensors", strength: 1,
    source: "https://civitai.red/models/2746042/krea2-turbo-asianmix-lora?modelVersionId=3146162",
    swatch: "linear-gradient(145deg, #f5d38e, #c06135 54%, #25120c)",
  },
  {
    id: "ltx-leg-up", name: "Leg Swing Up", modes: LTX_VIDEO_MODES, baseModelIds: LTX_BASES,
    engine: "LTX 2.3", trigger: "swing up and down legs", hiddenPrompt: "legs swinging up and down motion", file: "ltx23-i2v-swing-up-down-os.safetensors", strength: 1,
    source: "https://civitai.red/models/2755595/swing-up-and-down-legs?modelVersionId=3100594",
    swatch: "linear-gradient(145deg, #f0d28c, #db6b35 55%, #341108)",
  },
  {
    id: "ltx-leg-inout", name: "Leg Swing In", modes: LTX_VIDEO_MODES, baseModelIds: LTX_BASES,
    engine: "LTX 2.3", trigger: "swing in and out legs", hiddenPrompt: "legs swinging in and out motion", file: "ltx23-i2v-swing-in-out-os.safetensors", strength: 1,
    source: "https://civitai.red/models/2755583/swing-in-and-out-legs?modelVersionId=3100573",
    swatch: "linear-gradient(145deg, #f2c67e, #a14925 55%, #2d120b)",
  },
  {
    id: "ltx-face", name: "Face Fidelity", modes: LTX_VIDEO_MODES, baseModelIds: LTX_BASES,
    engine: "LTX 2.3", trigger: "east asian facial fidelity", hiddenPrompt: "preserve facial identity, consistent facial features", file: "ltx-face-prior-f1-profile-correction-step11019.safetensors", strength: 1,
    source: "https://civitai.red/models/2816700/east-asian-facial-fidelity-or-ltx-23-i2v?modelVersionId=3176918",
    swatch: "linear-gradient(145deg, #f3cfba, #876b99 52%, #20223c)",
  },
  {
    id: "ltx-mila", name: "Mila", modes: LTX_VIDEO_MODES, baseModelIds: LTX_BASES,
    engine: "LTX 2.3", trigger: "mila", file: "mila_ltx23_lora.safetensors", strength: 1,
    source: "https://civitai.red/models/2809908/ltx-23-mila?modelVersionId=3168700",
    swatch: "linear-gradient(145deg, #ece2d4, #8d5d4d 54%, #241611)",
  },
  {
    id: "ltx-bonnie", name: "Bonnie", modes: LTX_VIDEO_MODES, baseModelIds: LTX_BASES,
    engine: "LTX 2.3", trigger: "bonnie rabbit", file: "Bonnie_Rabbit_LTX_v1.safetensors", strength: 1,
    source: "https://civitai.red/models/2451356/bonnie-rabbit?modelVersionId=2907911",
    swatch: "linear-gradient(145deg, #d5d7ff, #7c6ed0 52%, #2d254d)",
  },
  {
    id: "moody-innie", name: "Innie", modes: PHOTO_IMAGE_MODES, baseModelIds: MOODY_BASES,
    engine: "Moody Real", trigger: "innie pussy adjuster", file: "m99_labiaplasty_pussy_6_zimage.safetensors", strength: 1,
    source: "https://civitai.red/models/112299/labiaplasty-innie-pussy-adjuster-kr2-k9b-zimage-sdxl-qwen-chroma-sd1?modelVersionId=2863879",
    swatch: "linear-gradient(145deg, #f3b7bd, #a06170 55%, #3b2530)",
  },
  {
    id: "moody-breast", name: "Breast Size", modes: PHOTO_IMAGE_MODES, baseModelIds: MOODY_BASES,
    engine: "Moody Real", trigger: "breast size slider", file: "breast_size_v2_loraholic.safetensors", strength: 1,
    source: "https://civitai.red/models/2540187/breast-size-slider-krea-2-zit?modelVersionId=2942237",
    swatch: "linear-gradient(145deg, #f4b4c1, #a95b70 55%, #371b28)",
  },
  {
    id: "moody-artful", name: "Artful NSFW", modes: PHOTO_IMAGE_MODES, baseModelIds: MOODY_BASES,
    engine: "Moody Real", trigger: "midjourney artful nsfw", hiddenPrompt: "artful editorial composition, premium cinematic lighting", file: "MidJourneyNSFWZ.safetensors", strength: 1,
    source: "https://civitai.red/models/837884/midjourney-artful-nsfw?modelVersionId=2599899",
    swatch: "linear-gradient(145deg, #f8cf81, #7c5bb5 54%, #211732)",
  },
  {
    id: "moody-body", name: "Body Retouch", modes: PHOTO_IMAGE_MODES, baseModelIds: MOODY_BASES,
    engine: "Moody Real", trigger: "female body retouched", hiddenPrompt: "retouched skin, polished body detail, refined anatomy", file: "zib-uncensored_v1_ep15.safetensors", strength: 1,
    source: "https://civitai.red/models/2196685/z-female-body-retouched?modelVersionId=2754304",
    swatch: "linear-gradient(145deg, #f0c7a6, #a86f56 55%, #362116)",
  },
  {
    id: "moody-psychedelic", name: "Psychedelic", modes: PHOTO_IMAGE_MODES, baseModelIds: MOODY_BASES,
    engine: "Moody Real", trigger: "60s psychedelic movie", hiddenPrompt: "1960s psychedelic movie still, retro color palette, surreal film grain", file: "60sPsyZBase.safetensors", strength: 1,
    source: "https://civitai.red/models/878199/60s-psychedelic-movie?modelVersionId=2746097",
    swatch: "linear-gradient(145deg, #fddb63, #ed4f7d 42%, #6739d8)",
  },
  {
    id: "moody-areola", name: "Areola Size", modes: PHOTO_IMAGE_MODES, baseModelIds: MOODY_BASES,
    engine: "Moody Real", trigger: "areola size slider", file: "areolas_size_loraholic.safetensors", strength: 1,
    source: "https://civitai.red/models/2554618/areola-size-slider-krea2-zit?modelVersionId=2870994",
    swatch: "linear-gradient(145deg, #edb3b8, #9b5965 55%, #331e25)",
  },
  {
    id: "moody-skin", name: "Skin Tone", modes: PHOTO_IMAGE_MODES, baseModelIds: MOODY_BASES,
    engine: "Moody Real", trigger: "skin tone slider", file: "skintone_v2_loraholic.safetensors", strength: 1,
    source: "https://civitai.red/models/2540631/skin-tone-slider-krea2-zit?modelVersionId=3018665",
    swatch: "linear-gradient(145deg, #f3c3a4, #aa7058 55%, #382118)",
  },
  {
    id: "moody-rope", name: "Rope Bondage", modes: PHOTO_IMAGE_MODES, baseModelIds: MOODY_BASES,
    engine: "Moody Real", trigger: "ropebondage", hiddenPrompt: "consensual rope bondage styling, rope harness fashion", file: "rope bondage V2.safetensors", strength: 1,
    source: "https://civitai.red/models/2277824/ropebondage-v2?modelVersionId=2922476",
    swatch: "linear-gradient(145deg, #d1a678, #77513b 55%, #201510)",
  },
  {
    id: "moody-egypt", name: "Egypt Queen", modes: PHOTO_IMAGE_MODES, baseModelIds: MOODY_BASES,
    engine: "Moody Real", trigger: "egypt queen fiction", hiddenPrompt: "ancient egyptian queen styling, ornate gold jewelry, cinematic fantasy portrait", file: "egypt queen v2.safetensors", strength: 1,
    source: "https://civitai.red/models/2139437/egypt-queen-fiction?modelVersionId=2547132",
    swatch: "linear-gradient(145deg, #ffd36a, #916329 55%, #1d1408)",
  },
  {
    id: "moody-chain", name: "Chain Collar", modes: PHOTO_IMAGE_MODES, baseModelIds: MOODY_BASES,
    engine: "Moody Real", trigger: "chaincollar", hiddenPrompt: "chain collar accessory, metallic collar detail", file: "chain collar.safetensors", strength: 1,
    source: "https://civitai.red/models/2217833/chaincollar?modelVersionId=2496919",
    swatch: "linear-gradient(145deg, #d5d8dc, #777b81 54%, #1b1d20)",
  },
  {
    id: "moody-nostalgic", name: "Nostalgic", modes: PHOTO_IMAGE_MODES, baseModelIds: MOODY_BASES,
    engine: "Moody Real", trigger: "nostalgic cinema", hiddenPrompt: "nostalgic cinema still, vintage film look, soft cinematic grading", file: "Nostalgic_Cinema_zit_final.safetensors", strength: 1,
    source: "https://civitai.red/models/2143490/nostalgic-cinema?modelVersionId=3187139",
    swatch: "linear-gradient(145deg, #e2c698, #8d5539 54%, #211410)",
  },
  {
    id: "moody-fashion", name: "Fashion", modes: PHOTO_IMAGE_MODES, baseModelIds: MOODY_BASES,
    engine: "Moody Real", trigger: "non-mainstream fashiongenerator", hiddenPrompt: "avant-garde non-mainstream fashion editorial", file: "Fashion Generator.safetensors", strength: 1,
    source: "https://civitai.red/models/2241379/non-mainstream-fashiongenerator?modelVersionId=2523198",
    swatch: "linear-gradient(145deg, #f1f1f1, #826f8f 48%, #23202a)",
  },
  {
    id: "moody-crowd", name: "Crowd Street", modes: PHOTO_IMAGE_MODES, baseModelIds: MOODY_BASES,
    engine: "Moody Real", trigger: "crowdstreet", hiddenPrompt: "busy street crowd background, candid urban photography", file: "crowd street.safetensors", strength: 1,
    source: "https://civitai.red/models/2230566/crowdstreet?modelVersionId=2511028",
    swatch: "linear-gradient(145deg, #bfc8d6, #596579 52%, #181d25)",
  },
  {
    id: "moody-chunli", name: "Chun-Li", modes: PHOTO_IMAGE_MODES, baseModelIds: MOODY_BASES,
    engine: "Moody Real", trigger: "chun-li", file: "Chun Li V2.safetensors", strength: 1,
    source: "https://civitai.red/models/2151431/chun-li-v-20?modelVersionId=2924850",
    swatch: "linear-gradient(145deg, #4588ff, #f2d160 48%, #71402f)",
  },
];

