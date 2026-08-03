const DEFAULT_ALLOWED_ORIGINS = [
  "https://shadowframe.tech",
  "https://www.shadowframe.tech",
  "http://shadowframe.tech",
  "http://www.shadowframe.tech",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
];

function configuredOrigins() {
  const configured = (process.env.SHADOWFRAME_ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return new Set([...DEFAULT_ALLOWED_ORIGINS, ...configured]);
}

function allowedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return null;
  return configuredOrigins().has(origin) ? origin : "";
}

function tokenMatches(received: string, expected: string) {
  if (received.length !== expected.length) return false;
  let mismatch = 0;
  for (let index = 0; index < received.length; index += 1) {
    mismatch |= received.charCodeAt(index) ^ expected.charCodeAt(index);
  }
  return mismatch === 0;
}

export function bridgeCorsHeaders(request: Request) {
  const headers = new Headers({
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Cache-Control": "no-store",
    "Cross-Origin-Resource-Policy": "cross-origin",
    Vary: "Origin",
  });
  const origin = allowedOrigin(request);
  if (origin) headers.set("Access-Control-Allow-Origin", origin);
  return headers;
}

export function withBridgeCors(request: Request, response: Response) {
  const headers = new Headers(response.headers);
  bridgeCorsHeaders(request).forEach((value, key) => headers.set(key, value));
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export function bridgeJson(request: Request, body: unknown, init?: ResponseInit) {
  return withBridgeCors(request, Response.json(body, init));
}

export function authorizeBridgeRequest(request: Request) {
  if (allowedOrigin(request) === "") {
    return bridgeJson(request, { error: "This website is not allowed to use the Shadowframe Bridge." }, { status: 403 });
  }

  const expected = (process.env.SHADOWFRAME_BRIDGE_TOKEN || "").trim();
  if (!expected) return null;
  const authorization = request.headers.get("authorization") || "";
  const received = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!tokenMatches(received, expected)) {
    return bridgeJson(request, { error: "The Shadowframe Bridge access key is missing or incorrect." }, { status: 401 });
  }
  return null;
}

export function bridgeOptions(request: Request) {
  if (allowedOrigin(request) === "") {
    return bridgeJson(request, { error: "Origin not allowed." }, { status: 403 });
  }
  return new Response(null, { status: 204, headers: bridgeCorsHeaders(request) });
}
