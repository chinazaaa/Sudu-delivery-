/** @type {import('next').NextConfig} */
const nextConfig = {
  // The auto-generated AGENTS.md/CLAUDE.md are not wanted in this repo.
  agentRules: false,
  experimental: {
    // A photograph off a phone is several megabytes; the default cap of one
    // would reject most of them on the menu editor's Save.
    serverActions: { bodySizeLimit: "10mb" },
  },
};

export default nextConfig;
