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
  async redirects() {
    return [
      // 1. Baseball Resultados clean route 301 redirects
      {
        source: "/resultados",
        has: [{ type: "query", key: "liga", value: "mlb" }],
        destination: "/resultados/mlb",
        permanent: true,
      },
      {
        source: "/resultados",
        has: [{ type: "query", key: "liga", value: "lidom" }],
        destination: "/resultados/lidom",
        permanent: true,
      },
      {
        source: "/resultados",
        has: [{ type: "query", key: "liga", value: "lmp" }],
        destination: "/resultados/lmp",
        permanent: true,
      },
      {
        source: "/resultados",
        has: [{ type: "query", key: "liga", value: "lvbp" }],
        destination: "/resultados",
        permanent: true,
      },
      // 2. Baseball Posiciones clean route 301 redirects
      {
        source: "/posiciones",
        has: [{ type: "query", key: "liga", value: "mlb" }],
        destination: "/posiciones/mlb",
        permanent: true,
      },
      {
        source: "/posiciones",
        has: [{ type: "query", key: "liga", value: "lidom" }],
        destination: "/posiciones/lidom",
        permanent: true,
      },
      {
        source: "/posiciones",
        has: [{ type: "query", key: "liga", value: "lmp" }],
        destination: "/posiciones/lmp",
        permanent: true,
      },
      {
        source: "/posiciones",
        has: [{ type: "query", key: "liga", value: "lvbp" }],
        destination: "/posiciones",
        permanent: true,
      },
      // 3. Baseball Calendario clean route 301 redirects
      {
        source: "/calendario",
        has: [{ type: "query", key: "liga", value: "mlb" }],
        destination: "/calendario/mlb",
        permanent: true,
      },
      {
        source: "/calendario",
        has: [{ type: "query", key: "liga", value: "lidom" }],
        destination: "/calendario/lidom",
        permanent: true,
      },
      {
        source: "/calendario",
        has: [{ type: "query", key: "liga", value: "lmp" }],
        destination: "/calendario/lmp",
        permanent: true,
      },
      {
        source: "/calendario",
        has: [{ type: "query", key: "liga", value: "lvbp" }],
        destination: "/calendario",
        permanent: true,
      },
      // 4. Soccer clean route 301 redirects
      {
        source: "/futbol",
        has: [{ type: "query", key: "liga", value: "futve" }],
        destination: "/futbol/futve",
        permanent: true,
      },
      {
        source: "/futbol",
        has: [{ type: "query", key: "league", value: "futve" }],
        destination: "/futbol/futve",
        permanent: true,
      },
      {
        source: "/futbol",
        has: [{ type: "query", key: "liga", value: "champions" }],
        destination: "/futbol/champions",
        permanent: true,
      },
      {
        source: "/futbol",
        has: [{ type: "query", key: "league", value: "champions" }],
        destination: "/futbol/champions",
        permanent: true,
      },
      {
        source: "/futbol",
        has: [{ type: "query", key: "liga", value: "uefa.champions" }],
        destination: "/futbol/champions",
        permanent: true,
      },
      {
        source: "/futbol",
        has: [{ type: "query", key: "league", value: "uefa.champions" }],
        destination: "/futbol/champions",
        permanent: true,
      },
      {
        source: "/futbol",
        has: [{ type: "query", key: "liga", value: "laliga" }],
        destination: "/futbol/laliga",
        permanent: true,
      },
      {
        source: "/futbol",
        has: [{ type: "query", key: "league", value: "laliga" }],
        destination: "/futbol/laliga",
        permanent: true,
      },
      {
        source: "/futbol",
        has: [{ type: "query", key: "liga", value: "esp.1" }],
        destination: "/futbol/laliga",
        permanent: true,
      },
      {
        source: "/futbol",
        has: [{ type: "query", key: "liga", value: "premier" }],
        destination: "/futbol/premier",
        permanent: true,
      },
      {
        source: "/futbol",
        has: [{ type: "query", key: "league", value: "premier" }],
        destination: "/futbol/premier",
        permanent: true,
      },
      {
        source: "/futbol",
        has: [{ type: "query", key: "liga", value: "eng.1" }],
        destination: "/futbol/premier",
        permanent: true,
      },
      {
        source: "/futbol",
        has: [{ type: "query", key: "liga", value: "serie-a" }],
        destination: "/futbol/serie-a",
        permanent: true,
      },
      {
        source: "/futbol",
        has: [{ type: "query", key: "league", value: "serie-a" }],
        destination: "/futbol/serie-a",
        permanent: true,
      },
      {
        source: "/futbol",
        has: [{ type: "query", key: "liga", value: "ita.1" }],
        destination: "/futbol/serie-a",
        permanent: true,
      },
      {
        source: "/futbol",
        has: [{ type: "query", key: "liga", value: "bundesliga" }],
        destination: "/futbol/bundesliga",
        permanent: true,
      },
      {
        source: "/futbol",
        has: [{ type: "query", key: "league", value: "bundesliga" }],
        destination: "/futbol/bundesliga",
        permanent: true,
      },
      {
        source: "/futbol",
        has: [{ type: "query", key: "liga", value: "ger.1" }],
        destination: "/futbol/bundesliga",
        permanent: true,
      },
      {
        source: "/futbol",
        has: [{ type: "query", key: "liga", value: "ligue-1" }],
        destination: "/futbol/ligue-1",
        permanent: true,
      },
      {
        source: "/futbol",
        has: [{ type: "query", key: "league", value: "ligue-1" }],
        destination: "/futbol/ligue-1",
        permanent: true,
      },
      {
        source: "/futbol",
        has: [{ type: "query", key: "liga", value: "fra.1" }],
        destination: "/futbol/ligue-1",
        permanent: true,
      },
      // 5. Cleanup aliases for LVBP queries
      {
        source: "/inicio",
        has: [{ type: "query", key: "liga", value: "lvbp" }],
        destination: "/inicio",
        permanent: true,
      },
      {
        source: "/lideres",
        has: [{ type: "query", key: "liga", value: "lvbp" }],
        destination: "/lideres",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
