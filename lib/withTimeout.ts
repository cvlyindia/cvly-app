/**
 * Races a promise against a timeout, resolving to `fallback` if the promise hasn't
 * settled in time. This matters specifically because "fail open on error" (the
 * existing pattern in checkCredits/checkAnonymousLimit for a genuine Supabase error)
 * only works if the call actually throws. A network hiccup that causes a request to
 * hang rather than fail fast never throws at all — it just never resolves — so the
 * existing error handling never gets a chance to run, and the whole request blocks
 * until the platform's own outer timeout kills it. This makes that failure mode fail
 * fast and safely instead.
 */
export function withTimeout<T>(promise: PromiseLike<T>, ms: number, fallback: T): Promise<T> {
  return new Promise<T>((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(fallback);
      }
    }, ms);

    promise.then(
      (value) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(value);
        }
      },
      () => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(fallback);
        }
      }
    );
  });
}
