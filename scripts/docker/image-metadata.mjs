#!/usr/bin/env node
/**
 * Single source for Docker image naming and OCI label values — name and version always come from package.json.
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const PACKAGE_NAME_PATTERN = /^[a-z0-9][a-z0-9._-]*$/i;
const PACKAGE_VERSION_PATTERN = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/;

export function readPackageMetadata(cwd = process.cwd()) {
  const path = join(cwd, "package.json");
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(`image-metadata: cannot read package.json (${error instanceof Error ? error.message : "unknown"})`);
  }

  const name = typeof parsed.name === "string" ? parsed.name.trim() : "";
  const version = typeof parsed.version === "string" ? parsed.version.trim() : "";
  const description = typeof parsed.description === "string" ? parsed.description.trim() : "";

  if (!PACKAGE_NAME_PATTERN.test(name)) {
    throw new Error(`image-metadata: invalid package name "${name}"`);
  }
  if (!PACKAGE_VERSION_PATTERN.test(version)) {
    throw new Error(`image-metadata: invalid package version "${version}"`);
  }

  return { name, version, description };
}

export function resolveGitRevision(cwd = process.cwd()) {
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8", cwd, stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return undefined;
  }
}

export function resolveGitSource(cwd = process.cwd()) {
  try {
    const raw = execSync("git config --get remote.origin.url", {
      encoding: "utf8",
      cwd,
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (!raw) return undefined;
    return raw.replace(/\.git$/i, "");
  } catch {
    return undefined;
  }
}

/**
 * @param {{ registry?: string; namespace?: string; cwd?: string }} options
 */
export function buildImageReference(options = {}) {
  const { name, version } = readPackageMetadata(options.cwd);
  const segments = [];
  if (options.registry?.trim()) segments.push(options.registry.trim().replace(/\/$/, ""));
  const imageName = options.namespace?.trim() ? `${options.namespace.trim()}/${name}` : name;
  segments.push(imageName);
  const repository = segments.join("/");
  return {
    name,
    version,
    repository,
    image: `${repository}:${version}`,
    latestTag: `${repository}:latest`,
  };
}

export function buildOciLabels(options = {}) {
  const meta = readPackageMetadata(options.cwd);
  const revision = resolveGitRevision(options.cwd);
  const source = resolveGitSource(options.cwd);
  const created = new Date().toISOString();
  const labels = {
    "org.opencontainers.image.title": meta.name,
    "org.opencontainers.image.version": meta.version,
    "org.opencontainers.image.created": created,
  };
  if (meta.description) {
    labels["org.opencontainers.image.description"] = meta.description;
  }
  if (revision) {
    labels["org.opencontainers.image.revision"] = revision;
  }
  if (source) {
    labels["org.opencontainers.image.source"] = source;
  }
  return { labels, created, revision, source, meta };
}

function formatLabelsArg(labels) {
  return Object.entries(labels).flatMap(([key, value]) => ["--label", `${key}=${value}`]);
}

function printJson(payload) {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

const isMain = process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1];

if (isMain) {
  const mode = process.argv[2] ?? "reference";
  const registry = process.env.DOCKER_REGISTRY;
  const namespace = process.env.DOCKER_NAMESPACE;

  try {
    if (mode === "reference") {
      printJson(buildImageReference({ registry, namespace }));
    } else if (mode === "labels") {
      const { labels } = buildOciLabels();
      printJson({ labels, dockerCli: formatLabelsArg(labels) });
    } else if (mode === "env") {
      const ref = buildImageReference({ registry, namespace });
      const { revision, source } = buildOciLabels();
      printJson({
        ESCALIA_IMAGE: ref.image,
        ESCALIA_APP_NAME: ref.name,
        ESCALIA_APP_VERSION: ref.version,
        ...(revision ? { ESCALIA_APP_REVISION: revision } : {}),
        ...(source ? { ESCALIA_APP_SOURCE: source } : {}),
      });
    } else {
      process.stderr.write("Usage: node scripts/docker/image-metadata.mjs [reference|labels|env]\n");
      process.exit(2);
    }
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}
