#!/usr/bin/env node
import { buildImageReference } from "./image-metadata.mjs";
import { spawnSync } from "node:child_process";

const CONTAINER_NAME = process.env.ESCALIA_CONTAINER_NAME ?? "escalia-webapp";
const hostPort = process.env.ESCALIA_HOST_PORT ?? "3000";

function run() {
  const ref = buildImageReference({
    registry: process.env.DOCKER_REGISTRY,
    namespace: process.env.DOCKER_NAMESPACE,
  });

  const envArgs = ["-e", "NODE_ENV=production", "-e", `APP_ENV=${process.env.APP_ENV ?? "staging"}`];

  if (process.env.APP_URL) envArgs.push("-e", `APP_URL=${process.env.APP_URL}`);
  if (process.env.LOG_LEVEL) envArgs.push("-e", `LOG_LEVEL=${process.env.LOG_LEVEL}`);
  if (process.env.LOG_FORMAT) envArgs.push("-e", `LOG_FORMAT=${process.env.LOG_FORMAT}`);

  const args = [
    "run",
    "--rm",
    "-d",
    "--name",
    CONTAINER_NAME,
    "-p",
    `${hostPort}:3000`,
    "--stop-timeout",
    "30",
    ...envArgs,
    ref.image,
  ];

  process.stdout.write(`Starting ${ref.image} as ${CONTAINER_NAME} on port ${hostPort}\n`);

  const result = spawnSync("docker", args, { stdio: "inherit" });
  if (result.error) {
    process.stderr.write(`docker run failed: ${result.error.message}\n`);
    process.exit(1);
  }
  process.exit(result.status ?? 1);
}

run();
