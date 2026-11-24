/// <reference lib="es2021.weakref" />
import { commands, server } from 'vitest/browser'

declare module 'vitest/browser' {
  interface BrowserCommands {
    recordReferenceOnlyLifetime(record: string): Promise<void>
  }
}

// Only call after caching a failed primary result. Do not dereference the target
// or expose the capture/environment/negative control to the privileged observer.
export async function recordReferenceFailure(
  kind: string,
  reference: WeakRef<Document>,
  primary: Record<string, unknown>,
) {
  if (server.browser !== 'firefox') return
  Reflect.set(globalThis, '__codex_ref_probe', {
    __codexHeap: true,
    reference,
  })
  try {
    await commands.recordReferenceOnlyLifetime(
      JSON.stringify({ kind, primary }),
    )
  } finally {
    Reflect.deleteProperty(globalThis, '__codex_ref_probe')
  }
}
