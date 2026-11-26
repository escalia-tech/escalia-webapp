import { describe, expect, it } from "vitest";

import { buildImageReference, buildOciLabels, readPackageMetadata } from "../../scripts/docker/image-metadata.mjs";

describe("scripts/docker/image-metadata.mjs", () => {
  it("reads name and version from package.json", () => {
    const meta = readPackageMetadata();
    expect(meta.name).toBe("escalia-webapp");
    expect(meta.version).toBe("0.1.0");
    expect(meta.description.length).toBeGreaterThan(0);
  });

  it("builds image reference escalia-webapp:0.1.0", () => {
    const ref = buildImageReference();
    expect(ref.image).toBe("escalia-webapp:0.1.0");
  });

  it("supports registry and namespace without changing app version", () => {
    const ref = buildImageReference({ registry: "registry.example.com", namespace: "escalia" });
    expect(ref.image).toBe("registry.example.com/escalia/escalia-webapp:0.1.0");
    expect(ref.version).toBe("0.1.0");
  });

  it("produces OCI labels with title and version", () => {
    const { labels } = buildOciLabels();
    expect(labels["org.opencontainers.image.title"]).toBe("escalia-webapp");
    expect(labels["org.opencontainers.image.version"]).toBe("0.1.0");
    expect(labels["org.opencontainers.image.created"]).toBeTruthy();
  });
});
