//@ts-check

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Nx libs are linked as raw TS source (package.json "exports" pointing at src/index.ts,
  // not a prebuilt dist) -- Next only runs its own transform over transpilePackages entries.
  transpilePackages: ['@cairn/ui', '@cairn/shared-constants'],
  // Emits .next/standalone -- a self-contained server with only the node_modules it actually
  // needs, which is what infra/docker/Dockerfile.web copies into the runtime image.
  output: 'standalone',
  // web (Vercel) and api (Render) are different domains, but apps/api's auth cookies are
  // httpOnly and scoped to whichever domain actually responds to the browser. Proxying /api/*
  // through this same origin makes every browser-facing request (including the Google OAuth
  // callback) same-site, so the session cookie set during that flow is actually visible on
  // subsequent requests here -- see docs/adr/0009-cross-domain-auth-proxy.md.
  async rewrites() {
    const apiBaseUrl = process.env.API_BASE_URL ?? 'http://localhost:3000/api';
    return [{ source: '/api/:path*', destination: `${apiBaseUrl}/:path*` }];
  },
};

module.exports = nextConfig;
