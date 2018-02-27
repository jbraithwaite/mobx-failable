import {action, computed, observable} from 'mobx';

import {accept, failureOr, successOr} from '../extensions';
import {Future} from '../future';
import {Lazy} from '../lazy';
import {derive, map, rescue} from './extensions';
import {match} from './match';
import {State as _State} from './state';
import {
  Availability,
  availabilityOf,
  Flight,
  flightOf,
  withFlight,
} from './traits';

/**
 * Loadable is an extension of Failable. It has six states: empty, pending,
 * success, reloading, failure, and retrying. When constructed, it starts out
 * in the empty state. See `Loadable.State` for more details.
 *
 * The action methods `success`, `failure`, and `pending` are used to change
 * between these states. The computed properties indicate the current state,
 * but for day-to-day usage, prefer the `match` method.
 */
export class Loadable<T> implements Future<T> {
  @observable protected data: T | Error | undefined = undefined;
  @observable protected state: _State = _State.empty;

  toString(): string {
    return `Loadable { state=${this.state}, data=${this.data} }`;
  }

  /**
   * Indicates if this Loadable is a success or reloading.
   */
  @computed
  get isSuccess(): boolean {
    return availabilityOf(this.state) === Availability.value;
  }

  /**
   * Indicates if this Loadable is a failure or retrying.
   */
  @computed
  get isFailure(): boolean {
    return availabilityOf(this.state) === Availability.error;
  }

  /**
   * Indicates if this Loadable is empty or pending.
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
   * Sets this Loadable to a success.
   * @param data The value associated with the success.
   * @returns This, enabling chaining.
   */
  @action.bound
  success(data: T): this {
    this.state = _State.success;
    this.data = data;
    this.didBecomeSuccess(data);
    return this;
  }

  /**
   * A lifecycle method that is invoked after this Loadable becomes a success.
   * This can be overridden in a subclass.
   */
  protected didBecomeSuccess(_data: T): void {
    /* */
  }

  /**
   * Sets this Loadable to a failure.
   * @param error The error associated with the failure.
   * @returns This, enabling chaining.
   */
  @action.bound
  failure(error: Error): this {
    this.state = _State.failure;
    this.data = error;
    this.didBecomeFailure(error);
    return this;
  }

  /**
   * A lifecycle method that is invoked after this Loadable becomes a success.
   * This can be overridden in a subclass.
   */
  protected didBecomeFailure(_error: Error): void {
    /* */
  }

  /**
   * An alias to `loading`. Unlike standard Future behavior, calling this does
   * not clear existing data.
   */
  @action.bound
  pending(): this {
    return this.loading();
  }

  /**
   * Sets this Loadable to a loading state. If the current state is empty, the
   * new state is pending. If the current state is success, the new state is
   * reloading. If the current state is failure, the new state is retrying.
   * If the current state does not fall under any of the above, nothing
   * happens.
   * @returns This, enabling chaining.
   */
  @action.bound
  loading(): this {
    const oldState = this.state;
    const newState = withFlight(oldState, Flight.busy);

    if (oldState !== newState) {
      this.state = newState;
      this.didBecomeLoading();
    }

    return this;
  }

  /**
   * A lifecycle method that is invoked after this Loadable becomes a loading
   * state. This can be overridden in a subclass.
   */
  protected didBecomeLoading(): void {
    /* */
  }

  /**
   * Invokes one of the provided callbacks that corresponds this Loadable's
   * current state.
   * @param options An object of callbacks to be invoked according to the state.
   * @returns The return value of whichever callback was selected.
   */
  match<A, B, C>(options: Loadable.MatchOptions<T, A, B, C>): A | B | C {
    return match(this.state, this.data, this.isLoading, options);
  }

  /**
   * Accepts a promise by immediately setting this Loadable to a loading state,
   * and then either setting this Loadable to a success if the promise was
   * fulfilled, or setting this Loadable to a failure if the promise was
   * rejected.
   * @param promise A promise to be accepted
   * @returns This, enabling chaining.
   */
  accept(promise: PromiseLike<T>): this {
    accept(this, promise);
    return this;
  }

  /**
   * Returns this Loadable's success value if it is a success or a reloading,
   * or the provided default value if it is not.
   * @param defaultValue A possibly lazy value to use in case of non-value
   * @returns This Loadable's value or the provided default value
   */
  successOr<U>(defaultValue: Lazy<U>): T | U {
    return successOr(this, defaultValue);
  }

  /**
   * Returns this Loadable's error value if it is a failure or a retrying, or
   * the provided default value if it is not.
   * @param defaultValue A possibly lazy value to use in case of non-error
   * @returns this Loadable's error or the provided default error
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
  derive<U>(options: Loadable.DeriveOptions<T, U>): ReadonlyLoadable<U> {
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
  map<U>(f: (value: T) => U): ReadonlyLoadable<U> {
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
  rescue<U = T>(f: (error: Error) => U): ReadonlyLoadable<U> {
    return rescue(this, f);
  }
}

export namespace Loadable {
  // tslint:disable-next-line:variable-name
  export const State = _State;

  /**
   * Each of the six Loadable states is composed of two traits: availability and
   * flight. Availability refers to if there is no data, some data, or some
   * error. Flight, also known as "loading", refers to whether there is an
   * ongoing request.
   */
  export type State = _State;

  /**
   * MatchOptions is an object filled with callbacks. Each callback corresponds
   * to a possible availability. The `success` callback receives whatever
   * success value was just set. The `failure` callback receives whatever error
   * was just set. The `pending` callback does not receive any values.
   *
   * All three callbacks take an additional `loading` boolean, which reflects
   * the flight of the state. It is true when busy, or false when idle.
   */
  export interface MatchOptions<T, A, B, C> {
    success: (data: T, loading: boolean) => A;
    failure: (error: Error, loading: boolean) => B;
    pending: (loading: boolean) => C;
  }

  /**
   * DeriveOptions is similar to MatchOptions, except only one callback is
   * required. The return value of any callback is accordingly re-wrapped in
   * another Loadable.
   */
  export type DeriveOptions<From, To> =
    | DeriveOptions.AtLeastSuccess<From, To>
    | DeriveOptions.AtLeastFailure<From, To>
    | DeriveOptions.AtLeastPending<From, To>;

  export namespace DeriveOptions {
    export interface AtLeastSuccess<From, To> {
      success: (data: From, loading: boolean) => To;
      failure?: (error: Error, loading: boolean) => To;
      pending?: (loading: boolean) => To;
    }

    export interface AtLeastFailure<From, To> {
      success?: (data: From, loading: boolean) => To;
      failure: (error: Error, loading: boolean) => To;
      pending?: (loading: boolean) => To;
    }

    export interface AtLeastPending<From, To> {
      success?: (data: From, loading: boolean) => To;
      failure?: (error: Error, loading: boolean) => To;
      pending: (loading: boolean) => To;
    }
  }
}

export interface ReadonlyLoadable<T> {
  /**
   * Indicates if this Loadable is a success or reloading.
   */
  readonly isSuccess: boolean;

  /**
   * Indicates if this Loadable is a failure or retrying.
   */
  readonly isFailure: boolean;

  /**
   * Indicates if this Loadable is empty or pending.
   */
  readonly isPending: boolean;

  /**
   * Indicates if this Loadable is the process of loading, which happens in one
   * of the following three states: reloading, retrying, and pending.
   */
  readonly isLoading: boolean;

  /**
   * Invokes one of the provided callbacks that corresponds this Loadable's
   * current state.
   * @param options An object of callbacks to be invoked according to the state.
   * @returns The return value of whichever callback was selected.
   */
  match<A, B, C>(options: Loadable.MatchOptions<T, A, B, C>): A | B | C;

  /**
   * Returns this Loadable's success value if it is a success or a reloading,
   * or the provided default value if it is not.
   * @param defaultValue A possibly lazy value to use in case of non-value
   * @returns This Loadable's value or the provided default value
   */
  successOr<U>(defaultValue: Lazy<U>): T | U;

  /**
   * Returns this Loadable's error value if it is a failure or a retrying, or
   * the provided default value if it is not.
   * @param defaultValue A possibly lazy value to use in case of non-error
   * @returns this Loadable's error or the provided default error
   */
  failureOr<U>(defaultValue: Lazy<U>): Error | U;
}

/**
 * This is a type-level check that will never execute at runtime. It ensures
 * that `ReadonlyLoadable` is always a strict subset of `Loadable` by asserting
 * that a `Loadable` is assignable to a `ReadonlyLoadable`.
 *
 * If the following block stops compiling, then there is likely something wrong
 * and incompatible with the definition of `ReadonlyLoadable`.
 */
// tslint:disable prefer-const variable-name no-var-keyword
if (false) {
  // @ts-ignore
  (() => {
    var __loadable: Loadable<void>;
    // @ts-ignore
    var __readonly: ReadonlyLoadable<void> = __loadable;
  })();
}
// tslint:enable
