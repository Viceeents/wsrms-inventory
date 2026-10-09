import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/frontend",
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  reporter: "list",
  use: {
    baseURL: process.env.DEPLOYED_BASE_URL || "http://127.0.0.1:5174",
    headless: true,
    trace: "retain-on-failure",
  },
  webServer: process.env.DEPLOYED_BASE_URL
    ? undefined
    : process.env.UI_PRODUCTION === "true"
      ? [
          {
            command: "node server/src/server.js",
            url: "http://127.0.0.1:5174/api/health",
            reuseExistingServer: false,
            timeout: 30000,
          },
        ]
      : [
          {
            command: "node server/src/server.js",
            url: "http://127.0.0.1:3002/api/health",
            reuseExistingServer: false,
            timeout: 30000,
          },
          {
            command:
              "node node_modules/vite/bin/vite.js --config client/vite.config.js --host 127.0.0.1 --port 5174",
            url: "http://127.0.0.1:5174",
            reuseExistingServer: false,
            timeout: 30000,
          },
        ],
});
