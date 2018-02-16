import {action, autorun, computed, IReactionDisposer, observable} from 'mobx';

import {Loadable, ReadonlyLoadable} from '.';
import {failureOr, successOr} from '../extensions';
import {expose} from '../internal';
import {Lazy} from '../lazy';
import {derive, map, rescue} from './extensions';
import {match} from './match';
import {State} from './state';
import {
  Availability,
  availabilityOf,
  Flight,
  flightOf,
  withAvailability,
} from './traits';

export class DerivedLoadable<T, To> implements ReadonlyLoadable<To> {
  @observable protected underlying: ReadonlyLoadable<T>;
  @observable protected data: To | Error | undefined = undefined;
  @observable protected state: State = State.pending;
  protected transformation: IReactionDisposer;

  constructor(
    underlying: ReadonlyLoadable<T>,
    protected options: Loadable.DeriveOptions<T, To>,
  ) {
    this.underlying = underlying;
    this.transformation = autorun('transformation', () => this.transform());
    this.transform();
  }

  protected transform() {
    const {success, failure, pending} = this.options;

    const underlying = expose<T, ReadonlyLoadable<T>, State>(this.underlying);
    const {state, data} = underlying;

    switch (availabilityOf(state)) {
      case Availability.value:
        return this.transformWith(success, data, state);
      case Availability.error:
        return this.transformWith(failure, data, state);
      case Availability.none: {
        /**
         * Inline `this.transformWith` here, since the arity of the callback
         * function is completely different.
         */
        if (!pending) {
          return this.mirror();
        }
        try {
          const isLoading = flightOf(state) === Flight.busy;
          const result = pending(isLoading);
          this.transitionTo(
            withAvailability(state, Availability.value),
            result,
          );
        } catch (e) {
          this.transitionTo(withAvailability(state, Availability.error), e);
        }
      }
    }
  }

  protected transformWith<U>(
    f: ((x: U, loading: boolean) => To) | undefined,
    v: U,
    state: State,
  ) {
    if (!f) {
      return this.mirror();
    }
    try {
      const isLoading = flightOf(state) === Flight.busy;
      const result = f(v, isLoading);
      this.transitionTo(withAvailability(state, Availability.value), result);
    } catch (e) {
      this.transitionTo(withAvailability(state, Availability.error), e);
    }
  }

  @action
  protected mirror() {
    /**
     * We have no way of knowing or proving to the TypeScript compiler that
     * `To` =:= `T`, so we expose the inner data type as `any` to ensure that
     * any unhandled case is still mirrored.
     */
    const underlying = expose<any, ReadonlyLoadable<any>, State>(
      this.underlying,
    );
    this.transitionTo(underlying.state, underlying.data);
  }

  @action
  protected transitionTo(state: State, data: To | Error | undefined): void {
    this.state = state;
    this.data = data;
  }

  /**
   * Indicates if this Loadable is a success.
   */
  @computed
  get isSuccess(): boolean {
    return availabilityOf(this.state) === Availability.value;
  }

  /**
   * Indicates if this Loadable is a failure.
   */
  @computed
  get isFailure(): boolean {
    return availabilityOf(this.state) === Availability.error;
  }

  /**
   * Indicates if this Loadable is pending.
   */
  @computed
  get isPending(): boolean {
    return availabilityOf(this.state) === Availability.none;
  }

  /**
   * Indicates if this Loadable is the process of loading, which happens in one
   * of the following three states: reloading, retrying, and pending.
   */
  @computed
  get isLoading(): boolean {
    return flightOf(this.state) === Flight.busy;
  }

  /**
   * Invokes one of the provided callbacks that corresponds this Loadable's
   * current state.
   * @param options An object of callbacks to be invoked according to the state.
   * @returns The return value of whichever callback was selected.
   */
  match<A, B, C>(options: Loadable.MatchOptions<To, A, B, C>): A | B | C {
    return match(this.state, this.data, this.isLoading, options);
  }

  /**
   * Returns this Loadable's success value if it is a success, or the provided
   * default value if it is not.
   * @param defaultValue A possibly lazy value to use in case of non-success
   * @returns This Future's success value or the provided default value
   */
  successOr<U>(defaultValue: Lazy<U>): To | U {
    return successOr(this, defaultValue);
  }

  /**
   * Returns this Loadable's error value if it is a failure, or the provided
   * default value if it is not.
   * @param defaultValue A possibly lazy value to use in case of non-failure
   * @returns this Loadable's failure error or the provided default value
   */
  failureOr<U>(defaultValue: Lazy<U>): Error | U {
    return failureOr(this, defaultValue);
  }

  /**
   * Derives a ReadonlyLoadable that syncs with this Loadable using the given
   * options. For each transform function in the options, returning a value will
   * turn the derivation into a success or a reloading with that value, whereas
   * throwing an error will turn it into a failure or a retrying with that error
   * value.
   *
   * The resulting derivation updates as the Loadable it is derived from
   * updates and changes state.
   * @param options An object of transform functions to be invoked according
   * to the state
   * @returns A derived ReadonlyLoadable
   */
  derive<U>(options: Loadable.DeriveOptions<To, U>): ReadonlyLoadable<U> {
    return derive(this, options);
  }

  /**
   * Creates a derived ReadonlyLoadable that syncs with this Loadable, except
   * success values are first transformed using the provided function `f`. When
   * the provided function throws, the derived ReadonlyLoadable becomes a
   * failure or a retrying.
   *
   * This is a shorthand of calling `derive` with only a `success` function.
   * @param f The success transformation function
   * @returns A derived ReadonlyFuture
   */
  map<U>(f: (value: To) => U): ReadonlyLoadable<U> {
    return map(this, f);
  }

  /**
   * Creates a derived ReadonlyLoadable that syncs with this Loadable, except
   * error values are first transformed using the provided function `f`. When
   * the provided function returns, the derived ReadonlyLoadable becomes a
   * success or a reloading. When it throws, the derivation becomes a failure
   * or retrying.
   *
   * This is a shorthand of calling `derive` with only a `failure` function.
   * @param f The failure transformation function
   * @returns A derived ReadonlyFuture
   */
  rescue<U = To>(f: (error: Error) => U): ReadonlyLoadable<U> {
    return rescue(this, f);
  }
}
