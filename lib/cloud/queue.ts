/**
 * Runs async tasks strictly one after another, in the order they were queued. An export (manual or
 * scheduled) must never overlap another one: they share one progress display and one history.
 * A task that fails does not stop the tasks queued behind it.
 */
export function createSerialQueue() {
  let tail: Promise<unknown> = Promise.resolve();
  let pending = 0;

  return {
    run<T>(task: () => Promise<T>): Promise<T> {
      pending += 1; // counted at once, so callers can see "something is queued" before it starts
      const result = tail.then(() => task());
      tail = result.then(
        () => undefined,
        () => undefined,
      );
      return result.finally(() => {
        pending -= 1;
      });
    },
    /** Tasks queued or running right now. */
    pending: () => pending,
  };
}
