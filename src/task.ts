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

  private cloneSources = new WeakMap<Element, Element>()

  private excludedSources = new WeakSet<Node>()

  excludeSource(node: Node) {
    this.excludedSources.add(node)
  }

  isExcludedSource(node: Node) {
    let current: Node | null = node
    while (current) {
      if (this.excludedSources.has(current)) return true
      current = current.parentNode || (current as ShadowRoot).host || null
    }
    return false
  }

  registerClone(copy: Element, source: Element) {
    this.cloneSources.set(copy, source)
  }

  getCloneSource(copy: Element) {
    return this.cloneSources.get(copy)
  }

  clearCloneSources() {
    this.cloneSources = new WeakMap()
    this.excludedSources = new WeakSet()
  }

  private inheritedStyles = new WeakMap<
    Element,
    { style: CSSStyleDeclaration; values: Map<string, string> }
  >()

  private cleanups: (() => void)[] = []

  private disposed = false

  private cloneSliceStartedAt?: number

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
      options.cloneTimeSliceMs != null &&
      (!Number.isFinite(options.cloneTimeSliceMs) ||
        options.cloneTimeSliceMs < 0)
    ) {
      throw new Error('cloneTimeSliceMs must be a finite, non-negative number')
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

  getInheritedStyleValue(node: Element, name: string): string {
    let cached = this.inheritedStyles.get(node)
    if (!cached) {
      cached = {
        style: (node.ownerDocument.defaultView || window).getComputedStyle(
          node,
        ),
        values: new Map(),
      }
      this.inheritedStyles.set(node, cached)
    }
    if (!cached.values.has(name)) {
      cached.values.set(name, cached.style.getPropertyValue(name))
    }
    return cached.values.get(name)!
  }

  clearInheritedStyles() {
    this.inheritedStyles = new WeakMap()
  }

  maybeYieldClone(): Promise<void> | undefined {
    const slice = this.options.cloneTimeSliceMs ?? 16
    if (slice === 0) return undefined
    const now = performance.now()
    if (this.cloneSliceStartedAt == null) {
      this.cloneSliceStartedAt = now
      return undefined
    }
    if (now - this.cloneSliceStartedAt < slice) return undefined
    // A message task yields to the event loop without a timer delay.
    return new Promise<void>((resolve) => {
      const channel = new MessageChannel()
      channel.port1.onmessage = () => {
        channel.port1.close()
        channel.port2.close()
        resolve()
      }
      channel.port2.postMessage(undefined)
    }).then(() => {
      this.check()
      this.cloneSliceStartedAt = performance.now()
    })
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
    this.clearInheritedStyles()
    this.clearCloneSources()
    this.resources.clear()
    // Weak entries expire with options. Pending async stages still need to see
    // this disposed task so they cannot resume work after cancellation.
  }
}
