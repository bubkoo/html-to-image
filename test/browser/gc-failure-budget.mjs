// Every phase uses the same absolute deadline; late rejection is consumed.
export function withinGCFailureBudget(operation, deadline) {
  return new Promise((resolve, reject) => {
    const remaining = deadline - Date.now()
    if (remaining <= 0) {
      reject(new Error('GC diagnostic budget exhausted'))
      return
    }
    const timer = setTimeout(
      () => reject(new Error('GC diagnostic budget exhausted')),
      remaining,
    )
    Promise.resolve()
      .then(operation)
      .then(
        (value) => {
          clearTimeout(timer)
          resolve(value)
        },
        (error) => {
          clearTimeout(timer)
          reject(error)
        },
      )
  })
}
