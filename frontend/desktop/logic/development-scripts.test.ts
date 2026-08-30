import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "bun:test";

type Manifest = { scripts: Record<string, string> };

const readManifest = (path: string): Manifest => JSON.parse(readFileSync(path, "utf8")) as Manifest;

describe("development scripts", () => {
  test("passes controller scripts after Bun's Windows cwd option", () => {
    const manifest = readManifest(resolve(process.cwd(), "..", "package.json"));

    expect(manifest.scripts["dev:controller"]).toBe("bun run --cwd controller dev");
    expect(manifest.scripts["start:controller"]).toBe("bun run --cwd controller start");
    expect(manifest.scripts["desktop:dev"]).toContain('"npm run dev:controller"');
    expect(manifest.scripts["desktop:dev"]).toContain('"npm --prefix frontend run desktop:dev"');
  });

  test("starts Electron without an inline shell expression", () => {
    const manifest = readManifest(resolve(process.cwd(), "package.json"));
    const script = manifest.scripts["desktop:dev"];

    expect(script).toContain('"npm run desktop:start:dev"');
    expect(script).not.toContain("node -e");
  });

  test("waits for Next and the shared agent runtime before starting Electron", () => {
    const startDev = readFileSync(resolve(process.cwd(), "desktop", "start-dev.mjs"), "utf8");

    expect(startDev).toContain('const devServerUrl = "http://127.0.0.1:3000"');
    expect(startDev).toContain('const agentRuntimeUrl = "http://127.0.0.1:8081/health"');
    expect(startDev).toContain("await Promise.all");
    expect(startDev).not.toContain("setTimeout(resolve, 3000)");
  });

  test("watches agent runtime imports from the repository root", () => {
    const rootManifest = readManifest(resolve(process.cwd(), "..", "package.json"));
    const runtimeManifest = readManifest(
      resolve(process.cwd(), "..", "services", "agent-runtime", "package.json"),
    );

    expect(rootManifest.scripts["dev:agent-runtime:watch"]).toBe(
      "bun --watch services/agent-runtime/src/server.ts",
    );
    expect(runtimeManifest.scripts.dev).toBe("npm --prefix ../.. run dev:agent-runtime:watch");
  });
});
