"use client";
import { useEffect } from "react";

/** Registers the service worker (offline shell + push notifications). */
export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((e) => console.warn("SW registration failed", e));
  }, []);
  return null;
}
