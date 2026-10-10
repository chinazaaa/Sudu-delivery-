/** @type {import('next').NextConfig} */
const nextConfig = {
  // The auto-generated AGENTS.md/CLAUDE.md are not wanted in this repo.
  agentRules: false,
  experimental: {
    // A photograph off a phone is several megabytes; the default cap of one
    // would reject most of them on the menu editor's Save.
    serverActions: { bodySizeLimit: "10mb" },
  },
  /*
   * What never needs to travel with a serverless function.
   *
   * Every page and route here is dynamic, so each one is deployed as its own
   * function with its own copy of whatever the tracer thinks it needs. The
   * tracer errs towards including things, and Vercel keeps a copy per
   * deployment, which is how a shop this size filled ten gigabytes of
   * function storage. None of these is ever read at runtime: the SQL is run
   * by hand in Supabase, the scripts are run on a laptop, the app is built by
   * EAS, and the tests are run before a push.
   */
  outputFileTracingExcludes: {
    "**": [
      "./supabase/**",
      "./scripts/**",
      "./mobile/**",
      "./docs/**",
      "./test/**",
      "./node_modules/sharp/**",
      "./node_modules/@img/**",
      "./node_modules/typescript/**",
      "./node_modules/tailwindcss/**",
      "./node_modules/.bin/**",
    ],
  },
};

export default nextConfig;
