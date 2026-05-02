#!/usr/bin/env node
/**
 * Delete every non-current deployment for this project.
 * Keeps only the current production READY deployment to remove old per-deployment URLs
 * that may be holding stale protection state.
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

async function call(method, path) {
  const res = await fetch(`https://api.vercel.com${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await res.text();
  let json = null; try { json = text ? JSON.parse(text) : null; } catch (_e) {}
  return { status: res.status, body: json ?? text };
}

const list = await call("GET", `/v6/deployments?projectId=${projectId}&limit=100`);
const deps = list.body?.deployments || [];

const ready = deps.filter((d) => d.state === "READY" && d.target === "production");
ready.sort((a, b) => (b.created || 0) - (a.created || 0));
const keep = ready[0];

if (!keep) {
  console.error("No production READY deployment found — aborting.");
  process.exit(1);
}

console.log("KEEP:", keep.url, "(", new Date(keep.created).toISOString(), ")");
console.log();

for (const d of deps) {
  if (d.uid === keep.uid) continue;
  const r = await call("DELETE", `/v13/deployments/${d.uid}`);
  console.log(r.status === 200 ? "deleted" : `FAIL ${r.status}`, " ", d.url, " ", d.state);
}
