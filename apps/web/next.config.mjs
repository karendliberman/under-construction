/** @type {import('next').NextConfig} */
const nextConfig = {
  // Emits a self-contained server bundle so the Docker runtime stage needs no
  // node_modules. This is what keeps the web image small and portable.
  output: "standalone",
  // The repo root, not apps/web — the standalone tracer has to follow imports
  // into packages/db.
  outputFileTracingRoot: new URL("../../", import.meta.url).pathname,
  typedRoutes: true,
};

export default nextConfig;
