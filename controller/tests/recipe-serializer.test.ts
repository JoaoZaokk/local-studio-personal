import { describe, expect, test } from "bun:test";
import { parseRecipe } from "../src/modules/models/recipes/recipe-serializer";

const recipe = (env_vars: Record<string, string>) => ({
  id: "wsl-environment",
  name: "WSL environment",
  model_path: "Qwen/Qwen3",
  backend: "vllm",
  env_vars,
});

describe("recipe environment variables", () => {
  test("accepts portable environment names", () => {
    expect(parseRecipe(recipe({ CUDA_VISIBLE_DEVICES: "0", _LOCAL_STUDIO_2: "yes" })).env_vars)
      .toEqual({ CUDA_VISIBLE_DEVICES: "0", _LOCAL_STUDIO_2: "yes" });
  });

  test("rejects names that can become command options", () => {
    expect(() => parseRecipe(recipe({ "-S": "-- /usr/bin/printf replaced" }))).toThrow(
      "Invalid environment variable name: -S",
    );
  });
});
