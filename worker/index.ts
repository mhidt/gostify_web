export default {
  async fetch(request: Request): Promise<Response> {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type, HTTP-Referer",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);

    // Image proxy: GET /api/image-proxy?url=...
    if (url.pathname === "/api/image-proxy" && request.method === "GET") {
      const target = url.searchParams.get("url");
      if (!target) return new Response("Missing url param", { status: 400 });

      const response = await fetch(target, {
        headers: { "Accept": "image/*,*/*", "User-Agent": "Mozilla/5.0" },
      });

      const responseHeaders = new Headers(response.headers);
      responseHeaders.set("Access-Control-Allow-Origin", "*");
      responseHeaders.set("Cache-Control", "public, max-age=86400");

      return new Response(response.body, {
        status: response.status,
        headers: responseHeaders,
      });
    }

    // AI proxy: POST with ?url=...
    const target = url.searchParams.get("url");
    if (!target) return new Response("Missing url param", { status: 400 });

    const headers = new Headers(request.headers);
    headers.delete("origin");
    headers.delete("referer");
    headers.delete("host");

    const response = await fetch(target, {
      method: request.method,
      headers,
      body: request.body,
    });

    const responseHeaders = new Headers(response.headers);
    for (const [key, value] of Object.entries(corsHeaders)) {
      responseHeaders.set(key, value);
    }

    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  },
};
