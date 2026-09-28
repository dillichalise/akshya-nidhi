"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect } from "react";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host =
      process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";

    if (!key) return; // skip in dev if key not set

    posthog.init(key, {
      api_host: host,
      // Route ingestion through the Next.js reverse-proxy to avoid ad-blockers
      ui_host: "https://eu.posthog.com",
      capture_pageview: "history_change", // SPA-friendly automatic pageview capture
      capture_pageleave: true,
      session_recording: {
        maskAllInputs: false, // mask passwords / sensitive fields by default
      },
    });
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
