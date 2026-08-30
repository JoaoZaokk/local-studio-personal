import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const electron = require("electron");
const devServerUrl = "http://127.0.0.1:3000";
const agentRuntimeUrl = "http://127.0.0.1:8081/health";

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function waitForService(url, validate = () => true) {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1500) });
      if (response.ok && (await validate(response))) return;
    } catch {}
    await delay(250);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

await Promise.all([
  waitForService(devServerUrl),
  waitForService(agentRuntimeUrl, async (response) => {
    const payload = await response.json();
    return payload?.service === "local-studio-agent-runtime";
  }),
]);

const child = spawn(electron, ["desktop/dist/main.js"], {
  stdio: "inherit",
  env: {
    ...process.env,
    LOCAL_STUDIO_DESKTOP_DEV_SERVER_URL: devServerUrl,
  },
});

child.once("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
