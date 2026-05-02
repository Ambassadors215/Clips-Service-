#!/usr/bin/env node
/** Dump every field on the project so we can see if anything hidden gates access. */
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
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null; try { json = text ? JSON.parse(text) : null; } catch (_e) {}
  return { status: res.status, body: json ?? text };
}

const r = await call("GET", `/v9/projects/${projectId}`);
console.log("status:", r.status);

if (r.body && typeof r.body === "object") {
  const protectionLike = [
    "ssoProtection", "passwordProtection", "trustedIps",
    "deploymentProtection", "publicSource", "concurrencyBucketName",
    "gitForkProtection", "skipGitConnectDuringLink", "passwordProtectionSalt",
    "skewProtectionMaxAge", "framework", "rootDirectory", "directoryListing",
    "live", "v0", "limited", "paused",
  ];
  console.log("\nProtection-relevant fields:");
  for (const k of protectionLike) {
    if (k in r.body) console.log(" ", k, ":", JSON.stringify(r.body[k]));
  }

  console.log("\nAll top-level keys:");
  console.log(" ", Object.keys(r.body).sort().join(", "));
}
