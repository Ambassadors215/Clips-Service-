#!/usr/bin/env node
/** Inspect team-level deployment protection defaults that may override project. */
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
const teamId = "team_3KlV0XPi8ko4pWIwdXX9Hz3D";

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

console.log("=== TEAM v2 ===");
let r = await call("GET", `/v2/teams/${teamId}`);
console.log("status:", r.status);
if (typeof r.body === "object") {
  const interesting = ["id","slug","name","saml","ssoProtection","passwordProtection","deploymentProtection","accessGroups","previewDeploymentSuffix","spaces","sensitiveEnvironmentVariables"];
  for (const k of interesting) if (k in r.body) console.log(" ", k, ":", JSON.stringify(r.body[k]));
}

console.log("\n=== TEAM access-groups ===");
r = await call("GET", `/v1/access-groups?teamId=${teamId}`);
console.log("status:", r.status, JSON.stringify(r.body).slice(0, 400));

console.log("\n=== USER (account) ===");
r = await call("GET", `/v2/user`);
console.log("status:", r.status, JSON.stringify(r.body).slice(0, 600));

console.log("\n=== CURRENT auth context for token ===");
r = await call("GET", `/v5/user/tokens`);
console.log("status:", r.status, JSON.stringify(r.body).slice(0, 400));
