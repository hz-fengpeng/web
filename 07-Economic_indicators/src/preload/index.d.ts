import type { MacroApi } from '@shared/types'

declare global {
  interface Window {
    macro: MacroApi
  }
}

export {}
