#!/usr/bin/env node
/** Last deployments for clips-service (needs VERCEL_TOKEN in .env.local). */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
function loadDotEnv(name) {
  const p = resolve(root, name);
  if (!existsSync(p)) return;
  const raw = readFileSync(p, "utf8");
  for (const line of raw.split("\n")) {
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

const qs = new URLSearchParams({ projectId, limit: "8" });
if (teamId) qs.set("teamId", teamId);
const res = await fetch(`https://api.vercel.com/v6/deployments?${qs}`, {
  headers: { Authorization: `Bearer ${token}` },
});
const j = await res.json();
if (!res.ok) {
  console.error(res.status, JSON.stringify(j).slice(0, 500));
  process.exit(1);
}
const rows = (j.deployments || []).map((d) => ({
  state: d.state,
  url: d.url,
  created: d.created,
  name: d.name,
  meta: d.meta?.githubCommitMessage || d.meta?.githubCommitSha || "",
}));
console.log(JSON.stringify(rows, null, 2));
