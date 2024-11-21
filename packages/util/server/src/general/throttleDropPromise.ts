/**
 * Limits the number of calls to a promise-based (or synchronous) function, dropping any call
 * that comes in during the debounceTime.
 * Waits for the promise-based function to resolve, effectively making this a debounce function with
 * a debounce time of min(debounceTime, resolutionTime) where resolutionTime is the amount of time the promise takes to resolve. If the debounceTime is less than the resolutionTime, this throttle will effectively thereby limit calls to sequentially executing, which may/may not be desired.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const throttleDropPromise = <T extends (...args: any) => any>(
  cb: T,
  debounceTime: number,
) => {
  let timeout: NodeJS.Timeout | undefined;

  return async (...args: Parameters<T>) => {
    if (!timeout) {
      const p = cb(...args);

      timeout = setTimeout(async () => {
        await p;

        timeout = undefined;
      }, debounceTime);
    }
  };
};
