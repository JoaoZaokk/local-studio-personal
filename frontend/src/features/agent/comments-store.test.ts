import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { mkdtempSync, realpathSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { addComment, listComments } from "./comments-store";

describe("comments store workspace boundary", () => {
  test("writes under an ordinary workspace root", async () => {
    const root = realpathSync(mkdtempSync(path.join(os.tmpdir(), "comments-store-")));
    const comment = await addComment(root, "src/app.ts", 3, "looks fine");
    assert.equal(comment.line, 3);
    assert.deepEqual(await listComments(root, "src/app.ts"), [comment]);
  });

  test("refuses a system directory as the root", async () => {
    const system = process.platform === "win32" ? (process.env["SystemRoot"] as string) : "/etc";
    await assert.rejects(
      () => addComment(system, "notes.md", 1, "should never land"),
      /not an allowed workspace root/,
    );
  });

  test("refuses the filesystem root", async () => {
    const root = path.parse(process.cwd()).root;
    await assert.rejects(() => listComments(root, "notes.md"), /not an allowed workspace root/);
  });

  test("still refuses a relative path that climbs out", async () => {
    const root = realpathSync(mkdtempSync(path.join(os.tmpdir(), "comments-store-")));
    await assert.rejects(() => listComments(root, "../outside.md"), /Invalid file path/);
  });
});
