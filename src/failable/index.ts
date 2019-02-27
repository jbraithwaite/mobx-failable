import {action, autorun, computed, observable} from 'mobx';

import {accept, failureOr, successOr} from '../extensions';
import {Future, ReadonlyFuture} from '../future';
import {Lazy} from '../lazy';
import {derive, map, rescue} from './extensions';
import {match} from './match';

const State = Future.State;

/**
 * Failable is a reactive MobX counterpart to a Promise. It has three states:
 * pending, success, and failure. When constructed, it starts out in the pending
 * state.
 *
 * The action methods `success`, `failure`, and `pending` are used to change
 * between these states. The computed properties indicate the current state,
 * but for day-to-day usage, prefer the `match` method.
 */
export class Failable<T> implements Future<T> {
  @observable protected data: T | Error | undefined = undefined;
  @observable protected state: Future.State = State.pending;

  toString(): string {
    return `Failable { state=${this.state}, data=${this.data} }`;
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
   * Sets this Failable to a success.
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
   * A lifecycle method that is invoked after this Failable becomes a success.
   * This can be overridden in a subclass.
   */
  protected didBecomeSuccess(_data: T): void {
    /* */
  }

  /**
   * Sets this Failable to a failure.
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
   * A lifecycle method that is invoked after this Failable becomes a success.
   * This can be overridden in a subclass.
   */
  protected didBecomeFailure(_error: Error): void {
    /* */
  }

  /**
   * Sets this Failable to pending.
   * @returns This, enabling chaining.
   */
  @action.bound
  pending(): this {
    this.state = State.pending;
    this.data = undefined;
    this.didBecomePending();
    return this;
  }

  /**
   * A lifecycle method that is invoked after this Failable becomes pending.
   * This can be overridden in a subclass.
   */
  protected didBecomePending(): void {
    /* */
  }

  /**
   * Invokes one of the provided callbacks that corresponds this Failable's
   * current state.
   * @param options An object of callbacks to be invoked according to the state.
   * @returns The return value of whichever callback was selected.
   */
  match<A, B, C>(options: Future.MatchOptions<T, A, B, C>): A | B | C {
    return match(this.state, this.data, options);
  }

  /**
   * Accepts a promise by immediately setting this Failable to pending, and
   * then either setting this Failable to a success if the promise was
   * fulfilled, or setting this Failable to a failure if the promise was
   * rejected.
   * @param promise A promise to be accepted
   * @returns This, enabling chaining.
   */
  accept(promise: PromiseLike<T>): this {
    accept(this, promise);
    return this;
  }

  /**
   * Returns this Failable's success value if it is a success, or the provided
   * default value if it is not.
   * @param defaultValue A possibly lazy value to use in case of non-success
   * @returns This Future's success value or the provided default value
   */
  successOr<U>(defaultValue: Lazy<U>): T | U {
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

  /**
   * Derives a ReadonlyFuture that syncs with this Failable using the given
   * options. For each transform function in the options, returning a value will
   * turn the derivation into a success with that value, whereas throwing an
   * error will turn it into a failure with that error value.
   *
   * The resulting derivation updates as the Failable it is derived from
   * updates and changes state.
   * @param options An object of transform functions to be invoked according
   * to the state
   * @returns A derived ReadonlyFuture
   */
  derive<U>(options: Future.DeriveOptions<T, U>): ReadonlyFuture<U> {
    return derive(this, options);
  }

  /**
   * Creates a derived ReadonlyFuture that syncs with this Failable, except
   * success values are first transformed using the provided function `f`. When
   * the provided function throws, the derived ReadonlyFuture becomes a failure.
   *
   * This is a shorthand of calling `derive` with only a `success` function.
   * @param f The success transformation function
   * @returns A derived ReadonlyFuture
   */
  map<U>(f: (value: T) => U): ReadonlyFuture<U> {
    return map(this, f);
  }

  /**
   * Creates a derived ReadonlyFuture that syncs with this Failable, except
   * error values are first transformed using the provided function `f`. When
   * the provided function returns, the derived ReadonlyFuture becomes a
   * success. When it throws, the derivation becomes a failure.
   *
   * This is a shorthand of calling `derive` with only a `failure` function.
   * @param f The failure transformation function
   * @returns A derived ReadonlyFuture
   */
  rescue<U = T>(f: (error: Error) => U): ReadonlyFuture<U> {
    return rescue(this, f);
  }
}

interface Never {
  __never: 'never';
}
const never: Never = new Object() as any;

export namespace Failable {
  export function all<T>(
    values: {[Key in keyof T]: ReadonlyFuture<T[Key]>},
  ): ReadonlyFuture<T> {
    const result = new Failable<T>();
    const isArray = Array.isArray(values);
    const entries: Array<
      [keyof T, ReadonlyFuture<T[keyof T]>]
    > = Object.entries(values) as any;

    if (entries.length === 0) {
      return result.success((isArray ? [] : {}) as T);
    }

    autorun(() => {
      const failureEntry = entries.find(([_, value]) => value.isFailure);
      if (failureEntry !== undefined) {
        const [, failure] = failureEntry;
        const error = failure.failureOr(never);

        if (error === never) {
          throw new Error('Future should have been a failure');
        }

        result.failure(error as Error);
      } else if (entries.some(([_, value]) => value.isPending)) {
        result.pending();
      } else {
        const vals: Partial<{[Key in keyof T]: T[Key] | Never}> = {};
        entries
          .map(
            ([key, value]): [keyof T, T[keyof T] | Never] => [
              key,
              value.successOr(never),
            ],
          )
          .forEach(([key, value]) => {
            vals[key] = value;
          });

        if (Object.values(vals).some(val => val === never)) {
          throw new Error('Futures should all be successfull');
        }

        if (isArray) {
          result.success(Array.from({...vals, length: entries.length}) as any);
        } else {
          result.success(vals as T);
        }
      }
    });

    return result;
  }
}
