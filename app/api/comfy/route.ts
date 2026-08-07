import { authorizeBridgeRequest, bridgeJson, bridgeOptions, withBridgeCors } from "../../lib/bridge-security";

const COMFYUI_URL = process.env.COMFYUI_URL || "http://127.0.0.1:8188";
const IS_PUBLIC_RELEASE = (process.env.SHADOWFRAME_APP_PROFILE || process.env.NEXT_PUBLIC_SHADOWFRAME_PROFILE) === "public";

const ALLOWED_PATHS = ["/system_stats", "/models/loras", "/upload/image", "/history", "/view", "/interrupt", "/queue"];
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_PUBLIC_UPLOAD_BYTES = 12 * 1024 * 1024;
const MIN_PUBLIC_DIMENSION = 256;
const MAX_PUBLIC_DIMENSION = 4096;
const MAX_PUBLIC_ASPECT_RATIO = 3.2;
const EXPLICIT_UPLOAD_NAME = /\b(?:nude|nudity|naked|topless|bottomless|breast|nipples?|areola|boobs?|pussy|vagina|cameltoe|genitals?|porn|deepthroat|bondage|see[- ]?through|transparent)\b/i;

function upstreamFor(request: Request) {
  const incoming = new URL(request.url);
  const path = incoming.searchParams.get("path") || "";
  if (!ALLOWED_PATHS.some((allowed) => path === allowed || path.startsWith(`${allowed}/`))) {
    throw new Error("Unsupported ComfyUI endpoint.");
  }
  const upstream = new URL(path, COMFYUI_URL);
  incoming.searchParams.forEach((value, key) => {
    if (key !== "path") upstream.searchParams.append(key, value);
  });
  return upstream;
}

function readPngDimensions(bytes: Uint8Array) {
  if (bytes.length < 24) return null;
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (!signature.every((value, index) => bytes[index] === value)) return null;
  const width = (bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19];
  const height = (bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23];
  return width > 0 && height > 0 ? { width, height } : null;
}

function readJpegDimensions(bytes: Uint8Array) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = bytes[offset + 1];
    const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if (length < 2 || offset + 2 + length > bytes.length) break;
    const isStartOfFrame = (marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) || (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf);
    if (isStartOfFrame) {
      const height = (bytes[offset + 5] << 8) | bytes[offset + 6];
      const width = (bytes[offset + 7] << 8) | bytes[offset + 8];
      return width > 0 && height > 0 ? { width, height } : null;
    }
    offset += 2 + length;
  }
  return null;
}

function readWebpDimensions(bytes: Uint8Array) {
  if (bytes.length < 30) return null;
  const riff = String.fromCharCode(...bytes.slice(0, 4));
  const webp = String.fromCharCode(...bytes.slice(8, 12));
  if (riff !== "RIFF" || webp !== "WEBP") return null;
  const chunk = String.fromCharCode(...bytes.slice(12, 16));
  if (chunk === "VP8X" && bytes.length >= 30) {
    const width = 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16);
    const height = 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16);
    return { width, height };
  }
  if (chunk === "VP8 " && bytes.length >= 30) {
    const width = bytes[26] | (bytes[27] << 8);
    const height = bytes[28] | (bytes[29] << 8);
    return width > 0 && height > 0 ? { width, height } : null;
  }
  if (chunk === "VP8L" && bytes.length >= 25) {
    const b0 = bytes[21];
    const b1 = bytes[22];
    const b2 = bytes[23];
    const b3 = bytes[24];
    const width = 1 + (((b1 & 0x3f) << 8) | b0);
    const height = 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
    return width > 0 && height > 0 ? { width, height } : null;
  }
  return null;
}

function readImageDimensions(file: File, bytes: Uint8Array) {
  if (file.type === "image/png") return readPngDimensions(bytes);
  if (file.type === "image/jpeg") return readJpegDimensions(bytes);
  if (file.type === "image/webp") return readWebpDimensions(bytes);
  return null;
}

async function validatePublicUpload(request: Request) {
  const uploadRequest = new URL(request.url).searchParams.get("path") === "/upload/image" && request.method === "POST";
  if (!IS_PUBLIC_RELEASE || !uploadRequest) return null;

  const form = await request.clone().formData();
  const image = form.get("image");
  const targetType = form.get("type");

  if (!(image instanceof File)) {
    return bridgeJson(request, { error: "Public Shadowframe requires a valid image upload." }, { status: 400 });
  }
  if (targetType !== "input") {
    return bridgeJson(request, { error: "Public Shadowframe accepts uploads only for guided input images." }, { status: 400 });
  }
  if (!ALLOWED_IMAGE_TYPES.has(image.type)) {
    return bridgeJson(request, { error: "Public Shadowframe accepts JPEG, PNG, or WebP images only." }, { status: 400 });
  }
  if (image.size <= 0 || image.size > MAX_PUBLIC_UPLOAD_BYTES) {
    return bridgeJson(request, { error: "Public Shadowframe accepts images up to 12 MB." }, { status: 400 });
  }
  if (EXPLICIT_UPLOAD_NAME.test(image.name)) {
    return bridgeJson(request, { error: "That upload name is not allowed in the public release." }, { status: 400 });
  }

  const bytes = new Uint8Array(await image.arrayBuffer());
  const dimensions = readImageDimensions(image, bytes);
  if (!dimensions) {
    return bridgeJson(request, { error: "That image could not be validated for the public release." }, { status: 400 });
  }

  const aspectRatio = Math.max(dimensions.width, dimensions.height) / Math.max(1, Math.min(dimensions.width, dimensions.height));
  if (dimensions.width < MIN_PUBLIC_DIMENSION || dimensions.height < MIN_PUBLIC_DIMENSION || dimensions.width > MAX_PUBLIC_DIMENSION || dimensions.height > MAX_PUBLIC_DIMENSION || aspectRatio > MAX_PUBLIC_ASPECT_RATIO) {
    return bridgeJson(request, { error: "Public Shadowframe accepts images between 256 and 4096 pixels with a moderate aspect ratio." }, { status: 400 });
  }

  return null;
}

async function proxy(request: Request) {
  const authorizationError = authorizeBridgeRequest(request);
  if (authorizationError) return authorizationError;
  try {
    const publicUploadError = await validatePublicUpload(request);
    if (publicUploadError) return publicUploadError;
    const upstream = upstreamFor(request);
    const headers = new Headers();
    const contentType = request.headers.get("content-type");
    if (contentType) headers.set("content-type", contentType);
    const response = await fetch(upstream, {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer(),
      cache: "no-store",
    });
    const responseHeaders = new Headers();
    for (const name of ["content-type", "content-length", "content-disposition"]) {
      const value = response.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    responseHeaders.set("cache-control", "no-store");
    return withBridgeCors(request, new Response(response.body, { status: response.status, headers: responseHeaders }));
  } catch (error) {
    return bridgeJson(
      request,
      { error: error instanceof Error ? error.message : "Unable to reach ComfyUI." },
      { status: 503 },
    );
  }
}

export async function GET(request: Request) { return proxy(request); }
export async function POST(request: Request) { return proxy(request); }
export async function OPTIONS(request: Request) { return bridgeOptions(request); }
