export default {
  async fetch(request) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
      "Access-Control-Max-Age": "86400",
    };

    const API_URL = "https://api.minecraftservices.com";
    const PROXY_ENDPOINT = "/api";
    const url = new URL(request.url);

    if (!url.pathname.startsWith(PROXY_ENDPOINT)) {
      return new Response(
        "This is a proxy service. Append '/api' before your request path to proxy to the target API. For any questions regarding the source code, feel free to Email i@cvyl.me.",
        { headers: { "content-type": "text/plain" } }
      );
    }

    // Function to handle the proxied request.
    async function handleRequest(request) {
      const newPath = url.pathname.replace(new RegExp(`^${PROXY_ENDPOINT}`), "");
      const targetUrl = new URL(API_URL + newPath);
      targetUrl.search = url.search;

      const modifiedRequest = new Request(targetUrl, request);
      modifiedRequest.headers.set("Origin", targetUrl.origin);

      let response = await fetch(modifiedRequest);
      response = new Response(response.body, response);

      response.headers.set("Access-Control-Allow-Origin", "*");
      response.headers.append("Vary", "Origin");

      return response;
    }

    // Function to handle OPTIONS (preflight) requests.
    async function handleOptions(request) {
      if (
        request.headers.get("Origin") !== null &&
        request.headers.get("Access-Control-Request-Method") !== null &&
        request.headers.get("Access-Control-Request-Headers") !== null
      ) {
        // Respond to the preflight request with the appropriate CORS headers.
        return new Response(null, {
          headers: {
            ...corsHeaders,
            "Access-Control-Allow-Headers": request.headers.get("Access-Control-Request-Headers"),
          },
        });
      } else {
        // If it's a standard OPTIONS request, simply return allowed methods.
        return new Response(null, {
          headers: { Allow: "GET, HEAD, POST, OPTIONS" },
        });
      }
    }

    if (request.method === "OPTIONS") {
      return handleOptions(request);
    } else if (["GET", "POST", "HEAD"].includes(request.method)) {
      return handleRequest(request);
    } else {
      return new Response(null, {
        status: 405,
        statusText: "Method Not Allowed",
      });
    }
  },
};