import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "bun:test";

describe("standalone import probes", () => {
  test("exits after loading modules with active handles", () => {
    const projectScript = readFileSync(resolve(process.cwd(), "desktop", "project.mjs"), "utf8");

    expect(projectScript).toContain(".then(() => process.exit(0)");
    expect(projectScript).toContain("process.exit(1);");
  });
});
