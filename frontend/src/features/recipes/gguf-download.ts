import type { HuggingFaceModel } from "@/lib/types";

export function isGgufRepository(model: HuggingFaceModel): boolean {
  return [model.modelId, model.library_name ?? "", ...model.tags].some((value) =>
    /(?:^|[-_. /])gguf(?:$|[-_. /])/i.test(value),
  );
}
