export function withTimeout<T>(
  promise: Promise<T>,
  ms = 4000,
  timeoutMsg = 'Request timed out'
): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    const id = setTimeout(() => {
      clearTimeout(id);
      reject(new Error(timeoutMsg));
    }, ms);
  });

  return Promise.race([promise, timeout]);
} 