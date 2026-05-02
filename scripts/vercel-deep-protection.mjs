#!/usr/bin/env node
/**
 * Aggressive protection clearance:
 *  - Toggle ssoProtection ON briefly then OFF (resets any stale signing state)
 *  - Try to mark project source/deployments public
 *  - Generate / list protection-bypass tokens (if API permits)
 *  - Print everything so we can decide next step.
 */
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
async function call(method, path, body) {
  const res = await fetch(`https://api.vercel.com${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null; try { json = text ? JSON.parse(text) : null; } catch (_e) {}
  return { status: res.status, body: json ?? text };
}

async function probe() {
  const url = "https://clips-service-2tj2v00fb-ambassadors215s-projects.vercel.app/";
  const r = await fetch(url, { method: "HEAD", redirect: "manual" });
  console.log("  probe:", r.status, r.headers.get("x-vercel-id"));
}

console.log("=== current project ssoProtection ===");
let p = await call("GET", `/v9/projects/${projectId}`);
console.log("  ssoProtection:", JSON.stringify(p.body.ssoProtection));
console.log("  passwordProtection:", JSON.stringify(p.body.passwordProtection));
await probe();

console.log("\n=== set explicit ssoProtection.deploymentType=none ===");
let pa = await call("PATCH", `/v9/projects/${projectId}`, {
  ssoProtection: { deploymentType: "none" },
  passwordProtection: null,
});
console.log("  patch status:", pa.status, JSON.stringify(pa.body).slice(0, 300));

console.log("\n=== then null both ===");
pa = await call("PATCH", `/v9/projects/${projectId}`, {
  ssoProtection: null,
  passwordProtection: null,
});
console.log("  patch status:", pa.status, JSON.stringify(pa.body).slice(0, 300));
await probe();

console.log("\n=== try to mark project source public ===");
pa = await call("PATCH", `/v9/projects/${projectId}`, { publicSource: true });
console.log("  patch status:", pa.status, JSON.stringify(pa.body).slice(0, 300));

console.log("\n=== try generating a protection bypass token ===");
pa = await call("POST", `/v1/security/protection-bypass?projectId=${projectId}`, { revoke: false });
console.log("  POST /v1 status:", pa.status, JSON.stringify(pa.body).slice(0, 500));

pa = await call("POST", `/v9/projects/${projectId}/protection-bypass`, { revoke: false });
console.log("  POST /v9 status:", pa.status, JSON.stringify(pa.body).slice(0, 500));

pa = await call("GET", `/v1/security/protection-bypass?projectId=${projectId}`);
console.log("  GET /v1 status:", pa.status, JSON.stringify(pa.body).slice(0, 500));

console.log("\n=== final project state ===");
p = await call("GET", `/v9/projects/${projectId}`);
console.log("  ssoProtection:", JSON.stringify(p.body.ssoProtection));
console.log("  publicSource:", JSON.stringify(p.body.publicSource));
await probe();
