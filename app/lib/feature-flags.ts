export const APP_PROFILE = process.env.NEXT_PUBLIC_SHADOWFRAME_PROFILE ?? "creator";

export const IS_PUBLIC_RELEASE = APP_PROFILE === "public";

export const OUTFIT_REPLACE_ENABLED = process.env.NEXT_PUBLIC_ENABLE_OUTFIT_REPLACE === "true";

export const PUBLIC_SAFE_STYLE_IDS = [
  "original",
  "anima-xipa",
  "anima-busoft",
  "anima-suuru",
  "anima-linelore",
  "anima-microdetails",
  "wan22-2d",
] as const;

export const PUBLIC_ALLOWED_BASE_MODELS = {
  "txt-img": ["anima-aesthetic"],
  "img-img": ["anima-aesthetic"],
  "img-vid": ["wan22-i2v"],
  "txt-vid": ["wan22-t2v"],
  "outfit": OUTFIT_REPLACE_ENABLED ? ["catvton"] : [],
} as const;
