"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { HuggingFaceModel } from "@/lib/types";
import type { HuggingFaceModelCardPayload } from "@/lib/huggingface";
import {
  DownloadStatusSection,
  ExploreControls,
  ExploreResultsSection,
} from "./explore-tab-sections";
import { useExplore } from "./use-explore";
import { useDownloads } from "@/hooks/use-downloads";
import { useMountSubscription } from "@/hooks/use-mount-subscription";
import api from "@/lib/api/client";
import { LazyHuggingFaceModelCardPanel } from "@/ui/lazy-huggingface-model-card";
import type { ModelFit } from "./hardware-profile";
import { ggufFileOptions, type GgufFileOption } from "@/features/setup/setup-model-files";
import { isGgufRepository } from "@/features/recipes/gguf-download";
import { GgufDownloadModal } from "./gguf-download-modal";

type PendingGgufDownload = {
  modelId: string;
  options: GgufFileOption[];
  selected: string;
};

export function ExploreTab() {
  const {
    groups,
    maxVramGb,
    detectedPoolGb,
    poolOverrideGb,
    hardwareProfile,
    setPoolOverrideGb,
    loading,
    error,
    search,
    library,
    sort,
    hasMore,
    setSearch,
    setLibrary,
    setSort,
    loadMore,
    refresh,
  } = useExplore();
  const {
    downloads,
    downloadsByModel,
    startingModelIds,
    error: downloadError,
    startDownload,
    pauseDownload,
    resumeDownload,
  } = useDownloads();
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [localModelIds, setLocalModelIds] = useState<Set<string>>(new Set());
  const [selectedModelCard, setSelectedModelCard] = useState<{
    model: HuggingFaceModel;
    variants: HuggingFaceModel[];
    fit?: ModelFit;
  } | null>(null);
  const [pendingGgufDownload, setPendingGgufDownload] = useState<PendingGgufDownload | null>(null);
  const [ggufInspectError, setGgufInspectError] = useState<string | null>(null);
  const completedSet = useRef<Set<string>>(new Set());
  const modelsById = useMemo(() => {
    const models = new Map<string, HuggingFaceModel>();
    for (const group of groups) {
      models.set(group.lead.modelId, group.lead);
      for (const variant of group.variants) models.set(variant.modelId, variant);
    }
    return models;
  }, [groups]);

  const loadLocalModels = useCallback(async () => {
    try {
      const data = await api.getModels();
      const ids = new Set<string>();
      for (const m of data.models || []) {
        ids.add(m.name.toLowerCase());
        for (const part of m.path.split("/")) {
          if (part) ids.add(part.toLowerCase());
        }
      }
      setLocalModelIds(ids);
    } catch {}
  }, []);

  useMountSubscription(() => {
    void loadLocalModels();
  }, [loadLocalModels]);
  useMountSubscription(() => {
    let shouldRefresh = false;
    for (const d of downloads) {
      if (d.status === "completed" && !completedSet.current.has(d.id)) {
        completedSet.current.add(d.id);
        shouldRefresh = true;
      }
    }
    if (shouldRefresh) {
      void loadLocalModels();
    }
  }, [downloads, loadLocalModels]);

  const isLocal = useCallback(
    (modelId: string) => {
      const normalized = modelId.toLowerCase();
      return localModelIds.has(normalized) || localModelIds.has(normalized.split("/").pop() ?? "");
    },
    [localModelIds],
  );

  const toggleExpand = useCallback((key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const inspectGgufRepository = useCallback(async (modelId: string) => {
    const response = await fetch(
      `/api/huggingface/model-card?modelId=${encodeURIComponent(modelId)}`,
      { cache: "no-store", signal: AbortSignal.timeout(12_000) },
    );
    const payload = (await response.json()) as HuggingFaceModelCardPayload & { error?: string };
    if (!response.ok) throw new Error(payload.error || "Failed to inspect GGUF files");
    return ggufFileOptions(payload);
  }, []);

  const startExactGgufDownload = useCallback(
    async (modelId: string, file: GgufFileOption) => {
      await startDownload({
        model_id: modelId,
        allow_patterns: file.allowPatterns ?? [file.value],
      });
    },
    [startDownload],
  );

  const prepareGgufDownload = useCallback(
    async (modelId: string) => {
      const options = await inspectGgufRepository(modelId);
      if (options.length === 1) {
        await startExactGgufDownload(modelId, options[0]);
        return true;
      }
      if (options.length > 1) {
        setPendingGgufDownload({ modelId, options, selected: "" });
        return true;
      }
      return false;
    },
    [inspectGgufRepository, startExactGgufDownload],
  );

  const handleStartDownload = useCallback(
    async (modelId: string) => {
      setGgufInspectError(null);
      try {
        const model = modelsById.get(modelId);
        if (model && isGgufRepository(model) && (await prepareGgufDownload(modelId))) return;
        await startDownload({ model_id: modelId });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to start download";
        if (/multiple gguf weight variants/i.test(message)) {
          try {
            if (await prepareGgufDownload(modelId)) return;
          } catch (inspectError) {
            setGgufInspectError(
              inspectError instanceof Error ? inspectError.message : "Failed to inspect GGUF files",
            );
            return;
          }
        }
        setGgufInspectError(message);
      }
    },
    [modelsById, prepareGgufDownload, startDownload],
  );

  const confirmGgufDownload = useCallback(async () => {
    if (!pendingGgufDownload?.selected) return;
    const file = pendingGgufDownload.options.find(
      (option) => option.value === pendingGgufDownload.selected,
    );
    if (!file) return;
    try {
      await startExactGgufDownload(pendingGgufDownload.modelId, file);
      setPendingGgufDownload(null);
    } catch {}
  }, [pendingGgufDownload, startExactGgufDownload]);

  const handlePause = useCallback(
    async (id: string) => {
      await pauseDownload(id);
    },
    [pauseDownload],
  );

  const handleResume = useCallback(
    async (id: string) => {
      await resumeDownload(id);
    },
    [resumeDownload],
  );

  const openModelCard = useCallback(
    (model: HuggingFaceModel, variants: HuggingFaceModel[], fit?: ModelFit) => {
      setSelectedModelCard({ model, variants, fit });
    },
    [],
  );

  return (
    <div className="space-y-7">
      <ExploreControls
        groupsCount={groups.length}
        maxVramGb={maxVramGb}
        detectedPoolGb={detectedPoolGb}
        poolOverrideGb={poolOverrideGb}
        hardwareProfile={hardwareProfile}
        loading={loading}
        search={search}
        setSearch={setSearch}
        library={library}
        setLibrary={setLibrary}
        sort={sort}
        setSort={setSort}
        setPoolOverrideGb={setPoolOverrideGb}
        refresh={refresh}
      />
      <DownloadStatusSection error={ggufInspectError ?? downloadError} />
      <ExploreResultsSection
        groups={groups}
        expandedKeys={expandedKeys}
        search={search}
        loading={loading}
        error={error}
        hasMore={hasMore}
        maxVramGb={maxVramGb}
        downloadsByModel={downloadsByModel}
        startingModelIds={startingModelIds}
        isLocal={isLocal}
        toggleExpand={toggleExpand}
        startDownload={handleStartDownload}
        pauseDownload={handlePause}
        resumeDownload={handleResume}
        loadMore={loadMore}
        openModelCard={openModelCard}
      />
      <LazyHuggingFaceModelCardPanel
        open={Boolean(selectedModelCard)}
        model={selectedModelCard?.model ?? null}
        variants={selectedModelCard?.variants ?? []}
        fit={selectedModelCard?.fit}
        onClose={() => setSelectedModelCard(null)}
      />
      {pendingGgufDownload ? (
        <GgufDownloadModal
          modelId={pendingGgufDownload.modelId}
          options={pendingGgufDownload.options}
          selected={pendingGgufDownload.selected}
          downloading={startingModelIds.has(pendingGgufDownload.modelId)}
          error={downloadError}
          onSelect={(selected) =>
            setPendingGgufDownload((current) => (current ? { ...current, selected } : current))
          }
          onCancel={() => setPendingGgufDownload(null)}
          onDownload={() => void confirmGgufDownload()}
        />
      ) : null}
    </div>
  );
}
