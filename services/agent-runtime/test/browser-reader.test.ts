import { afterEach, expect, test } from "bun:test";
import {
  fetchBrowserPaneReadable,
  fetchReadable,
} from "../src/browser-host/reader";

afterEach(() => {
  globalThis.__LOCAL_STUDIO_BROWSER_READER_HOST_RESOLVER_FOR_TEST = undefined;
  globalThis.__LOCAL_STUDIO_BROWSER_READER_REQUEST_FOR_TEST = undefined;
});

test("browser pane reading mode permits loopback without weakening public fetches", async () => {
  globalThis.__LOCAL_STUDIO_BROWSER_READER_HOST_RESOLVER_FOR_TEST = async () => [
    { address: "127.0.0.1", family: 4 },
  ];
  globalThis.__LOCAL_STUDIO_BROWSER_READER_REQUEST_FOR_TEST = async (url) => ({
    status: 200,
    ok: true,
    url,
    contentType: "text/html",
    body: "<title>Local Studio</title><body>Agent</body>",
  });

  const result = await fetchBrowserPaneReadable("http://127.0.0.1:3000/agent");
  expect(result.title).toBe("Local Studio");
  expect(result.text).toBe("Agent");
  await expect(fetchReadable("http://127.0.0.1:3000/agent")).rejects.toThrow(
    "must be public",
  );
});

test("browser pane reading mode rejects public DNS rebinding to loopback", async () => {
  globalThis.__LOCAL_STUDIO_BROWSER_READER_HOST_RESOLVER_FOR_TEST = async () => [
    { address: "127.0.0.1", family: 4 },
  ];

  await expect(fetchBrowserPaneReadable("https://example.com/")).rejects.toThrow(
    "Resolved host rejected",
  );
});
