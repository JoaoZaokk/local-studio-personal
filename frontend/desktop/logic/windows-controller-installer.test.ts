import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, test } from "node:test";

describe("Windows controller installer", { skip: process.platform !== "win32" }, () => {
  test("plans a port-scoped user task without putting secrets in its command", () => {
    // Bun currently ignores the node:test skip option on describe blocks.
    if (process.platform !== "win32") return;

    const script = resolve(process.cwd(), "..", "scripts", "install-controller.ps1");
    const baseDir = join(tmpdir(), "Local Studio ü");
    const installDir = join(baseDir, "controller source");
    const dataDir = join(baseDir, "controller data");
    const output = execFileSync(
      "powershell.exe",
      [
        "-NoLogo",
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        script,
        "-Action",
        "Plan",
        "-Port",
        "18080",
        "-InstallDir",
        installDir,
        "-DataDir",
        dataDir,
      ],
      { encoding: "utf8" },
    );
    const plan = JSON.parse(output) as {
      taskName: string;
      arguments: string;
      runnerPath: string;
      environmentPath: string;
    };

    assert.equal(plan.taskName, "Local Studio Controller-18080");
    assert.ok(
      plan.runnerPath.endsWith(join("Local Studio ü", "controller data", "controller-18080.ps1")),
    );
    assert.ok(plan.environmentPath.endsWith(join("Local Studio ü", "controller source", ".env")));
    assert.match(plan.arguments, /controller-18080\.ps1/);
    assert.doesNotMatch(plan.arguments, /API_KEY|api.key/i);
  });
});
