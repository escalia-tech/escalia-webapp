#!/usr/bin/env node
import {
  buildImageReference,
  buildOciLabels,
  readPackageMetadata,
  resolveGitRevision,
  resolveGitSource,
} from "./image-metadata.mjs";
import { spawnSync } from "node:child_process";

const registry = process.env.DOCKER_REGISTRY;
const namespace = process.env.DOCKER_NAMESPACE;
const tagLatest = process.env.DOCKER_TAG_LATEST === "true";

function run() {
  const { name, version } = readPackageMetadata();
  const ref = buildImageReference({ registry, namespace });
  const { labels } = buildOciLabels();
  const revision = resolveGitRevision();
  const source = resolveGitSource();

  const args = [
    "build",
    ...Object.entries(labels).flatMap(([key, value]) => ["--label", `${key}=${value}`]),
    "--build-arg",
    `ESCALIA_APP_NAME=${name}`,
    "--build-arg",
    `ESCALIA_APP_VERSION=${version}`,
    ...(revision ? ["--build-arg", `ESCALIA_APP_REVISION=${revision}`] : []),
    ...(source ? ["--build-arg", `ESCALIA_APP_SOURCE=${source}`] : []),
    "-t",
    ref.image,
  ];

  if (tagLatest) {
    args.push("-t", ref.latestTag);
  }

  args.push(".");

  process.stdout.write(`Building image ${ref.image}\n`);
  if (tagLatest) {
    process.stdout.write(`Also tagging ${ref.latestTag}\n`);
  }

  const result = spawnSync("docker", args, { stdio: "inherit" });
  if (result.error) {
    process.stderr.write(`docker build failed: ${result.error.message}\n`);
    process.exit(1);
  }
  process.exit(result.status ?? 1);
}

run();
