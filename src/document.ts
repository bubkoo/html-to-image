// Keep a Document-specific property access out of long-lived caller scripts.
// Reflect.get uses the same receiver and own/inherited getters as target[key].
export function readDocumentProperty<T extends object, K extends keyof T>(
  target: T,
  key: K,
): T[K] {
  return Reflect.get(target, key) as T[K]
}

type MethodKey<T extends object> = {
  [K in keyof T]-?: T[K] extends (...args: never[]) => unknown ? K : never
}[keyof T]

// Resolve the getter before the caller evaluates its arguments, then use the
// original receiver. Forwarding the method type preserves DOM overloads.
export function readDocumentMethod<T extends object, K extends MethodKey<T>>(
  target: T,
  key: K,
): T[K] {
  const method = Reflect.get(target, key) as (...args: unknown[]) => unknown
  return ((...args: unknown[]) =>
    Reflect.apply(method, target, args)) as unknown as T[K]
}

export function readOptionalDocumentProperty<
  T extends object,
  K extends keyof T,
>(target: T | null | undefined, key: K): T[K] | undefined {
  return target == null ? undefined : readDocumentProperty(target, key)
}
