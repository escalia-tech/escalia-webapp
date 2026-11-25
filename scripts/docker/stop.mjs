#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const CONTAINER_NAME = process.env.ESCALIA_CONTAINER_NAME ?? "escalia-webapp";

function run() {
  process.stdout.write(`Stopping container ${CONTAINER_NAME}\n`);
  const result = spawnSync("docker", ["stop", CONTAINER_NAME], { stdio: "inherit" });
  if (result.error) {
    process.stderr.write(`docker stop failed: ${result.error.message}\n`);
    process.exit(1);
  }
  process.exit(result.status ?? 1);
}

run();
