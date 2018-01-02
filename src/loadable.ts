import {action, computed, observable} from 'mobx';
import {Enum} from 'typescript-string-enums';

import {Future} from './future';
import {Lazy} from './lazy';

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
  @observable protected state: Loadable.State = State.empty;

  toString(): string {
    return `Loadable { state=${this.state}, data=${this.data} }`;
  }

  /**
   * Indicates if this Loadable is a success or reloading.
   */
  @computed
  get isSuccess(): boolean {
    return this.state === State.success || this.state === State.reloading;
  }

  /**
   * Indicates if this Loadable is a failure or retrying.
   */
  @computed
  get isFailure(): boolean {
    return this.state === State.failure || this.state === State.retrying;
  }

  /**
   * Indicates if this Loadable is empty or pending.
   */
  @computed
  get isPending(): boolean {
    return this.state === State.empty || this.state === State.pending;
  }

  /**
   * Indicates if this Loadable is the process of loading, which happens in one
   * of the following three states: reloading, retrying, and pending.
   */
  @computed
  get isLoading(): boolean {
    return (
      this.state === State.reloading ||
      this.state === State.retrying ||
      this.state === State.pending
    );
  }

  /**
   * Sets this Loadable to a success.
   * @param data The value associated with the success.
   * @returns This, enabling chaining.
   */
  @action.bound
  success(data: T): this {
    this.state = State.success;
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
    this.state = State.failure;
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
    switch (this.state) {
      case State.empty:
        this.state = State.pending;
        break;
      case State.success:
        this.state = State.reloading;
        break;
      case State.failure:
        this.state = State.retrying;
        break;
      default:
        return this;
    }

    this.didBecomeLoading();
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
    const {data, state} = this;
    const {success, failure, pending} = options;

    switch (state) {
      case State.success:
      case State.reloading:
        return success(data as T, this.isLoading);
      case State.failure:
      case State.retrying:
        return failure(data as Error, this.isLoading);
      case State.empty:
      case State.pending:
        return pending(this.isLoading);
    }
  }

  /**
   * Accepts a promise by immediately setting this Loadable to loading, and
   * then either setting this Loadable to a success if the promise was
   * fulfilled, or setting this Loadable to a failure if the promise was
   * rejected.
   * @param promise A promise to be accepted
   * @returns This, enabling chaining.
   */
  accept(promise: PromiseLike<T>): this {
    this.loading();
    Promise.resolve(promise).then(this.success, this.failure);
    return this;
  }

  /**
   * Returns this Loadable's success value if it is a success, or the provided
   * default value if it is not.
   * @param defaultValue A possibly lazy value to use in case of non-success
   * @returns This Future's success value or the provided default value
   */
  successOr<U>(defaultValue: Lazy<U>): T | U {
    return this.match({
      success: v => v,
      failure: () => Lazy.force(defaultValue),
      pending: () => Lazy.force(defaultValue),
    });
  }

  /**
   * Returns this Loadable's error value if it is a failure, or the provided
   * default value if it is not.
   * @param defaultValue A possibly lazy value to use in case of non-failure
   * @returns this Loadable's failure error or the provided default value
   */
  failureOr<U>(defaultValue: Lazy<U>): Error | U {
    return this.match({
      success: () => Lazy.force(defaultValue),
      failure: e => e,
      pending: () => Lazy.force(defaultValue),
    });
  }
}

export namespace Loadable {
  // tslint:disable-next-line:variable-name
  export const State = Enum({
    /**
     * Denotes the absence of data and no requests in flight. This state occurs
     * only once in the lifecycle of a Loadable.
     */
    empty: 'empty',

    /**
     * Denotes the absence of data and a request in flight.
     */
    pending: 'pending',

    /**
     * Denotes the presence of a value and no requests in flight.
     */
    success: 'success',

    /**
     * Denotes the presence of a value and a request in flight.
     */
    reloading: 'reloading',

    /**
     * Denotes the presence of an error and no requests in flight.
     */
    failure: 'failure',

    /**
     * Denotes the presence of an error and a request in flight.
     */
    retrying: 'retrying',
  });

  /**
   * All six Loadable states can be sorted by availability (none, value, error)
   * and by flight (idle, busy). Availability refers to if there is no data,
   * some data, or some error. Flight, also known as "loading", refers to
   * whether there is an ongoing request.
   */
  export type State = Enum<typeof State>;

  /**
   * MatchOptions is an object filled with callbacks. Each callback corresponds
   * to a possible availability. The `success` callback receives whatever
   * success value was just set. The `failure` callback receives whatever error
   * was just set. The `pending` callback does not receive any values.
   *
   * All three callbacks take an optional `loading` boolean, which reflects
   * the flight of the state. It is true when busy, or false when idle.
   */
  export interface MatchOptions<T, A, B, C> {
    success: (data: T, loading?: boolean) => A;
    failure: (error: Error, loading?: boolean) => B;
    pending: (loading?: boolean) => C;
  }
}

const State = Loadable.State;
