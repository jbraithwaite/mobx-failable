/**
 * A type that denotes an existing value or a function that, when invoked,
 * produces a value. Note that the value's type cannot also be a function.
 */
export type Lazy<T> = T | (() => T);

export namespace Lazy {
  /**
   * Forces the given possibly lazy value to evaluate. If the given value is
   * lazy (a function), invokes the function and returns that result. If not,
   * returns the value as-is.
   * @param v A possibly lazy value
   * @returns The result of evaluation
   */
  export function force<T>(v: Lazy<T>): T {
    return v instanceof Function ? v() : v;
  }
}
