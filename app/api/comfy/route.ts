const COMFYUI_URL = process.env.COMFYUI_URL || "http://127.0.0.1:8188";

const ALLOWED_PATHS = ["/system_stats", "/upload/image", "/history", "/view", "/interrupt", "/queue"];

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

async function proxy(request: Request) {
  try {
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
    return new Response(response.body, { status: response.status, headers: responseHeaders });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to reach ComfyUI." },
      { status: 503 },
    );
  }
}

export async function GET(request: Request) { return proxy(request); }
export async function POST(request: Request) { return proxy(request); }
