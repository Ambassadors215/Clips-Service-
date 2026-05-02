#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
function loadDotEnv(name) {
  const p = resolve(root, name);
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const t = line.trim(); if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("="); if (eq < 0) continue;
    const k = t.slice(0, eq).trim(); let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (process.env[k] === undefined || process.env[k] === "") process.env[k] = v;
  }
}
loadDotEnv(".env"); loadDotEnv(".env.local");

const token = process.env.VERCEL_TOKEN?.trim();
const projectId = "prj_LUt039Hz0ztnvgmqD6D6TtibkDYY";

async function call(path, opts = {}) {
  const r = await fetch(`https://api.vercel.com${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(opts.headers || {}) },
  });
  const text = await r.text();
  let json; try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { status: r.status, body: json };
}

console.log("=== 1. Project status ===");
const proj = await call(`/v9/projects/${projectId}`);
console.log("  paused:", proj.body.live === false || proj.body.paused);
console.log("  ssoProtection:", proj.body.ssoProtection);
console.log("  passwordProtection:", proj.body.passwordProtection);
console.log("  publicSource:", proj.body.publicSource);

console.log("\n=== 2. Latest deployment ===");
const list = await call(`/v6/deployments?projectId=${projectId}&limit=3&target=production`);
for (const d of list.body.deployments || []) {
  console.log(`  ${d.uid}  ${d.url}  state=${d.state}  ready=${new Date(d.ready).toISOString()}`);
}

console.log("\n=== 3. Test latest deployment URL ===");
const latest = list.body.deployments?.[0];
if (latest) {
  const r = await fetch(`https://${latest.url}/`);
  console.log("  Status:", r.status);
  console.log("  Content-Type:", r.headers.get("content-type"));
  const t = await r.text();
  console.log("  Has '<title>Clip Services':", t.includes("<title>Clip Services"));
}

console.log("\n=== 4. Open Graph endpoint ===");
const og = await call(`/v13/deployments/${latest.uid}/open-graph-image`).catch(e => ({ status: "ERR", body: e.message }));
console.log("  /open-graph-image:", og.status);

console.log("\n=== 5. Try alternative thumbnail endpoints ===");
for (const ep of [`/v1/deployments/${latest.uid}/preview`, `/v1/deployments/${latest.uid}/screenshot`, `/api/screenshots/${latest.uid}`]) {
  try {
    const r = await fetch(`https://api.vercel.com${ep}`, { headers: { Authorization: `Bearer ${token}` } });
    console.log(`  ${ep}: ${r.status}`);
  } catch (e) { console.log(`  ${ep}: ERR`, e.message); }
}
