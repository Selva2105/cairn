//@ts-check

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Nx libs are linked as raw TS source (package.json "exports" pointing at src/index.ts,
  // not a prebuilt dist) -- Next only runs its own transform over transpilePackages entries.
  transpilePackages: ['@cairn/ui', '@cairn/shared-constants'],
  // Emits .next/standalone -- a self-contained server with only the node_modules it actually
  // needs, which is what infra/docker/Dockerfile.web copies into the runtime image.
  output: 'standalone',
};

module.exports = nextConfig;
