import { describe, expect, test } from "bun:test";
import {
  commandTimeoutMs,
  makeProcessPlatform,
  parseWindowsProcessList,
} from "../src/core/process-platform";

describe("process command budget", () => {
  test("keeps the POSIX inspection budget at the pre-port three seconds", () => {
    expect(commandTimeoutMs("darwin")).toBe(3_000);
    expect(commandTimeoutMs("linux")).toBe(3_000);
  });

  test("keeps the Windows budget a hang breaker, far above a contended CIM query", () => {
    expect(commandTimeoutMs("win32")).toBe(120_000);
  });
});

describe("a probe that could not answer is not a missing process", () => {
  test("a timed-out CIM query reports unavailable, never absent", () => {
    const platform = makeProcessPlatform({
      platform: "win32",
      kill: () => {},
      run: () => ({ status: null, stdout: "" }),
    });
    expect(platform.inspect(42)).toEqual({ state: "unavailable" });
  });

  test("a CIM query that answers for no process still reports absent", () => {
    const platform = makeProcessPlatform({
      platform: "win32",
      kill: () => {},
      run: () => ({ status: 0, stdout: "" }),
    });
    expect(platform.inspect(42)).toEqual({ state: "absent" });
  });

  test("Linux keeps the start token when the host has no working ps", () => {
    const platform = makeProcessPlatform({
      platform: "linux",
      kill: () => {},
      run: () => ({ status: null, stdout: "" }),
      readFile: () =>
        `42 (llama-server) S ${Array.from({ length: 18 }, (_, index) => index).join(" ")} 99887766 rest`,
    });
    expect(platform.inspect(42)).toEqual({
      state: "found",
      identity: { pid: 42, commandLine: "", startToken: "99887766" },
    });
  });

  test("Linux without ps and without proc reports unavailable", () => {
    const platform = makeProcessPlatform({
      platform: "linux",
      kill: () => {},
      run: () => ({ status: null, stdout: "" }),
      readFile: () => {
        throw new Error("ENOENT");
      },
    });
    expect(platform.inspect(42)).toEqual({ state: "unavailable" });
  });

  test("a ps that ran and found nothing still reports absent", () => {
    const platform = makeProcessPlatform({
      platform: "darwin",
      kill: () => {},
      run: () => ({ status: 1, stdout: "" }),
    });
    expect(platform.inspect(42)).toEqual({ state: "absent" });
  });
});

describe("Windows process platform", () => {
  test("parses CIM process identities without inventing missing values", () => {
    expect(
      parseWindowsProcessList(
        JSON.stringify([
          {
            ProcessId: 11,
            CommandLine: '"C:\\Program Files\\llama-server.exe" --port 8000',
            CreationDate: "20260810120000.000000-180",
          },
          { ProcessId: 12, CommandLine: null, CreationDate: null },
        ]),
      ),
    ).toEqual([
      {
        pid: 11,
        commandLine: '"C:\\Program Files\\llama-server.exe" --port 8000',
        startToken: "20260810120000.000000-180",
      },
      { pid: 12, commandLine: "", startToken: null },
    ]);
  });

  test("queries CIM and plans graceful then forced tree termination", () => {
    const calls: Array<{ command: string; args: string[] }> = [];
    const platform = makeProcessPlatform({
      platform: "win32",
      kill: () => {},
      run: (command, args) => {
        calls.push({ command, args });
        if (command === "powershell.exe") {
          return {
            status: 0,
            stdout: JSON.stringify({
              ProcessId: 42,
              CommandLine: "llama-server.exe --port 8000",
              CreationDate: "token",
            }),
          };
        }
        return { status: 0, stdout: "" };
      },
    });

    expect(platform.inspect(42)).toEqual({
      state: "found",
      identity: {
        pid: 42,
        commandLine: "llama-server.exe --port 8000",
        startToken: "token",
      },
    });
    platform.terminateTree(42, false);
    platform.terminateTree(42, true);
    expect(calls.at(-2)).toEqual({ command: "taskkill.exe", args: ["/PID", "42", "/T"] });
    expect(calls.at(-1)).toEqual({
      command: "taskkill.exe",
      args: ["/PID", "42", "/T", "/F"],
    });
  });
});
