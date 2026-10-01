import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
import os from "node:os";
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3101",
    ...devices["Desktop Chrome"],
    channel: "chrome",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: `APPLYFLOW_DATA_DIR=${path.join(os.tmpdir(), `applyflow-e2e-${process.pid}`)} NEXT_TELEMETRY_DISABLED=1 npx next start --hostname 127.0.0.1 --port 3101`,
    url: "http://127.0.0.1:3101",
    reuseExistingServer: false,
    timeout: 60000,
  },
});
