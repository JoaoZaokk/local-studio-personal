import type { RecipeEditor } from "./recipe-editor";

export function recipeValidationIssues(
  recipe: RecipeEditor,
  extraArgsError: string | null,
  recipeSourceError: string | null,
): string[] {
  const issues: string[] = [];
  if (!recipe.name.trim()) issues.push("Serve name");
  if (!recipe.model_path.trim()) issues.push("model weights");
  if (!recipe.runtime?.ref.trim()) issues.push("runtime");
  if (extraArgsError) issues.push("valid extra args");
  if (recipeSourceError) issues.push("valid Serve JSON");
  return issues;
}
