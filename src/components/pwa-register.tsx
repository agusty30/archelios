import { useEffect } from "react";

/** Manifest-only PWA — no service worker. Sets theme-color dynamically. */
export function PwaMeta() {
  useEffect(() => {
    // Nothing to register; manifest + meta tags in head handle installability.
  }, []);
  return null;
}
