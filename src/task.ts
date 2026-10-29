import type {
  CaptureDiagnostic,
  CaptureStage,
  ExtensionContext,
  Options,
} from './types.js'
import { ResourceLoader } from './resource-loader.js'

const tasks = new WeakMap<Options, CaptureTask>()

export function getTask(options: Options) {
  return tasks.get(options)
}

export function copyOptions(
  defaults: Options,
  overrides: Options = {},
): Options {
  const options = { ...defaults, ...overrides }
  options.style = { ...defaults.style, ...overrides.style }
  options.resources = { ...defaults.resources, ...overrides.resources }
  options.plugins = [
    ...(defaults.plugins || []),
    ...(overrides.plugins || []),
  ].map((plugin) => Object.freeze({ ...plugin }))
  options.exclude = options.exclude ? [...options.exclude] : undefined
  options.includeStyleProperties = options.includeStyleProperties
    ? [...options.includeStyleProperties]
    : undefined
  if (options.fetchRequestInit) {
    options.fetchRequestInit = {
      ...options.fetchRequestInit,
      headers: new Headers(options.fetchRequestInit.headers),
    }
  }
  return options
}

export class CaptureTask {
  readonly controller = new AbortController()

  readonly context: ExtensionContext

  readonly resources: ResourceLoader

  readonly diagnostics: CaptureDiagnostic[] = []

  private cleanups: (() => void)[] = []

  private disposed = false

  constructor(readonly options: Options) {
    const names = new Set<string>()
    options.plugins?.forEach(({ name }) => {
      if (!name || names.has(name)) {
        throw new Error(`Capture plugin names must be unique: "${name}"`)
      }
      names.add(name)
    })
    if (
      options.timeout != null &&
      (!Number.isFinite(options.timeout) || options.timeout < 0)
    ) {
      throw new Error('Capture timeout must be a finite, non-negative number')
    }
    if (
      options.stabilizationAttempts != null &&
      (!Number.isInteger(options.stabilizationAttempts) ||
        options.stabilizationAttempts < 1 ||
        options.stabilizationAttempts > 10)
    ) {
      throw new Error('stabilizationAttempts must be an integer from 1 to 10')
    }
    this.context = Object.freeze({ signal: this.controller.signal })
    this.resources = new ResourceLoader(options, this.context, (diagnostic) => {
      this.diagnostics.push(diagnostic)
      options.onEvent?.(Object.freeze({ type: 'warning', diagnostic }))
    })
    const signals = [options.signal, options.fetchRequestInit?.signal]
    signals.forEach((signal) => {
      if (!signal) return
      const abort = () => this.controller.abort(signal.reason)
      if (signal.aborted) abort()
      else {
        signal.addEventListener('abort', abort, { once: true })
        this.cleanups.push(() => signal.removeEventListener('abort', abort))
      }
    })
    tasks.set(options, this)
  }

  check() {
    if (this.disposed) throw new Error('Capture has been disposed')
    if (this.controller.signal.aborted) {
      throw (
        this.controller.signal.reason ||
        new DOMException('Capture aborted', 'AbortError')
      )
    }
  }

  stage(stage: CaptureStage) {
    this.check()
    this.options.onEvent?.(Object.freeze({ type: 'stage', stage }))
    this.check()
  }

  async run<T>(operation: () => Promise<T>): Promise<T> {
    this.check()
    const { signal } = this.controller
    return new Promise<T>((resolve, reject) => {
      let timer: ReturnType<typeof setTimeout> | undefined
      const clean = () => {
        if (timer != null) clearTimeout(timer)
        signal.removeEventListener('abort', abort)
      }
      const abort = () => {
        clean()
        reject(
          signal.reason || new DOMException('Capture aborted', 'AbortError'),
        )
      }
      signal.addEventListener('abort', abort, { once: true })
      const timeout = this.options.timeout ?? 30000
      if (timeout > 0) {
        timer = setTimeout(() => {
          this.controller.abort(
            new DOMException('Capture timed out', 'TimeoutError'),
          )
        }, timeout)
      }
      Promise.resolve()
        .then(() => {
          this.check()
          return operation()
        })
        .then(
          (value) => {
            clean()
            if (signal.aborted) abort()
            else resolve(value)
          },
          (error) => {
            clean()
            reject(error)
          },
        )
    })
  }

  dispose() {
    if (this.disposed) return
    this.disposed = true
    this.controller.abort(new DOMException('Capture disposed', 'AbortError'))
    this.cleanups.forEach((cleanup) => cleanup())
    this.cleanups = []
    this.resources.clear()
    // Weak entries expire with options. Pending async stages still need to see
    // this disposed task so they cannot resume work after cancellation.
  }
}
