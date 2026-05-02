#!/usr/bin/env node
/**
 * One-shot: maximise public accessibility for clips-service on Vercel
 * (unpause, clear SSO/password protection, firewall visibility, probes).
 * Run from repo root: node scripts/vercel-fix-clips-service.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
function loadDotEnv(name) {
  const p = resolve(root, name);
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (process.env[k] === undefined || process.env[k] === "") process.env[k] = v;
  }
}
loadDotEnv(".env");
loadDotEnv(".env.local");

const token = process.env.VERCEL_TOKEN?.trim();
const teamId = process.env.VERCEL_TEAM_ID?.trim() || "team_3KlV0XPi8ko4pWIwdXX9Hz3D";
const projectId = process.env.CLIPS_PROJECT_ID?.trim() || "prj_LUt039Hz0ztnvgmqD6D6TtibkDYY";

if (!token) {
  console.error("VERCEL_TOKEN missing");
  process.exit(1);
}

/** @type {(m: string, p: string, b?: unknown) => Promise<{ status: number; body: unknown }>} */
async function call(method, path, body) {
  const url = new URL(`https://api.vercel.com${path}`);
  url.searchParams.set("teamId", teamId);
  const res = await fetch(url.toString(), {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { status: res.status, body: json };
}

console.log("=== Team (protection context) ===");
const team = await call("GET", `/v2/teams/${teamId}`);
console.log("  status:", team.status);
if (team.body && typeof team.body === "object") {
  for (const k of ["slug", "name", "ssoProtection", "passwordProtection", "deploymentProtection", "saml"]) {
    if (k in team.body) console.log(`  ${k}:`, JSON.stringify(team.body[k]));
  }
}

console.log("\n=== Project (before) ===");
let proj = await call("GET", `/v9/projects/${projectId}`);
if (proj.status !== 200 && typeof proj.body === "object" && proj.body?.error)
  console.log("GET project:", proj.status, JSON.stringify(proj.body).slice(0, 200));
else if (proj.body && typeof proj.body === "object") {
  for (const k of [
    "name",
    "paused",
    "live",
    "ssoProtection",
    "passwordProtection",
    "trustedIps",
    "oidcTokenConfig",
    "publicSource",
  ]) {
    if (k in proj.body) console.log(`  ${k}:`, JSON.stringify(proj.body[k]));
  }
}

console.log("\n=== Unpause project ===");
const unpause = await call("POST", `/v9/projects/${projectId}/unpause`, {});
console.log("  POST /unpause ->", unpause.status, typeof unpause.body === "string" ? unpause.body.slice(0, 120) : JSON.stringify(unpause.body)?.slice(0, 160));

console.log("\n=== Clear SSO + password protection ===");
const clear = await call("PATCH", `/v9/projects/${projectId}`, {
  ssoProtection: null,
  passwordProtection: null,
});
console.log(
  "  PATCH ->",
  clear.status,
  typeof clear.body === "object" ? JSON.stringify(clear.body)?.slice(0, 240) : String(clear.body).slice(0, 240)
);

console.log("\n=== Project (after PATCH) ===");
proj = await call("GET", `/v9/projects/${projectId}`);
if (proj.body && typeof proj.body === "object") {
  for (const k of ["paused", "live", "ssoProtection", "passwordProtection", "publicSource"]) {
    if (k in proj.body) console.log(`  ${k}:`, JSON.stringify(proj.body[k]));
  }
}

console.log("\n=== Firewall (team + project) ===");
for (const path of [
  `/v1/security/firewall/config?projectId=${projectId}`,
  `/v1/security/firewall/config?teamId=${teamId}`,
]) {
  const fw = await call("GET", path);
  console.log(" ", path, "->", fw.status);
  if (fw.body && typeof fw.body === "object") console.log(JSON.stringify(fw.body).slice(0, 900));
}

console.log("\n=== Latest prod deployment probes ===");
const list = await call("GET", `/v6/deployments?projectId=${projectId}&target=production&limit=3`);
const deps = list.body?.deployments || [];
for (const d of deps.slice(0, 2)) {
  const url = `https://${d.url}/`;
  try {
    const r = await fetch(url, {
      redirect: "manual",
      headers: { Referer: "https://vercel.com/deployments", "Sec-Fetch-Dest": "iframe", "Sec-Fetch-Site": "cross-site", Accept: "text/html,application/xhtml+xml" },
    });
    const ct = r.headers.get("content-security-policy")?.slice(0, 70) || "(no csp)";
    console.log(`  ${d.url} HTTP ${r.status} CSP:${ct}`);
  } catch (e) {
    console.log("  ERR", d.url, String(e.message || e));
  }
}

console.log("\nDone. If dashboard still shows 403 on old tiles: hard-refresh deployments list; thumbnails are cached per deployment.");
