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

console.log("Trying various 'live' patches...\n");

// Try several shapes the API might accept.
const attempts = [
  { live: true },
  { paused: false },
  { live: true, paused: false },
];
for (const body of attempts) {
  const r = await call("PATCH", `/v9/projects/${projectId}`, body);
  console.log("PATCH", JSON.stringify(body), "->", r.status, typeof r.body === "object" ? JSON.stringify({ live: r.body.live, paused: r.body.paused }) : String(r.body).slice(0, 200));
}

console.log("\nAfter patches, project state:");
const after = await call("GET", `/v9/projects/${projectId}`);
console.log("  live:", JSON.stringify(after.body.live));
console.log("  ssoProtection:", JSON.stringify(after.body.ssoProtection));
console.log("  passwordProtection:", JSON.stringify(after.body.passwordProtection));

console.log("\n=== try unpause / resume endpoints ===");
const otherEndpoints = [
  ["POST", `/v9/projects/${projectId}/pause`, { resume: true }],
  ["POST", `/v9/projects/${projectId}/resume`, {}],
  ["POST", `/v1/projects/${projectId}/pause`, { resume: true }],
  ["POST", `/v1/projects/${projectId}/resume`, {}],
  ["DELETE", `/v9/projects/${projectId}/pause`, null],
];
for (const [m, p, b] of otherEndpoints) {
  const r = await call(m, p, b);
  console.log(m, p, "->", r.status, typeof r.body === "object" ? JSON.stringify(r.body).slice(0, 200) : String(r.body).slice(0, 200));
}
