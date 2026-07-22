type Value = {
  contentType: string
  asString: () => string
  asDataUrl: () => string
}

export class Cache {
  private values = new Map<string, Value>()

  add(key: string, value: Value) {
    this.values.set(key, value)
  }

  get(key: string) {
    return this.values.get(key)
  }

  has(key: string) {
    return this.values.has(key)
  }
}
