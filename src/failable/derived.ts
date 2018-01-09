import {action, autorun, computed, IReactionDisposer, observable} from 'mobx';

import {failureOr, successOr} from '../extensions';
import {Future, ReadonlyFuture} from '../future';
import {Lazy} from '../lazy';
import {match} from './match';

const State = Future.State;

export class DerivedFailable<T, To> implements ReadonlyFuture<To> {
  @observable protected underlying: ReadonlyFuture<T>;
  @observable protected data: To | Error | undefined = undefined;
  @observable protected state: Future.State = State.pending;
  protected transformation: IReactionDisposer;

  constructor(
    underlying: ReadonlyFuture<T>,
    protected options: Future.DeriveOptions<T, To>,
  ) {
    this.underlying = underlying;
    this.transformation = autorun('transformation', () => this.transform());
    this.transform();
  }

  protected transform() {
    const {success, failure, pending} = this.options;

    this.underlying.match({
      success: value => {
        success
          ? this.transformWith(success, value)
          : /**
             * This branch only gets taken when `DeriveOptions` does not have a
             * success callback. At this point the TypeScript compiler cannot
             * know or prove that type `To` =:= `T`, so the `value` is cast to
             * `never` to ensure that an unhandled success is still mirrored.
             */
            this.transitionTo(State.success, value as never);
      },
      failure: error => {
        failure
          ? this.transformWith(failure, error)
          : this.transitionTo(State.failure, error);
      },
      pending: () => {
        pending
          ? this.transformWith(pending, undefined)
          : this.transitionTo(State.pending, undefined);
      },
    });
  }

  protected transformWith<U>(f: (x: U) => To, v: U): void {
    try {
      const result = f(v);
      this.transitionTo(State.success, result);
    } catch (e) {
      this.transitionTo(State.failure, e);
    }
  }

  @action
  protected transitionTo(
    state: Future.State,
    data: To | Error | undefined,
  ): void {
    this.state = state;
    this.data = data;
  }

  /**
   * Indicates if this Failable is a success.
   */
  @computed
  get isSuccess(): boolean {
    return this.state === State.success;
  }

  /**
   * Indicates if this Failable is a failure.
   */
  @computed
  get isFailure(): boolean {
    return this.state === State.failure;
  }

  /**
   * Indicates if this Failable is pending.
   */
  @computed
  get isPending(): boolean {
    return this.state === State.pending;
  }

  /**
   * Invokes one of the provided callbacks that corresponds this Failable's
   * current state.
   * @param options An object of callbacks to be invoked according to the state.
   * @returns The return value of whichever callback was selected.
   */
  match<A, B, C>(options: Future.MatchOptions<To, A, B, C>): A | B | C {
    return match(this.state, this.data, options);
  }

  /**
   * Returns this Failable's success value if it is a success, or the provided
   * default value if it is not.
   * @param defaultValue A possibly lazy value to use in case of non-success
   * @returns This Future's success value or the provided default value
   */
  successOr<U>(defaultValue: Lazy<U>): To | U {
    return successOr(this, defaultValue);
  }

  /**
   * Returns this Failable's error value if it is a failure, or the provided
   * default value if it is not.
   * @param defaultValue A possibly lazy value to use in case of non-failure
   * @returns this Failable's failure error or the provided default value
   */
  failureOr<U>(defaultValue: Lazy<U>): Error | U {
    return failureOr(this, defaultValue);
  }
}
