import { Router } from "express";

const proxyRouter = Router();

/**
 * Proxy all /fastapi-proxy/* requests to the upstream FastAPI server.
 *
 * The caller must supply one of:
 *  - X-Target-Url header  (for fetch/XHR calls that can set headers)
 *  - _target query param  (for <img src="..."> and similar tag-based requests)
 *
 * The path after /fastapi-proxy is forwarded verbatim (minus _target param).
 *
 * Uses router.use() instead of router.all() to avoid path-to-regexp v8
 * wildcard restrictions in Express 5.
 */
proxyRouter.use("/fastapi-proxy", async (req, res) => {
  // Resolve the upstream base URL
  const targetBase = (
    (req.headers["x-target-url"] as string) ||
    (req.query._target as string)
  )?.replace(/\/$/, "");

  if (!targetBase) {
    res.status(400).json({ error: "Missing X-Target-Url header or _target query param" });
    return;
  }

  // With router.use("/fastapi-proxy", ...), req.url is the sub-path:
  //   e.g. /api/v1/config?limit=5&_target=...
  // Build the query string without the internal _target param.
  const urlObj = new URL(req.url, "http://x");
  urlObj.searchParams.delete("_target");
  const subPath = urlObj.pathname + (urlObj.search || "");

  const targetUrl = `${targetBase}${subPath}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "application/json, image/*, */*",
    // ngrok free interstitial blocks non-browser upstream calls without this
    "ngrok-skip-browser-warning": "true",
  };

  const fetchOptions: RequestInit = {
    method: req.method,
    headers,
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    fetchOptions.body = JSON.stringify(req.body);
  }

  try {
    const upstream = await fetch(targetUrl, fetchOptions);
    res.status(upstream.status);

    // Forward content-type so images and JSON both render correctly
    const contentType = upstream.headers.get("content-type");
    if (contentType) res.setHeader("Content-Type", contentType);

    const buffer = await upstream.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(502).json({ error: "Upstream FastAPI unreachable", detail: message });
  }
});

export default proxyRouter;
