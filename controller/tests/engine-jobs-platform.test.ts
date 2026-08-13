import { describe, expect, test } from "bun:test";
import type { RuntimeTarget } from "@local-studio/contracts/system";
import { windowsRuntimeTargetError } from "../src/modules/engines/runtimes/engine-jobs";

describe("Windows runtime job capability boundary", () => {
  test("requires explicit WSL2 targets for Linux-only Python engines", () => {
    expect(windowsRuntimeTargetError("win32", "vllm", null)).toContain("requires");
    expect(windowsRuntimeTargetError("win32", "sglang", null)).toContain("requires");
    expect(windowsRuntimeTargetError("win32", "mlx", null)).toContain("unavailable");
  });

  test("accepts WSL2 targets and preserves non-Windows installs", () => {
    const target = { kind: "wsl2" } as RuntimeTarget;
    expect(windowsRuntimeTargetError("win32", "vllm", target)).toBeNull();
    expect(windowsRuntimeTargetError("linux", "vllm", null)).toBeNull();
    expect(windowsRuntimeTargetError("darwin", "mlx", null)).toBeNull();
  });
});
