#!/usr/bin/env node
/**
 * Inspect every layer of Vercel deployment protection on the clips-service project,
 * across team / project / deployment scope. Helps explain mysterious 403s.
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
const teamId = process.env.VERCEL_TEAM_ID?.trim();
const projectId = "prj_LUt039Hz0ztnvgmqD6D6TtibkDYY";
if (!token) { console.error("VERCEL_TOKEN missing"); process.exit(1); }

async function call(method, urlPath, body) {
  const url = new URL(`https://api.vercel.com${urlPath}`);
  if (teamId) url.searchParams.set("teamId", teamId);
  const res = await fetch(url.toString(), {
    method,
    headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch (_e) {}
  return { status: res.status, ok: res.ok, body: json ?? text };
}

console.log("=== TEAM ===");
if (teamId) {
  const t = await call("GET", `/v2/teams/${teamId}`);
  console.log("status:", t.status);
  if (t.body && typeof t.body === "object") {
    const keys = ["id","slug","name","saml","ssoProtection","deploymentProtection","passwordProtection","previewDeploymentSuffix"];
    for (const k of keys) if (k in t.body) console.log(" ", k, ":", JSON.stringify(t.body[k]));
  }
} else {
  console.log("(no VERCEL_TEAM_ID set)");
}

console.log("\n=== PROJECT ===");
const p = await call("GET", `/v9/projects/${projectId}`);
console.log("status:", p.status);
if (p.body && typeof p.body === "object") {
  const keys = ["id","name","ssoProtection","passwordProtection","trustedIps","oidcTokenConfig","autoExposeSystemEnvs"];
  for (const k of keys) if (k in p.body) console.log(" ", k, ":", JSON.stringify(p.body[k]));
}

console.log("\n=== LATEST DEPLOYMENT ===");
const list = await call("GET", `/v6/deployments?projectId=${projectId}&limit=1`);
const dep = list.body?.deployments?.[0];
if (dep) {
  console.log(" id:", dep.uid || dep.id);
  console.log(" url:", dep.url);
  console.log(" target:", dep.target);
  console.log(" state:", dep.state);
  const d = await call("GET", `/v13/deployments/${dep.uid || dep.id}`);
  if (d.body && typeof d.body === "object") {
    const keys = ["target","aliasAssigned","ssoProtection","passwordProtection","public","autoAssignCustomDomains"];
    for (const k of keys) if (k in d.body) console.log(" ", k, ":", JSON.stringify(d.body[k]));
  }
}

console.log("\n=== HEAD probes ===");
const urls = [
  "https://clipservice.app/",
  `https://${dep?.url || ""}/`,
];
for (const u of urls) {
  if (!u || u === "https:///") continue;
  try {
    const r = await fetch(u, { method: "HEAD", redirect: "manual" });
    console.log(" ", r.status, r.headers.get("location") || "", u);
  } catch (e) {
    console.log("  ERR", String(e?.message || e), u);
  }
}
