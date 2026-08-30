import type { Backend, ModelDownload } from "@/lib/types";

const absoluteWindowsPath = /^(?:[A-Za-z]:[\\/]|\\\\)/;

export function backendForDownload(download: ModelDownload): Backend {
  return download.files.some((file) => /\.gguf$/i.test(file.path)) ? "llamacpp" : "vllm";
}

export function modelPathForDownload(download: ModelDownload): string {
  const gguf = download.files
    .filter((file) => /\.gguf$/i.test(file.path))
    .sort((left, right) => left.path.localeCompare(right.path))[0];
  if (!gguf) return download.target_dir;
  if (absoluteWindowsPath.test(gguf.path) || gguf.path.startsWith("/")) return gguf.path;

  const separator = download.target_dir.includes("\\") ? "\\" : "/";
  const root = download.target_dir.replace(/[\\/]+$/, "");
  const relative = gguf.path.replace(/^[\\/]+/, "").replace(/[\\/]+/g, separator);
  return `${root}${separator}${relative}`;
}
