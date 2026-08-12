import { afterAll, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect } from "effect";
import type { InstanceRecord, LaunchPlan } from "../src/modules/compute/contracts";
import type { ProcessLookup, ProcessPlatform } from "../src/core/process-platform";
import { makeProcessLauncher } from "../src/modules/compute/launchers/process";

const root = mkdtempSync(join(tmpdir(), "process-launcher-test-"));
const logPath = join(root, "model.log");

const REAL_PROCESS_TIMEOUT_MS = 120_000;

afterAll(() => rmSync(root, { recursive: true, force: true }));

const record: InstanceRecord = {
  name: "model",
  nodeId: "self",
  engine: "vllm",
  recipeId: "recipe",
  runtime: "process",
  ref: null,
  port: 8000,
  devices: [],
  nonce: "nonce",
  startedAt: new Date(0).toISOString(),
  readyDeadlineAt: new Date(60_000).toISOString(),
};

const plan: LaunchPlan = {
  kind: "process",
  argv: [process.execPath, "-e", "process.stdout.write('fresh')"],
  env: {},
  ports: [],
  mounts: [],
  devices: [],
  health: { path: "/health", readyDeadlineMs: 60_000, intervalMs: 100 },
};

// owns() is the only thing standing between a recycled pid and a SIGKILL at its
// process group, so what it answers when it cannot identify the pid is a safety
// property, not a detail.
const platformAnswering = (lookup: ProcessLookup): ProcessPlatform => ({
  alive: () => true,
  inspect: () => lookup,
  list: () => [],
  terminateTree: () => {},
});

describe("process ownership under an unidentifiable pid", () => {
  const reference = { kind: "process", pid: 4242, startToken: null } as const;

  test("refuses to claim a live pid it could not identify", async () => {
    const launcher = makeProcessLauncher(() => logPath, platformAnswering({ state: "absent" }));
    expect(await Effect.runPromise(launcher.owns(reference, record))).toBe(false);
  });

  test("refuses to claim a pid whose command line is not ours", async () => {
    const launcher = makeProcessLauncher(
      () => logPath,
      platformAnswering({
        state: "found",
        identity: { pid: 4242, commandLine: "some other process --port 9999", startToken: null },
      }),
    );
    expect(await Effect.runPromise(launcher.owns(reference, record))).toBe(false);
  });

  test("claims a pid whose command line carries our port", async () => {
    const launcher = makeProcessLauncher(
      () => logPath,
      platformAnswering({
        state: "found",
        identity: { pid: 4242, commandLine: "vllm serve --port 8000", startToken: null },
      }),
    );
    expect(await Effect.runPromise(launcher.owns(reference, record))).toBe(true);
  });
});

describe("process launcher logs", () => {
  test("a new launch cannot inherit a previous failure", async () => {
    writeFileSync(logPath, "stale failure\n");
    const launcher = makeProcessLauncher(() => logPath);
    const reference = await Effect.runPromise(launcher.start(plan, record));
    for (let attempt = 0; attempt < 100; attempt += 1) {
      if (!(await Effect.runPromise(launcher.alive(reference)))) break;
      await Bun.sleep(10);
    }
    const tail = await Effect.runPromise(launcher.logTail(reference, record));
    expect(tail).toBe("fresh");
    expect(readFileSync(logPath, "utf8")).toBe("fresh");
  }, REAL_PROCESS_TIMEOUT_MS);

  test("owns and stops a real detached process tree", async () => {
    const launcher = makeProcessLauncher(() => logPath);
    const longRunning: LaunchPlan = {
      ...plan,
      argv: [process.execPath, "-e", "setInterval(() => {}, 1000)", "--", "--port", "8000"],
    };
    const reference = await Effect.runPromise(launcher.start(longRunning, record));
    expect(await Effect.runPromise(launcher.owns(reference, record))).toBe(true);
    await Effect.runPromise(launcher.stop(reference, 2_000));
    expect(await Effect.runPromise(launcher.alive(reference))).toBe(false);
  }, REAL_PROCESS_TIMEOUT_MS);
});
