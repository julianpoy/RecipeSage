export class ImmediateDebouncer<
  F extends (...args: Parameters<F>) => ReturnType<F>,
> {
  pendingPromise: Promise<ReturnType<F>> | null = null;
  timeout: NodeJS.Timeout | null = null;
  followupCallArgs: Parameters<F> | null = null;

  constructor(
    private method: F,
    private debounceTime: number,
    private options?: {
      /**
       * Schedule a call for the debounced method one more time after the debounce is up
       * if it's called again during the debounce wait. For instance, for re-fetching potentially stale data
       */
      enableFollowupCall?: boolean;
    },
  ) {}

  /**
   * Call the method provided to the debouncer. Return value will be stale if
   * call is made during the debounce interval
   * The immediate flag can be used to ensure this call is performed with zero delay
   */
  private async _call(
    immediate: boolean | undefined,
    args: Parameters<F>,
  ): Promise<ReturnType<F>> {
    if (immediate) {
      if (this.timeout) {
        clearTimeout(this.timeout);
        this.timeout = null;
      }
      this.pendingPromise = null;
      this.followupCallArgs = null;
    }

    if (!this.pendingPromise) {
      this.pendingPromise = Promise.resolve(this.method(...args));
    } else if (this.options?.enableFollowupCall) {
      this.followupCallArgs = args;
    }

    if (!this.timeout) {
      this.timeout = setTimeout(() => {
        this.timeout = null;
        this.pendingPromise = null;
        if (this.followupCallArgs) {
          const followupCallArgs = this.followupCallArgs;
          this.followupCallArgs = null;
          this._call(undefined, followupCallArgs);
        }
      }, this.debounceTime);
    }

    return this.pendingPromise;
  }

  public async call(immediate?: boolean, ...args: Parameters<F>) {
    this._call(immediate, args);
  }
}
