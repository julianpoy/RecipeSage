/**
 * Limits the number of calls to a promise-based (or synchronous) function, dropping any call
 * that comes in during the debounceTime except for the most recent one, which is replayed once
 * the debounceTime elapses so the final call is never lost.
 * Waits for the promise-based function to resolve, effectively making this a debounce function with
 * a debounce time of min(debounceTime, resolutionTime) where resolutionTime is the amount of time the promise takes to resolve. If the debounceTime is less than the resolutionTime, this throttle will effectively thereby limit calls to sequentially executing, which may/may not be desired.
 * A rejected call is swallowed so that a single failure cannot break the throttle permanently.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const throttleDropPromise = <T extends (...args: any) => any>(
  cb: T,
  debounceTime: number,
) => {
  let timeout: NodeJS.Timeout | undefined;
  let trailingArgs: Parameters<T> | undefined;

  const invoke = (args: Parameters<T>) => {
    const p = (async () => cb(...args))().catch(() => undefined);

    timeout = setTimeout(async () => {
      await p;

      timeout = undefined;

      if (trailingArgs) {
        const nextArgs = trailingArgs;
        trailingArgs = undefined;
        invoke(nextArgs);
      }
    }, debounceTime);
  };

  return async (...args: Parameters<T>) => {
    if (timeout) {
      trailingArgs = args;
      return;
    }

    invoke(args);
  };
};
