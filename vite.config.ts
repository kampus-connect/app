import { defineConfig } from "vite";

export default defineConfig({
  ssr: {
    // better-sqlite3 is a native Node.js module — must not be bundled
    external: ["better-sqlite3"],
  },
  server: {
    host: true,
    allowedHosts: ['dev-kampus-connect.wovri.eu']
  },
});
