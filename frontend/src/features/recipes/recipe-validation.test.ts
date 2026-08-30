import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { RecipeEditor } from "./recipe-editor";
import { recipeValidationIssues } from "./recipe-validation";

const validRecipe: RecipeEditor = {
  id: "",
  name: "Mistral Nemo",
  model_path: "C:\\models\\mistral.gguf",
  backend: "llamacpp",
  runtime: { kind: "binary", ref: "C:\\llama\\llama-server.exe" },
};

describe("Serve draft validation", () => {
  test("names every missing field that blocks Save Serve", () => {
    assert.deepEqual(
      recipeValidationIssues(
        { ...validRecipe, name: "", model_path: "", runtime: undefined },
        null,
        null,
      ),
      ["Serve name", "model weights", "runtime"],
    );
  });

  test("includes editor errors and accepts a complete draft", () => {
    assert.deepEqual(recipeValidationIssues(validRecipe, "bad args", "bad source"), [
      "valid extra args",
      "valid Serve JSON",
    ]);
    assert.deepEqual(recipeValidationIssues(validRecipe, null, null), []);
  });
});
