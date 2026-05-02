#!/usr/bin/env node
/**
 * Disable Vercel Deployment Protection (SSO + Password) on the clips-service project
 * so the *.vercel.app deployment URLs are publicly viewable.
 * The custom domain (clipservice.app) is already public regardless.
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
if (!token) {
  console.error("VERCEL_TOKEN missing");
  process.exit(1);
}

const teamSuffix = teamId ? `?teamId=${encodeURIComponent(teamId)}` : "";

async function api(method, path, body) {
  const res = await fetch(`https://api.vercel.com${path}${path.includes("?") ? "&" : teamSuffix ? teamSuffix.replace("?", "&") : ""}${path.includes("?") && teamId ? `&teamId=${encodeURIComponent(teamId)}` : ""}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch (_e) {}
  return { status: res.status, ok: res.ok, body: json ?? text };
}

// Use a clean URL builder so query params don't get mangled.
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

// 1) Show current protection settings.
const before = await call("GET", `/v9/projects/${projectId}`);
if (!before.ok) {
  console.error("GET project failed:", before.status, JSON.stringify(before.body).slice(0, 600));
  process.exit(1);
}
console.log("BEFORE:");
console.log("  ssoProtection:", JSON.stringify(before.body.ssoProtection));
console.log("  passwordProtection:", JSON.stringify(before.body.passwordProtection));
console.log("  trustedIps:", JSON.stringify(before.body.trustedIps));

// 2) Disable SSO + password protection.
const patch = await call("PATCH", `/v9/projects/${projectId}`, {
  ssoProtection: null,
  passwordProtection: null,
});
if (!patch.ok) {
  console.error("PATCH failed:", patch.status, JSON.stringify(patch.body).slice(0, 800));
  process.exit(1);
}
console.log("\nPATCH ok:", patch.status);

// 3) Re-read to confirm.
const after = await call("GET", `/v9/projects/${projectId}`);
console.log("\nAFTER:");
console.log("  ssoProtection:", JSON.stringify(after.body.ssoProtection));
console.log("  passwordProtection:", JSON.stringify(after.body.passwordProtection));
console.log("  trustedIps:", JSON.stringify(after.body.trustedIps));
