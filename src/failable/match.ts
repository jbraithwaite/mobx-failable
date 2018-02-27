import {Future} from '../future';

export function match<T, A, B, C>(
  state: Future.State,
  data: T | Error | undefined,
  options: Future.MatchOptions<T, A, B, C>,
): A | B | C {
  const {success, failure, pending} = options;

  /**
   * We directly cast here because it is more succinct and less overhead
   * compared to other techniques, like tagged unions and custom type guards.
   */
  switch (state) {
    case Future.State.success:
      return success(data as T);
    case Future.State.failure:
      return failure(data as Error);
    case Future.State.pending:
      return pending();
  }
}
