module.exports = {
  apps: [
    {
      name: "enjuego",
      cwd: "/var/www/enjuego",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      instances: 4,
      exec_mode: "cluster",
      autorestart: true,
      watch: false,
      max_memory_restart: "3500M",
      node_args: "--max-old-space-size=3584",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        TZ: "America/Caracas",
      },
    },
    {
      name: "enjuego-daemon",
      cwd: "/var/www/enjuego",
      script: "npx",
      args: "tsx scripts/live-daemon.ts",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "1024M",
      node_args: "--max-old-space-size=1024",
      env: {
        NODE_ENV: "production",
        TZ: "America/Caracas",
      },
    },
  ],
};
