import { describe, expect, test } from "bun:test";
import type { EngineBackend, RuntimeTarget } from "@local-studio/contracts/system";
import { isRuntimeJobSupported } from "../src/modules/engines/runtimes/engine-jobs";

const makeTarget = (
  overrides: Omit<Partial<RuntimeTarget>, "capabilities"> & {
    kind: RuntimeTarget["kind"];
    backend: EngineBackend;
    capabilities?: Partial<RuntimeTarget["capabilities"]>;
  },
): RuntimeTarget => ({
  id: `${overrides.backend}:${overrides.kind}:test`,
  backend: overrides.backend,
  kind: overrides.kind,
  label: "test target",
  installed: overrides.installed ?? false,
  active: false,
  version: null,
  source: overrides.source ?? "discovered",
  capabilities: {
    canLaunch: false,
    canInstall: false,
    canUpdate: false,
    canUninstall: false,
    canInspectOptions: false,
    supportsDocker: false,
    ...overrides.capabilities,
  },
  health: { status: "ok" },
});

describe("runtime job support gate", () => {
  test("keeps inspect open for every non-WSL target, as it was before the Windows port", () => {
    for (const backend of ["llamacpp", "vllm", "sglang", "mlx"] as const) {
      for (const kind of ["system", "venv", "binary", "docker"] as const) {
        expect(isRuntimeJobSupported("inspect", makeTarget({ backend, kind }))).toBe(true);
      }
    }
  });

  test("rejects inspect for WSL targets, matching canInspectOptions", () => {
    expect(
      isRuntimeJobSupported("inspect", makeTarget({ backend: "vllm", kind: "wsl2" })),
    ).toBe(false);
  });

  test("routes install on a non-WSL target through canUpdate, not canInstall", () => {
    const upgradable = makeTarget({
      backend: "llamacpp",
      kind: "system",
      capabilities: { canUpdate: true, canInstall: false },
    });
    expect(isRuntimeJobSupported("install", upgradable)).toBe(true);
    expect(isRuntimeJobSupported("update", upgradable)).toBe(true);

    const inert = makeTarget({ backend: "llamacpp", kind: "system" });
    expect(isRuntimeJobSupported("install", inert)).toBe(false);
    expect(isRuntimeJobSupported("update", inert)).toBe(false);
  });

  test("routes install on a WSL target through canInstall", () => {
    const installable = makeTarget({
      backend: "vllm",
      kind: "wsl2",
      capabilities: { canInstall: true, canUpdate: false },
    });
    expect(isRuntimeJobSupported("install", installable)).toBe(true);

    const installed = makeTarget({
      backend: "vllm",
      kind: "wsl2",
      installed: true,
      capabilities: { canInstall: false, canUpdate: true },
    });
    expect(isRuntimeJobSupported("install", installed)).toBe(false);
    expect(isRuntimeJobSupported("update", installed)).toBe(true);
  });

  test("keeps uninstall gated on canUninstall so a non-WSL uninstall never dispatches an install", () => {
    expect(
      isRuntimeJobSupported(
        "uninstall",
        makeTarget({
          backend: "llamacpp",
          kind: "system",
          capabilities: { canUpdate: true },
        }),
      ),
    ).toBe(false);
    expect(
      isRuntimeJobSupported(
        "uninstall",
        makeTarget({
          backend: "vllm",
          kind: "wsl2",
          installed: true,
          capabilities: { canUninstall: true },
        }),
      ),
    ).toBe(true);
  });

  test("never supports download through the runtime target gate", () => {
    expect(
      isRuntimeJobSupported(
        "download",
        makeTarget({
          backend: "llamacpp",
          kind: "system",
          capabilities: { canUpdate: true, canInstall: true, canUninstall: true },
        }),
      ),
    ).toBe(false);
  });
});
