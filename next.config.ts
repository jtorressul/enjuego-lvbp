import type { NextConfig } from "next";

if (process.env.CF_PAGES || process.env.CF_DEV) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { initOpenNextCloudflareForDev } = require("@opennextjs/cloudflare");
    initOpenNextCloudflareForDev();
  } catch {}
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.mlbstatic.com",
      },
      {
        protocol: "https",
        hostname: "www.mlbstatic.com",
      },
    ],
  },
};

export default nextConfig;
