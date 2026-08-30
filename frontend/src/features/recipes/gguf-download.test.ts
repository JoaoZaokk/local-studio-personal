import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { HuggingFaceModel } from "@/lib/types";
import { isGgufRepository } from "./gguf-download";

const model = (overrides: Partial<HuggingFaceModel>): HuggingFaceModel => ({
  _id: "model",
  modelId: "org/model",
  downloads: 0,
  likes: 0,
  tags: [],
  private: false,
  ...overrides,
});

describe("GGUF repository detection", () => {
  test("recognizes GGUF names, libraries, and tags", () => {
    assert.equal(isGgufRepository(model({ modelId: "org/model-GGUF" })), true);
    assert.equal(isGgufRepository(model({ library_name: "gguf" })), true);
    assert.equal(isGgufRepository(model({ tags: ["quantized", "gguf"] })), true);
  });

  test("does not preflight a safetensors repository", () => {
    assert.equal(
      isGgufRepository(model({ library_name: "transformers", tags: ["safetensors"] })),
      false,
    );
  });
});
