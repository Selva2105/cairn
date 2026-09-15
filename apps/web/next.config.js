//@ts-check

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Nx libs are linked as raw TS source (package.json "exports" pointing at src/index.ts,
  // not a prebuilt dist) -- Next only runs its own transform over transpilePackages entries.
  transpilePackages: ['@cairn/ui', '@cairn/shared-constants'],
};

module.exports = nextConfig;
