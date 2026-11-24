// Keep a Document-specific property access out of long-lived caller scripts.
// Reflect.get uses the same receiver and own/inherited getters as target[key].
export function readDocumentProperty<K extends keyof Document>(
  target: Document,
  key: K,
): Document[K] {
  return Reflect.get(target, key) as Document[K]
}
