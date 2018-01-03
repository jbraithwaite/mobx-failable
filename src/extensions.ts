import {Future, ReadonlyFuture} from './future';
import {Lazy} from './lazy';

export function accept<T>(f: Future<T>, promise: PromiseLike<T>): Future<T> {
  f.pending();
  Promise.resolve(promise).then(f.success, f.failure);
  return f;
}

export function successOr<T, U>(
  f: ReadonlyFuture<T>,
  defaultValue: Lazy<U>,
): T | U {
  return f.match({
    success: v => v,
    failure: () => Lazy.force(defaultValue),
    pending: () => Lazy.force(defaultValue),
  });
}

export function failureOr<T, U>(
  f: ReadonlyFuture<T>,
  defaultValue: Lazy<U>,
): Error | U {
  return f.match({
    success: () => Lazy.force(defaultValue),
    failure: e => e,
    pending: () => Lazy.force(defaultValue),
  });
}
