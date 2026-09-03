export interface Env {
  TRIPDM_IMAGES?: R2Bucket;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname.slice(1); // Remove leading "/"

    if (!path) return new Response("Not Found", { status: 404 });

    // When no R2 binding is configured (pure cache/worker), fall back
    // gracefully instead of crashing.
    if (!env.TRIPDM_IMAGES) {
      return new Response("R2 binding TRIPDM_IMAGES is not configured", { status: 500 });
    }

    // Check Cloudflare cache
    const cacheKey = new Request(url.toString(), request);
    const cache = caches.default;
    let response = await cache.match(cacheKey);
    if (response) return response;

    // Fetch from R2
    const object = await env.TRIPDM_IMAGES.get(path);
    if (object === null) {
      return new Response("Not Found", { status: 404 });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    headers.set("Access-Control-Allow-Origin", "*");

    response = new Response(object.body, { headers });
    ctx.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  },
} satisfies ExportedHandler<Env>;