/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** База API. По умолчанию same-origin `/api` (dev: прокси Vite, prod: nginx). */
  readonly VITE_API_BASE?: string;
  /** URL WebSocket. По умолчанию same-origin `/ws`. */
  readonly VITE_WS_URL?: string;
}
