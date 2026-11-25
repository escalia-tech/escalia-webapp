#!/usr/bin/env node
import {
  buildImageReference,
  buildOciLabels,
  readPackageMetadata,
  resolveGitRevision,
  resolveGitSource,
} from "./image-metadata.mjs";
/**
 * Multi-architecture build via Docker Buildx.
 *
 * Local single-platform load: DOCKER_OUTPUT=load npm run docker:build:multiarch
 * OCI archive export:      DOCKER_OUTPUT=oci DOCKER_OCI_DEST=./escalia-webapp.oci npm run docker:build:multiarch
 * Registry publish:        DOCKER_REGISTRY=registry.example.com DOCKER_PUSH=true npm run docker:build:multiarch
 */
import { spawnSync } from "node:child_process";

const platforms = process.env.DOCKER_PLATFORMS ?? "linux/amd64,linux/arm64";
const outputMode = process.env.DOCKER_OUTPUT ?? "load";
const push = process.env.DOCKER_PUSH === "true";
const tagLatest = process.env.DOCKER_TAG_LATEST === "true";
const builderName = process.env.DOCKER_BUILDX_BUILDER ?? "escalia-builder";

function ensureBuildx() {
  const inspect = spawnSync("docker", ["buildx", "inspect", builderName], { stdio: "ignore" });
  if (inspect.status === 0) return;

  const create = spawnSync(
    "docker",
    ["buildx", "create", "--name", builderName, "--driver", "docker-container", "--use"],
    { stdio: "inherit" },
  );
  if (create.status !== 0) process.exit(create.status ?? 1);
}

function run() {
  if (outputMode === "load" && platforms.includes(",")) {
    process.stderr.write(
      "DOCKER_OUTPUT=load supports one platform only. Set DOCKER_PLATFORMS=linux/amd64 or use DOCKER_OUTPUT=oci or DOCKER_PUSH=true.\n",
    );
    process.exit(2);
  }

  ensureBuildx();

  const { name, version } = readPackageMetadata();
  const ref = buildImageReference({
    registry: process.env.DOCKER_REGISTRY,
    namespace: process.env.DOCKER_NAMESPACE,
  });
  const { labels } = buildOciLabels();
  const revision = resolveGitRevision();
  const source = resolveGitSource();

  const args = [
    "buildx",
    "build",
    "--platform",
    platforms,
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

  if (tagLatest) args.push("-t", ref.latestTag);

  if (push) {
    args.push("--push");
  } else if (outputMode === "oci") {
    const dest = process.env.DOCKER_OCI_DEST ?? `./dist/${name}-${version}.oci.tar`;
    args.push("--output", `type=oci,dest=${dest}`);
    process.stdout.write(`Exporting OCI archive to ${dest}\n`);
  } else {
    args.push("--load");
  }

  args.push(".");

  process.stdout.write(`Buildx ${platforms} → ${ref.image} (output=${push ? "push" : outputMode})\n`);

  const result = spawnSync("docker", args, { stdio: "inherit" });
  if (result.error) {
    process.stderr.write(`docker buildx failed: ${result.error.message}\n`);
    process.exit(1);
  }
  process.exit(result.status ?? 1);
}

run();
