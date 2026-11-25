#!/usr/bin/env node
import { buildImageReference, buildOciLabels } from "./image-metadata.mjs";

try {
  const ref = buildImageReference({
    registry: process.env.DOCKER_REGISTRY,
    namespace: process.env.DOCKER_NAMESPACE,
  });
  const { labels, revision, source } = buildOciLabels();

  process.stdout.write(`Application : ${ref.name} ${ref.version}\n`);
  process.stdout.write(`Image       : ${ref.image}\n`);
  if (revision) {
    process.stdout.write(`Revision    : ${revision}\n`);
  }
  if (source) {
    process.stdout.write(`Source      : ${source}\n`);
  }
  process.stdout.write("OCI labels  :\n");
  for (const [key, value] of Object.entries(labels)) {
    process.stdout.write(`  ${key}=${value}\n`);
  }
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
}
