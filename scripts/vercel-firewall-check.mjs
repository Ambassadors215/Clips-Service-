#!/usr/bin/env node
/** Read all firewall / attack-challenge / WAF configs that could cause 403s. */
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

async function get(path) {
  const res = await fetch(`https://api.vercel.com${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await res.text();
  let json = null; try { json = text ? JSON.parse(text) : null; } catch (_e) {}
  return { status: res.status, body: json ?? text };
}

const paths = [
  `/v1/security/firewall/config?projectId=${projectId}`,
  `/v1/security/attack-mode?projectId=${projectId}`,
  `/v1/security/firewall/conditions?projectId=${projectId}`,
  `/v9/projects/${projectId}/protection-bypass`,
  `/v9/projects/${projectId}/domains`,
];

for (const p of paths) {
  console.log("\n>>>", p);
  const r = await get(p);
  console.log("  status:", r.status);
  if (typeof r.body === "object") {
    console.log(JSON.stringify(r.body, null, 2).slice(0, 1500));
  } else {
    console.log(String(r.body).slice(0, 600));
  }
}
