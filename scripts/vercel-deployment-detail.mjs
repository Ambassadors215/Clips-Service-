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

async function call(path) {
  const r = await fetch(`https://api.vercel.com${path}`, { headers: { Authorization: `Bearer ${token}` } });
  return r.json();
}

const list = await call(`/v6/deployments?projectId=${projectId}&limit=1`);
const dep = list.deployments?.[0];
console.log("Deployment:", dep.uid, dep.url);

const detail = await call(`/v13/deployments/${dep.uid}`);
const interesting = ["ogImage","screenshot","thumbnail","preview","openGraph","ogImageUrl","previewUrl","screenshotUrl","aliasAssigned","public","autoAssignCustomDomains","ssoProtection","passwordProtection","target","status","state"];
console.log("\nInteresting fields:");
for (const k of interesting) if (k in detail) console.log(" ", k, ":", JSON.stringify(detail[k]));

console.log("\nAll top-level keys:", Object.keys(detail).sort().join(", "));
