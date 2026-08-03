import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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

test("server-renders the Afterdark AI generator", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Afterdark AI · Create Without Limits<\/title>/i);
  assert.match(html, /AFTERDARK AI/);
  assert.match(html, /Text → Image/);
  assert.match(html, /Image → Image/);
  assert.match(html, /Image → Video/);
  assert.match(html, /Text → Video/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/i);
});

test("includes Anima image workflow templates and route bindings", async () => {
  const [editWorkflowSource, animaWorkflowSource, route, presets] = await Promise.all([
    readFile(new URL("../app/lib/anima-img-image-workflow.json", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/anima-image-workflow.json", import.meta.url), "utf8"),
    readFile(new URL("../app/api/generate/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/style-presets.ts", import.meta.url), "utf8"),
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
  assert.doesNotMatch(presets, /id: "(?:perfeczion|qwen-edit|flux-klein|krea2|sd15|illustrious|pony)"/i);
});
