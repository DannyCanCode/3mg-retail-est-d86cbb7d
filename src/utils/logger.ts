// Utility logger that mutes verbose console output in production for non-admin users.
// Usage: import { initLogger } from "@/utils/logger"; initLogger();

const isProd = import.meta.env.MODE === "production";

function shouldEnableDebug(): boolean {
  // 1) Always enabled in non-production builds
  if (!isProd) return true;
  // 2) Enable when explicitly requested via ?debug=1 in the URL
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("debug") === "1") return true;
  // 3) Enable when a flag is saved to localStorage – can be toggled from DevTools
  if (localStorage.getItem("debug") === "true") return true;
  return false;
}

export function initLogger(): void {
  const debugOn = shouldEnableDebug();

  // In production without debug flag, silence noise while preserving warnings/errors.
  if (!debugOn) {
    console.debug = () => {};
    console.log = () => {};
    console.info = () => {};
  }

  // Expose tiny helpers so admins can toggle debug from DevTools and refresh.
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore – extending window object
  window.enableDebugLogs = () => {
    localStorage.setItem("debug", "true");
    window.location.reload();
  };
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore – extending window object
  window.disableDebugLogs = () => {
    localStorage.removeItem("debug");
    window.location.reload();
  };
}

// Provide typed definitions for the helpers (ambient declaration)
export {}; 