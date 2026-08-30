"use client";

import { Save } from "@/ui/icon-registry";
import { Button, Spinner } from "@/ui";
import { DrawerFooter } from "@/ui/drawer";
import type { RecipeEditor } from "@/features/recipes/recipe-editor";
import { recipeValidationIssues } from "@/features/recipes/recipe-validation";

export function RecipeModalFooter({
  recipe,
  saving,
  extraArgsError,
  recipeSourceError,
  onClose,
  onSave,
}: {
  recipe: RecipeEditor;
  saving: boolean;
  extraArgsError: string | null;
  recipeSourceError: string | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const issues = recipeValidationIssues(recipe, extraArgsError, recipeSourceError);
  const invalid = issues.length > 0;
  return (
    <DrawerFooter
      status={
        <>
          {recipe.id ? `Editing ${recipe.name}` : "Creating a Serve"}
          {invalid ? (
            <span className="ml-3 text-(--ui-danger)">Required: {issues.join(", ")}</span>
          ) : null}
        </>
      }
    >
      <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
        Cancel
      </Button>
      <Button
        size="sm"
        onClick={onSave}
        disabled={saving || invalid}
        title={invalid ? `Complete: ${issues.join(", ")}` : undefined}
        icon={saving ? <Spinner size="xs" variant="refresh" /> : <Save className="h-3 w-3" />}
      >
        {saving ? "Saving..." : "Save Serve"}
      </Button>
    </DrawerFooter>
  );
}
