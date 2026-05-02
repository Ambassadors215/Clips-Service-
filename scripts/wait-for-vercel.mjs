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
const targetSha = process.argv[2];

async function call(path) {
  const r = await fetch(`https://api.vercel.com${path}`, { headers: { Authorization: `Bearer ${token}` } });
  return r.json();
}

console.log("Waiting for deployment of", targetSha || "(latest)", "...\n");

const deadline = Date.now() + 5 * 60 * 1000;
let lastState = "";
while (Date.now() < deadline) {
  const list = await call(`/v6/deployments?projectId=${projectId}&limit=5&target=production`);
  const dep = targetSha
    ? list.deployments?.find(d => d.meta?.githubCommitSha?.startsWith(targetSha))
    : list.deployments?.[0];
  if (dep) {
    if (dep.state !== lastState) {
      console.log(`[${new Date().toISOString().slice(11,19)}] ${dep.uid}  state=${dep.state}  sha=${(dep.meta?.githubCommitSha || "").slice(0,7)}`);
      lastState = dep.state;
    }
    if (dep.state === "READY") {
      console.log("\nReady. URL:", dep.url);
      const r = await fetch(`https://${dep.url}/`);
      console.log("HTTP:", r.status);
      const text = await r.text();
      console.log("Has og-cover.svg in head:", text.includes("og-cover.svg"));
      console.log("Title present:", /<title>Clip Services/.test(text));
      process.exit(0);
    }
    if (dep.state === "ERROR" || dep.state === "CANCELED") {
      console.log("\nDeployment failed:", dep.state);
      process.exit(2);
    }
  }
  await new Promise(r => setTimeout(r, 6000));
}
console.log("Timed out.");
process.exit(3);
