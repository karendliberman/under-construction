import { readFileSync } from "node:fs";
import { parse } from "yaml";

/**
 * The playbook registry is read HERE, at build time, and baked into the bundle
 * as JSON.
 *
 * Two reasons. Practically, a runtime read that walks up out of the project
 * root makes Turbopack trace the whole repo into the server bundle. But it is
 * also the better design: the web service now performs no filesystem access
 * for playbooks at all, which makes invariant 2 structural rather than
 * something the code has to keep choosing. Changing the registry requires a
 * rebuild — which it already did, since both CI and Render rebuild the web
 * image when playbooks/registry.yaml changes.
 *
 * Labels and filenames only. Still no prose.
 */
const registry = parse(
  readFileSync(new URL("../../playbooks/registry.yaml", import.meta.url), "utf8"),
);

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Emits a self-contained server bundle so the Docker runtime stage needs no
  // node_modules. This is what keeps the web image small and portable.
  output: "standalone",
  // The repo root, not apps/web — the standalone tracer has to follow imports
  // into packages/db.
  outputFileTracingRoot: new URL("../../", import.meta.url).pathname,
  typedRoutes: true,
  env: {
    UC_PLAYBOOK_REGISTRY: JSON.stringify(registry),
  },
};

export default nextConfig;
