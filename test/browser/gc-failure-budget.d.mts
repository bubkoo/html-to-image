export function withinGCFailureBudget<T>(
  operation: () => Promise<T>,
  deadline: number,
): Promise<T>
