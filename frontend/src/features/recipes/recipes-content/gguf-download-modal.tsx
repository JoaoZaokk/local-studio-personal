"use client";

import { Alert, Button, Select, UiModal, UiModalHeader } from "@/ui";
import type { GgufFileOption } from "@/features/setup/setup-model-files";

export function GgufDownloadModal({
  modelId,
  options,
  selected,
  downloading,
  error,
  onSelect,
  onCancel,
  onDownload,
}: {
  modelId: string;
  options: GgufFileOption[];
  selected: string;
  downloading: boolean;
  error: string | null;
  onSelect: (value: string) => void;
  onCancel: () => void;
  onDownload: () => void;
}) {
  return (
    <UiModal isOpen onClose={onCancel} maxWidth="max-w-xl">
      <UiModalHeader title="Choose GGUF variant" onClose={onCancel} />
      <div className="space-y-4 p-6">
        <p className="text-[length:var(--fs-sm)] text-(--ui-muted)">
          {modelId} contains multiple model weights. Choose the exact quantization to download.
        </p>
        <Select
          value={selected}
          onChange={(event) => onSelect(event.target.value)}
          placeholder="Select a GGUF file…"
          aria-label="GGUF variant"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        {error ? <Alert variant="error">{error}</Alert> : null}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel} disabled={downloading}>
            Cancel
          </Button>
          <Button onClick={onDownload} disabled={!selected || downloading}>
            {downloading ? "Starting…" : "Download selected variant"}
          </Button>
        </div>
      </div>
    </UiModal>
  );
}
