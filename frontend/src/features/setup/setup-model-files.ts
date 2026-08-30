import type { HuggingFaceModelCardPayload } from "@/lib/huggingface";
import type { StarterPreset } from "@/lib/types";

export type GgufFileOption = { value: string; label: string; allowPatterns?: string[] };

export function ggufFileOptions(payload: HuggingFaceModelCardPayload): GgufFileOption[] {
  const files = (payload.siblings ?? [])
    .flatMap((file) => {
      const name = file.rfilename?.trim();
      if (!name || !/\.gguf$/i.test(name)) return [];
      if (/(?:^|[-_.])(mmproj|projector|adapter|draft)(?:[-_.]|$)/i.test(name)) return [];
      return [{ name, size: typeof file.size === "number" && file.size > 0 ? file.size : 0 }];
    })
    .sort((first, second) => first.name.localeCompare(second.name));
  const groups = new Map<string, typeof files>();
  for (const file of files) {
    const family = file.name.replace(/-\d{5}-of-\d{5}\.gguf$/i, ".gguf");
    groups.set(family, [...(groups.get(family) ?? []), file]);
  }
  return [...groups.entries()].map(([family, members]) => {
    const first = members[0];
    const size = members.reduce((total, file) => total + file.size, 0);
    const split = members.length > 1 || first.name !== family;
    const shardLabel = split ? ` · ${members.length} shards` : "";
    return {
      value: first.name,
      label: `${family}${shardLabel}${size > 0 ? ` · ${formatFileSize(size)}` : ""}`,
      ...(split
        ? { allowPatterns: [first.name.replace(/-\d{5}-of-\d{5}\.gguf$/i, "-*.gguf")] }
        : {}),
    };
  });
}

export function manualDownloadPreset(
  modelId: string,
  file: GgufFileOption | undefined,
): StarterPreset | undefined {
  if (!file) return undefined;
  const name = modelId.split("/").pop() || modelId;
  return {
    id: `manual-${modelId.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`,
    name,
    description: `Exact GGUF file selected from ${modelId}.`,
    kind: "download",
    tags: ["local", "gguf"],
    size_gb: null,
    min_vram_gb: null,
    model_id: modelId,
    allow_patterns: file.allowPatterns ?? [file.value],
    backend: "llamacpp",
    gguf_file: file.value,
  };
}

function formatFileSize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(index >= 3 ? 1 : 0)} ${units[index]}`;
}
