import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the Shadowframe AI introduction", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Shadowframe AI · Create Without Limits<\/title>/i);
  assert.match(html, /SHADOWFRAME AI/);
  assert.match(html, /Generate Now/);
  assert.match(html, /WAI-ANIMA/);
  assert.match(html, /Wan 2\.2/);
  assert.match(html, /Your work stays on your PC/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/i);
});

test("includes all generator modes, Anima workflows, and route bindings", async () => {
  const [editWorkflowSource, animaWorkflowSource, route, presets, page] = await Promise.all([
    readFile(new URL("../app/lib/anima-img-image-workflow.json", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/anima-image-workflow.json", import.meta.url), "utf8"),
    readFile(new URL("../app/api/generate/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/style-presets.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
  ]);
  const editWorkflow = JSON.parse(editWorkflowSource);
  const animaWorkflow = JSON.parse(animaWorkflowSource);

  assert.equal(editWorkflow["2"].inputs.unet_name, "anima-aesthetic-v1.1.safetensors");
  assert.equal(editWorkflow["7"].class_type, "VAEEncode");
  assert.equal(editWorkflow["8"].class_type, "KSampler");
  assert.equal(editWorkflow["11"].class_type, "SaveImage");
  assert.equal(animaWorkflow["1"].inputs.unet_name, "waiANIMA_v10Base10.safetensors");
  assert.equal(animaWorkflow["6"].inputs.sampler_name, "er_sde");
  assert.equal(animaWorkflow["10"].class_type, "SaveImage");
  assert.match(route, /mode === "txt-img"/);
  assert.match(route, /mode === "img-img"/);
  assert.match(route, /baseModelId === "wai-anima"/);
  assert.match(page, /Text → Image/);
  assert.match(page, /Image → Image/);
  assert.match(page, /Image → Video/);
  assert.match(page, /Text → Video/);
  assert.match(page, /selectMode\("txt-img"\)/);
  assert.match(page, /https:\/\/bridge\.shadowframe\.tech/);
  assert.doesNotMatch(page, /dialog-close|Close bridge settings|currentTarget === event\.target/);
  assert.doesNotMatch(presets, /id: "(?:perfeczion|qwen-edit|flux-klein|krea2|sd15|illustrious|pony)"/i);
});

test("protects the local bridge and permits the Shadowframe website origin", async () => {
  let capturedGeneration = null;
  const mockComfy = createServer((request, response) => {
    if (request.url === "/system_stats") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ system: { os: "mock" } }));
      return;
    }
    if (request.url === "/interrupt" && request.method === "POST") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ ok: true }));
      return;
    }
    if (request.url === "/prompt" && request.method === "POST") {
      let body = "";
      request.on("data", (chunk) => { body += chunk; });
      request.on("end", () => {
        capturedGeneration = JSON.parse(body);
        response.writeHead(200, { "content-type": "application/json" });
        response.end(JSON.stringify({ prompt_id: "trigger-test" }));
      });
      return;
    }
    response.writeHead(404, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "not found" }));
  });
  await new Promise((resolve, reject) => {
    mockComfy.once("error", reject);
    mockComfy.listen(18188, "127.0.0.1", resolve);
  });

  process.env.COMFYUI_URL = "http://127.0.0.1:18188";
  process.env.SHADOWFRAME_BRIDGE_TOKEN = "integration-test-key";
  process.env.SHADOWFRAME_ALLOWED_ORIGINS = "https://shadowframe.tech";
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("bridge-test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const env = { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } };
  const context = { waitUntil() {}, passThroughOnException() {} };

  try {
    const unauthorized = await worker.fetch(
      new Request("http://localhost/api/comfy?path=/system_stats", { headers: { origin: "https://shadowframe.tech" } }),
      env,
      context,
    );
    assert.equal(unauthorized.status, 401);
    assert.equal(unauthorized.headers.get("access-control-allow-origin"), "https://shadowframe.tech");

    const forbiddenOrigin = await worker.fetch(
      new Request("http://localhost/api/comfy?path=/system_stats", {
        headers: { authorization: "Bearer integration-test-key", origin: "https://example.com" },
      }),
      env,
      context,
    );
    assert.equal(forbiddenOrigin.status, 403);
    assert.equal(forbiddenOrigin.headers.get("access-control-allow-origin"), null);

    const preflight = await worker.fetch(
      new Request("http://localhost/api/comfy", {
        method: "OPTIONS",
        headers: { origin: "https://shadowframe.tech", "access-control-request-method": "POST" },
      }),
      env,
      context,
    );
    assert.equal(preflight.status, 204);
    assert.match(preflight.headers.get("access-control-allow-methods") || "", /POST/);

    const authorized = await worker.fetch(
      new Request("http://localhost/api/comfy?path=/system_stats", {
        headers: { authorization: "Bearer integration-test-key", origin: "https://shadowframe.tech" },
      }),
      env,
      context,
    );
    assert.equal(authorized.status, 200);
    assert.equal(authorized.headers.get("access-control-allow-origin"), "https://shadowframe.tech");
    assert.deepEqual(await authorized.json(), { system: { os: "mock" } });

    const authorizedPost = await worker.fetch(
      new Request("http://localhost/api/comfy?path=/interrupt", {
        method: "POST",
        headers: {
          authorization: "Bearer integration-test-key",
          origin: "https://shadowframe.tech",
          "content-type": "application/json",
        },
        body: "{}",
      }),
      env,
      context,
    );
    assert.equal(authorizedPost.status, 200);
    assert.equal(authorizedPost.headers.get("access-control-allow-origin"), "https://shadowframe.tech");
    assert.deepEqual(await authorizedPost.json(), { ok: true });

    const generation = await worker.fetch(
      new Request("http://localhost/api/generate", {
        method: "POST",
        headers: {
          authorization: "Bearer integration-test-key",
          origin: "https://shadowframe.tech",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          mode: "txt-img",
          baseModelId: "anima-aesthetic",
          styleId: "anima-ripping",
          positivePrompt: "an adult fashion portrait",
          negativePrompt: "low quality",
          width: 1024,
          height: 1024,
          hiresScale: 1.5,
          seed: 42,
        }),
      }),
      env,
      context,
    );
    assert.equal(generation.status, 200);
    assert.equal((await generation.json()).prompt_id, "trigger-test");
    assert.match(capturedGeneration.prompt["3"].inputs.text, /ripping clothes by others, an adult fashion portrait/);
    assert.doesNotMatch(capturedGeneration.prompt["3"].inputs.text, /ripping clothes by others.*ripping clothes by others/);
  } finally {
    await new Promise((resolve) => mockComfy.close(resolve));
    delete process.env.COMFYUI_URL;
    delete process.env.SHADOWFRAME_BRIDGE_TOKEN;
    delete process.env.SHADOWFRAME_ALLOWED_ORIGINS;
  }
});
