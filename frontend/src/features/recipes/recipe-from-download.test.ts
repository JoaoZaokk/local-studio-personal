import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { ModelDownload } from "@/lib/types";
import { backendForDownload, modelPathForDownload } from "./recipe-from-download";

const download = (targetDir: string, files: string[]): ModelDownload => ({
  id: "download-1",
  model_id: "org/model",
  revision: null,
  status: "completed",
  created_at: "2026-08-13T00:00:00Z",
  updated_at: "2026-08-13T00:00:00Z",
  target_dir: targetDir,
  total_bytes: 1,
  downloaded_bytes: 1,
  files: files.map((path) => ({
    path,
    size_bytes: 1,
    downloaded_bytes: 1,
    status: "completed",
  })),
  error: null,
});

describe("Serve defaults from a completed download", () => {
  test("selects llama.cpp and its exact GGUF on Windows", () => {
    const value = download("C:\\models\\org--model", ["model-Q4_K_M.gguf"]);
    assert.equal(backendForDownload(value), "llamacpp");
    assert.equal(modelPathForDownload(value), "C:\\models\\org--model\\model-Q4_K_M.gguf");
  });

  test("preserves UNC roots and nested file paths", () => {
    const value = download("\\\\server\\models\\org--model\\", ["weights/model.gguf"]);
    assert.equal(
      modelPathForDownload(value),
      "\\\\server\\models\\org--model\\weights\\model.gguf",
    );
  });

  test("keeps directory-based weights on vLLM", () => {
    const value = download("/models/org--model", ["model.safetensors"]);
    assert.equal(backendForDownload(value), "vllm");
    assert.equal(modelPathForDownload(value), "/models/org--model");
  });
});
