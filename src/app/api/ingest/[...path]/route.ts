/**
 * Reverse-proxy for PostHog ingestion.
 * Routes /api/ingest/* → PostHog, so events aren't blocked by ad-blockers.
 * https://posthog.com/docs/advanced/proxy/nextjs
 */
export const dynamic = "force-dynamic";

const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";

async function handler(request: Request) {
  const url = new URL(request.url);
  // Strip the /api/ingest prefix and forward the rest to PostHog
  const posthogPath = url.pathname.replace(/^\/api\/ingest/, "");
  const target = `${POSTHOG_HOST}${posthogPath}${url.search}`;

  const headers = new Headers(request.headers);
  headers.delete("host");

  const response = await fetch(target, {
    method: request.method,
    headers,
    body:
      request.method !== "GET" && request.method !== "HEAD"
        ? request.body
        : undefined,
    // @ts-expect-error – Node 18+ fetch requires this to stream the body
    duplex: "half",
  });

  return new Response(response.body, {
    status: response.status,
    headers: response.headers,
  });
}

export { handler as GET, handler as POST };
