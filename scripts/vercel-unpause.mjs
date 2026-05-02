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
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null; try { json = text ? JSON.parse(text) : null; } catch (_e) {}
  return { status: res.status, body: json ?? text };
}

const tries = [
  ["DELETE", `/v9/projects/${projectId}/pause`, undefined],
  ["DELETE", `/v1/projects/${projectId}/pause`, undefined],
  ["POST", `/v9/projects/${projectId}/unpause`, {}],
  ["POST", `/v1/projects/${projectId}/unpause`, {}],
  ["POST", `/v9/projects/${projectId}/pause`, { paused: false }],
  ["POST", `/v9/projects/${projectId}/pause`, { resume: true }],
  ["PATCH", `/v9/projects/${projectId}/pause`, { paused: false }],
  ["PATCH", `/v9/projects/${projectId}`, { paused: false }],
  ["PUT", `/v9/projects/${projectId}/pause`, { paused: false }],
  ["POST", `/v9/projects/${projectId}/resume`, {}],
];

for (const [m, p, b] of tries) {
  const r = await call(m, p, b);
  console.log(m.padEnd(6), p, "->", r.status, typeof r.body === "object" ? JSON.stringify(r.body).slice(0, 200) : String(r.body).slice(0, 200));
  // Check if paused state changed.
  const st = await call("GET", `/v9/projects/${projectId}`);
  if (typeof st.body === "object" && st.body.paused === false) {
    console.log("\n*** UNPAUSED via:", m, p, JSON.stringify(b));
    break;
  }
}

const final = await call("GET", `/v9/projects/${projectId}`);
console.log("\nFINAL paused:", typeof final.body === "object" ? JSON.stringify(final.body.paused) : "?");
