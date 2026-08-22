import { describe, expect, test } from "bun:test";
import { isExplicitPath } from "../src/core/command";

// The question a configured llama_bin has to answer is "did the user hand me a
// path, or a name to look up on PATH?" — not "is it absolute?". resolveBinary
// accepts a relative explicit path, and a managed Windows binary carries no
// forward slash at all, so both of the obvious predicates are wrong in one
// direction each.
describe("explicit path detection", () => {
  test("recognises a Windows managed binary that carries no forward slash", () => {
    expect(isExplicitPath(String.raw`C:\Users\example\.local-studio\src\build\bin\llama-server`)).toBe(
      true,
    );
    expect(isExplicitPath(String.raw`.\build\bin\llama-server.exe`)).toBe(true);
  });

  test("keeps a relative POSIX path explicit", () => {
    expect(isExplicitPath("./build/bin/llama-server")).toBe(true);
    expect(isExplicitPath("../llama.cpp/llama-server")).toBe(true);
    expect(isExplicitPath("/usr/local/bin/llama-server")).toBe(true);
  });

  test("treats a bare name as a PATH lookup on either platform", () => {
    expect(isExplicitPath("llama-server")).toBe(false);
    expect(isExplicitPath("llama-server.exe")).toBe(false);
  });
});
