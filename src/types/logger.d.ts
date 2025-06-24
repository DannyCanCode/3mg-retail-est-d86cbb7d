declare global {
  interface Window {
    enableDebugLogs: () => void;
    disableDebugLogs: () => void;
  }
}
export {}; 