/**
 * Optional pre-deploy step. Rewrites public URLs from the environment.
 *
 *   PRO_CHECKOUT_URL=https://pay.example/tab-commander \
 *   SITE_URL=https://example.com/ \
 *   node scripts/apply-env.js
 *
 * Safe to run with neither variable set (no changes).
 * Does not contact a payment provider and does not read secrets beyond
 * the public checkout link you pass in.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const configPath = path.join(root, "config.js");

function fail(message) {
  console.error(message);
  process.exit(1);
}

function assertEmbeddable(value, name) {
  if (typeof value !== "string" || value.length === 0 || value.length > 500) {
    fail(name + " must be a non-empty URL under 500 characters.");
  }
  if (/[\s"'\\<>]/.test(value)) {
    fail(name + " cannot contain spaces, quotes, or brackets.");
  }
}

function assertUrl(value, name, { allowHttpLocal = false } = {}) {
  assertEmbeddable(value, name);
  let url;
  try {
    url = new URL(value);
  } catch (err) {
    fail(name + " is not a valid absolute URL.");
  }
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  const httpsOk = url.protocol === "https:";
  const httpLocalOk = allowHttpLocal && url.protocol === "http:" && local;
  if (!httpsOk && !httpLocalOk) {
    fail(name + " must use https.");
  }
  return url;
}

function readConfigValue(source, key) {
  const match = source.match(new RegExp(key + ':\\s*"([^"]*)"'));
  if (!match) fail("Could not find " + key + " in config.js.");
  return match[1];
}

function replaceValue(source, key, next) {
  const pattern = new RegExp("(" + key + ':\\s*")[^"]*(")');
  if (!pattern.test(source)) fail("Could not update " + key + ".");
  return source.replace(pattern, "$1" + next + "$2");
}

let config = fs.readFileSync(configPath, "utf8");
const currentSite = readConfigValue(config, "SITE_URL");
const currentCheckout = readConfigValue(config, "PRO_CHECKOUT_URL");

let nextCheckout = currentCheckout;
let nextSite = currentSite;
let changed = false;

if (process.env.PRO_CHECKOUT_URL) {
  assertUrl(process.env.PRO_CHECKOUT_URL, "PRO_CHECKOUT_URL");
  nextCheckout = process.env.PRO_CHECKOUT_URL;
}

if (process.env.SITE_URL) {
  const parsed = assertUrl(process.env.SITE_URL, "SITE_URL", { allowHttpLocal: true });
  nextSite = parsed.href.endsWith("/") ? parsed.href : parsed.href + "/";
  assertEmbeddable(nextSite, "SITE_URL");
}

if (nextCheckout !== currentCheckout) {
  config = replaceValue(config, "PRO_CHECKOUT_URL", nextCheckout);
  changed = true;
}

if (nextSite !== currentSite) {
  config = replaceValue(config, "SITE_URL", nextSite);
  changed = true;
  const files = ["index.html", "robots.txt", "sitemap.xml"];
  for (const name of files) {
    const filePath = path.join(root, name);
    if (!fs.existsSync(filePath)) continue;
    const original = fs.readFileSync(filePath, "utf8");
    if (!original.includes(currentSite)) {
      console.warn("No SITE_URL match in " + name + "; left unchanged.");
      continue;
    }
    fs.writeFileSync(filePath, original.split(currentSite).join(nextSite));
  }
}

if (changed) {
  fs.writeFileSync(configPath, config);
  console.log("Updated landing config.");
  if (nextCheckout !== currentCheckout) console.log("PRO_CHECKOUT_URL set.");
  if (nextSite !== currentSite) console.log("SITE_URL set to " + nextSite);
} else {
  console.log("No PRO_CHECKOUT_URL or SITE_URL provided; landing config unchanged.");
}
