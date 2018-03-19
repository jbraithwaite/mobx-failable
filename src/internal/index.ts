/**
 * These utilities are intended for internal use only and are subjected to
 * change anytime.
 */

import {Future, ReadonlyFuture} from '../future';

export type ExposedFuture<
  T,
  F extends ReadonlyFuture<T>,
  State = Future.State
> = F & {
  data: T | Error | undefined;
  state: State;
};

/**
 * Takes a Future and recasts it so the internal protected fields are
 * accessible.
 */
export function expose<T, F extends ReadonlyFuture<T>, State = Future.State>(
  future: F,
): ExposedFuture<T, F, State> {
  return future as ExposedFuture<T, F, State>;
}
