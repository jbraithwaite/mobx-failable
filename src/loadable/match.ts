import {Loadable} from '.';

export function match<T, A, B, C>(
  state: Loadable.State,
  data: T | Error | undefined,
  isLoading: boolean,
  options: Loadable.MatchOptions<T, A, B, C>,
): A | B | C {
  const {success, failure, pending} = options;

  /**
   * We directly cast here because it is more succinct and less overhead
   * compared to other techniques, like tagged unions and custom type guards.
   */
  switch (state) {
    case Loadable.State.success:
    case Loadable.State.reloading:
      return success(data as T, isLoading);
    case Loadable.State.failure:
    case Loadable.State.retrying:
      return failure(data as Error, isLoading);
    case Loadable.State.empty:
    case Loadable.State.pending:
      return pending(isLoading);
  }
}
