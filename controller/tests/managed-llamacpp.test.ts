import { describe, expect, test } from "bun:test";
import {
  managedLlamaServerPathForPlatform,
  publishedDigest,
  selectWindowsLlamacppAssets,
  selectWindowsLlamacppRelease,
} from "../src/modules/engines/runtimes/managed-llamacpp";

const release = {
  tag_name: "b1234",
  assets: [
    {
      name: "llama-b1234-bin-win-cpu-x64.zip",
      browser_download_url: "https://example.test/cpu.zip",
    },
    {
      name: "llama-b1234-bin-win-cuda-12.4-x64.zip",
      browser_download_url: "https://example.test/cuda.zip",
    },
    {
      name: "cudart-llama-bin-win-cuda-12.4-x64.zip",
      browser_download_url: "https://example.test/cudart.zip",
    },
  ],
};

const DIGEST = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const asset = { name: "llama-b1234-bin-win-cpu-x64.zip", browser_download_url: "https://example.test/cpu.zip" };

describe("managed llama.cpp", () => {
  test("uses the existing source build path on POSIX and an executable path on Windows", () => {
    const config = { data_dir: String.raw`D:\Local Studio` };
    expect(managedLlamaServerPathForPlatform(config, "win32")).toBe(
      String.raw`D:\Local Studio\runtime\llamacpp\bin\llama-server.exe`,
    );
    expect(managedLlamaServerPathForPlatform({ data_dir: "/data" }, "darwin")).toBe(
      "/data/runtime/llamacpp/src/build/bin/llama-server",
    );
    expect(managedLlamaServerPathForPlatform({ data_dir: "/data" }, "linux")).toBe(
      "/data/runtime/llamacpp/src/build/bin/llama-server",
    );
  });

  test("selects both official CUDA archives on NVIDIA hosts", () => {
    expect(selectWindowsLlamacppAssets(release, true)?.map((asset) => asset.name)).toEqual([
      "llama-b1234-bin-win-cuda-12.4-x64.zip",
      "cudart-llama-bin-win-cuda-12.4-x64.zip",
    ]);
  });

  test("selects the CPU archive when NVIDIA is unavailable", () => {
    expect(selectWindowsLlamacppAssets(release, false)?.map((asset) => asset.name)).toEqual([
      "llama-b1234-bin-win-cpu-x64.zip",
    ]);
  });

  test("refuses incomplete CUDA releases", () => {
    expect(selectWindowsLlamacppAssets({ ...release, assets: release.assets.slice(0, 2) }, true)).toBe(
      null,
    );
  });
});

describe("an artifact is installed only when GitHub vouches for its bytes", () => {
  test("reads the published sha256 and nothing else", () => {
    expect(publishedDigest({ ...asset, digest: `sha256:${DIGEST}` })).toBe(DIGEST);
    expect(publishedDigest({ ...asset, digest: `  SHA256:${DIGEST.toUpperCase()}  ` })).toBe(DIGEST);
  });

  test("treats an absent, foreign or malformed digest as no digest at all", () => {
    expect(publishedDigest(asset)).toBeNull();
    expect(publishedDigest({ ...asset, digest: null })).toBeNull();
    expect(publishedDigest({ ...asset, digest: "" })).toBeNull();
    expect(publishedDigest({ ...asset, digest: `md5:${DIGEST}` })).toBeNull();
    expect(publishedDigest({ ...asset, digest: `sha256:${DIGEST.slice(0, 63)}` })).toBeNull();
    expect(publishedDigest({ ...asset, digest: DIGEST })).toBeNull();
  });
});

describe("choosing which release to install", () => {
  const marker = {
    tag_name: "v0.3.0",
    assets: [{ name: "nightly-tag.txt", browser_download_url: "https://example.test/tag.txt" }],
  };

  test("skips a newest release that carries no Windows build", () => {
    expect(selectWindowsLlamacppRelease([marker, release], true)?.release.tag_name).toBe("b1234");
  });

  test("takes the newest release that does carry one", () => {
    const older = { ...release, tag_name: "b1233" };
    expect(selectWindowsLlamacppRelease([marker, release, older], false)?.release.tag_name).toBe(
      "b1234",
    );
  });

  test("reports nothing rather than guessing when no release qualifies", () => {
    expect(selectWindowsLlamacppRelease([marker], true)).toBeNull();
    expect(selectWindowsLlamacppRelease([], false)).toBeNull();
  });
});
