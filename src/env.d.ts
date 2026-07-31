/// <reference types="vite/client" />

import type { NPMateDesktopApi } from '../electron/preload'

declare global {
  interface Window {
    npmate: NPMateDesktopApi
  }
}

export {}
