// A self-hosted Reflect.get can itself cache a foreign DOM getter. Forward
// through a transparent proxy so that its property cache sees only the proxy.
// An explicit receiver preserves native accessors and existing proxy traps.
// The handler has no prototype or traps, and no proxy is retained after use.
const handler: ProxyHandler<object> = Object.freeze(Object.create(null))

export function readDOMProperty<T, K extends keyof T>(target: T, key: K): T[K] {
  // Array-like and prototype helpers also accept erased primitive values.
  // Box the lookup target while preserving the original accessor receiver;
  // nullish targets must still throw instead of becoming empty objects.
  const object = target == null ? target : Object(target)
  return Reflect.get(new Proxy(object as object, handler), key, target) as T[K]
}

// Resolve the method before evaluating arguments, then retain its receiver.
// Forwarding the original method type preserves DOM overloads.
export function readDOMMethod<
  K extends PropertyKey,
  T extends Record<K, (...args: never[]) => unknown>,
>(target: T, key: K): T[K] {
  const method = readDOMProperty(target, key) as (...args: unknown[]) => unknown
  return ((...args: unknown[]) =>
    Reflect.apply(method, target, args)) as unknown as T[K]
}

export function readOptionalDOMProperty<T extends object, K extends keyof T>(
  target: T,
  key: K,
): T[K]
export function readOptionalDOMProperty<T extends object, K extends keyof T>(
  target: T | null | undefined,
  key: K,
): T[K] | undefined
export function readOptionalDOMProperty<T extends object, K extends keyof T>(
  target: T | null | undefined,
  key: K,
): T[K] | undefined {
  return target == null ? undefined : readDOMProperty(target, key)
}

export function readOptionalDOMMethod<
  K extends PropertyKey,
  T extends Record<K, (...args: never[]) => unknown>,
>(target: T | null | undefined, key: K): T[K] | undefined {
  return target == null ? undefined : readDOMMethod(target, key)
}

// Keep the argument order of `key in target`; Reflect.has also leaves getters
// uncalled while checking inherited properties.
export function hasDOMProperty<T extends object, K extends PropertyKey>(
  key: K,
  target: T,
): target is T & Record<K, unknown> {
  return Reflect.has(new Proxy(target, handler), key)
}

export function writeDOMProperty<
  T extends object,
  K extends keyof T,
  V extends T[K],
>(target: T, key: K, value: V): V {
  // Preserve strict assignment failure and the RHS return value, even when a
  // native setter normalizes the value stored in the DOM.
  if (!Reflect.set(new Proxy(target, handler), key, value, target)) {
    throw new TypeError('Cannot assign a DOM property')
  }
  return value
}
