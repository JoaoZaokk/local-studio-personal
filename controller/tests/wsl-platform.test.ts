import { describe, expect, test } from "bun:test";
import type { AsyncCommandResult } from "../src/core/command";
import {
  isWindowsAbsolutePath,
  buildWslLaunchArguments,
  isEnvironmentVariableName,
  readLivenessProbe,
} from "../src/modules/compute/launchers/wsl2";
import {
  normalizeWslOutput,
  parseWslQuietList,
  parseWslVerboseList,
  readRunningDistributions,
} from "../src/modules/compute/wsl-platform";

describe("WSL2 discovery", () => {
  test("parses UTF-16-shaped verbose output without depending on the state language", () => {
    const output = [
      "  NAME                   STATE           VERSION",
      "* Ubuntu                 Parado          2",
      "  docker-desktop         Running         2",
      "  Legacy                 Stopped         1",
    ].join("\r\n");
    const nulOutput = [...output].map((character) => `${character}\0`).join("");

    expect(normalizeWslOutput(nulOutput)).toBe(output.trim());
    expect(parseWslVerboseList(nulOutput)).toEqual([
      { name: "Ubuntu", version: 2, default: true },
      { name: "docker-desktop", version: 2, default: false },
      { name: "Legacy", version: 1, default: false },
    ]);
  });

  test("parses running distribution names", () => {
    expect(parseWslQuietList("Ubuntu\0\r\0\n\0Debian\0")).toEqual(["Ubuntu", "Debian"]);
  });
});

describe("WSL2 launch contract", () => {
  test("recognizes drive and UNC paths without changing Linux paths", () => {
    expect(isWindowsAbsolutePath("F:\\Models\\Qwen model")).toBe(true);
    expect(isWindowsAbsolutePath("\\\\server\\models\\Qwen")).toBe(true);
    expect(isWindowsAbsolutePath("/mnt/f/Models/Qwen")).toBe(false);
    expect(isWindowsAbsolutePath("Qwen/Qwen3")).toBe(false);
  });

  test("passes dynamic values as argv and sorts the environment", () => {
    const args = buildWslLaunchArguments(
      "Ubuntu Dev",
      "/tmp/local-studio-nonce.pid",
      "/mnt/f/work space",
      "nonce",
      "/mnt/f/logs/model.log",
      ["/home/user/.local/bin/vllm", "serve", "/mnt/f/Models/Qwen model"],
      { ZED: "last", ALPHA: "first value" },
    );

    expect(args.slice(0, 7)).toEqual([
      "--distribution",
      "Ubuntu Dev",
      "--exec",
      "/usr/bin/setsid",
      "--wait",
      "/bin/sh",
      "-c",
    ]);
    expect(args).toContain("ALPHA=first value");
    expect(args[args.indexOf("/usr/bin/env") + 1]).toBe("--");
    expect(args).toContain("/home/user/.local/bin");
    expect(args).toContain("/mnt/f/logs/model.log");
    expect(args.indexOf("ALPHA=first value")).toBeLessThan(args.indexOf("ZED=last"));
    expect(args.slice(-3)).toEqual([
      "/home/user/.local/bin/vllm",
      "serve",
      "/mnt/f/Models/Qwen model",
    ]);
  });

  test("rejects environment names that GNU env could interpret as options", () => {
    expect(isEnvironmentVariableName("CUDA_VISIBLE_DEVICES")).toBe(true);
    expect(isEnvironmentVariableName("_LOCAL_STUDIO_2")).toBe(true);
    expect(isEnvironmentVariableName("-S")).toBe(false);
    expect(() =>
      buildWslLaunchArguments(
        "Ubuntu",
        "/tmp/local-studio-nonce.pid",
        "",
        "nonce",
        "/mnt/f/logs/model.log",
        ["/usr/bin/vllm", "serve"],
        { "-S": "-- /usr/bin/printf replaced" },
      ),
    ).toThrow("Invalid environment variable name: -S");
  });

  test("keeps a planned managed home path isolated as one argument", () => {
    const args = buildWslLaunchArguments(
      "Ubuntu",
      "/tmp/local-studio-nonce.pid",
      "",
      "nonce",
      "/mnt/f/logs/model.log",
      ["~/.local/share/local-studio/runtime/venvs/vllm-latest/bin/vllm", "serve"],
      {},
    );

    expect(args.slice(-2)).toEqual([
      "~/.local/share/local-studio/runtime/venvs/vllm-latest/bin/vllm",
      "serve",
    ]);
  });
});

describe("a WSL query that could not answer is not a dead process", () => {
  const result = (overrides: Partial<AsyncCommandResult> = {}): AsyncCommandResult => ({
    status: 0,
    stdout: "",
    stderr: "",
    timedOut: false,
    signal: null,
    ...overrides,
  });

  const timedOut = result({ status: null, timedOut: true });
  const spawnFailed = result({ status: null, stderr: "spawn wsl.exe ENOENT" });
  const wslRefused = result({ status: 1, stderr: "There is no distribution with the supplied name." });
  const nonsense = result({ stdout: "Windows Subsystem for Linux has no installed distributions." });

  test("the probe answers alive only when the wrapper said so", () => {
    expect(readLivenessProbe(result({ stdout: "alive" }))).toBe("alive");
    expect(readLivenessProbe(result({ stdout: "alive\r\n" }))).toBe("alive");
  });

  test("the probe answers dead only when the wrapper said so", () => {
    expect(readLivenessProbe(result({ stdout: "dead" }))).toBe("dead");
    expect(readLivenessProbe(result({ stdout: "dead\n" }))).toBe("dead");
  });

  test("no unanswered probe ever reports death", () => {
    const unanswered = [timedOut, spawnFailed, wslRefused, nonsense];
    expect(unanswered.map(readLivenessProbe)).toEqual(["unknown", "unknown", "unknown", "unknown"]);
  });

  test("a listing that failed is unavailable, never an empty set of running distributions", () => {
    const listed = result({ stdout: "Ubuntu\r\ndocker-desktop\r\n" });
    expect(readRunningDistributions(listed)).toEqual({
      state: "listed",
      names: ["Ubuntu", "docker-desktop"],
    });
    expect(readRunningDistributions(timedOut)).toEqual({ state: "unavailable" });
    expect(readRunningDistributions(spawnFailed)).toEqual({ state: "unavailable" });
    expect(readRunningDistributions(wslRefused)).toEqual({ state: "unavailable" });
  });

  test("a listing that answered with nothing running is a real empty set", () => {
    expect(readRunningDistributions(result())).toEqual({ state: "listed", names: [] });
  });
});
