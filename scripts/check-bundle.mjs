#!/usr/bin/env node
/**
 * Scans the production client output (`.next/static`) for material that must never reach the browser:
 * server-only libraries, secret variable names, and the demo-session signing material.
 *
 * Usage: npm run build && npm run check:bundle
 * Exit code 1 when a forbidden marker is found. The scan reports file names and markers only, never
 * file contents, so a leak is not copied into the logs.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(process.cwd(), ".next", "static");

/** Markers that must never appear in client bundles. */
const FORBIDDEN = [
  { name: "server logger (pino)", pattern: /pino-std-serializers|sonic-boom|thread-stream/ },
  { name: "DEMO_SESSION_SECRET variable", pattern: /DEMO_SESSION_SECRET/ },
  { name: "demo session HMAC helper", pattern: /createHmac/ },
  { name: "server-only marker", pattern: /server-only/ },
  { name: "AsyncLocalStorage request context", pattern: /AsyncLocalStorage/ },
  { name: "Bearer token literal", pattern: /Bearer\s+[A-Za-z0-9._-]{20,}/ },
  { name: "private key block", pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
];

function* walk(directory) {
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) yield* walk(path);
    else if (/\.(js|css|html|json|map)$/.test(entry)) yield path;
  }
}

let scanned = 0;
const findings = [];

try {
  statSync(ROOT);
} catch {
  process.stderr.write("check-bundle: .next/static not found. Run `npm run build` first.\n");
  process.exit(2);
}

for (const file of walk(ROOT)) {
  scanned += 1;
  const content = readFileSync(file, "utf8");
  for (const { name, pattern } of FORBIDDEN) {
    if (pattern.test(content)) findings.push({ file: file.replace(`${process.cwd()}/`, ""), marker: name });
  }
}

if (findings.length > 0) {
  process.stderr.write(`check-bundle: ${findings.length} forbidden marker(s) in client output:\n`);
  for (const finding of findings) process.stderr.write(`  - ${finding.marker}: ${finding.file}\n`);
  process.exit(1);
}

process.stdout.write(`check-bundle: OK (${scanned} client files scanned, ${FORBIDDEN.length} markers checked).\n`);
