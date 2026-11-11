"use client";

import { useEffect } from "react";

export default function RegisterSW() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // offline-shell caching is a nice-to-have; ignore registration failures
      });
    }
  }, []);
  return null;
}
