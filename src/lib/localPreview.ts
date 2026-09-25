/** Local checkouts never contact production unless deliberately enabled. */
export const isLocalPreview =
  import.meta.env.VITE_LOCAL_PREVIEW === "true" ||
  (typeof window !== "undefined" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname) &&
    import.meta.env.VITE_ENABLE_LIVE_BACKEND !== "true");

export function isolatedFetch(
  preview: boolean,
  transport: typeof fetch = fetch,
): typeof fetch {
  return async (input, init) => {
    if (preview) {
      return new Response(
        JSON.stringify({
          error:
            "Live services are disconnected in this local preview. Explore a worked example instead.",
          code: "LOCAL_PREVIEW",
        }),
        {
          status: 503,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    if (url.includes("/functions/v1/")) {
      const headers = new Headers(
        init?.headers || (input instanceof Request ? input.headers : undefined),
      );
      if (!headers.has("x-request-id"))
        headers.set("x-request-id", crypto.randomUUID());
      return transport(input, { ...init, headers });
    }
    return transport(input, init);
  };
}
