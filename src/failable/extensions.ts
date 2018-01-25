import {Future, ReadonlyFuture} from '../future';
import {DerivedFailable} from './derived';

export function derive<T, To>(
  future: ReadonlyFuture<T>,
  options: Future.DeriveOptions<T, To>,
): ReadonlyFuture<To> {
  return new DerivedFailable(future, options);
}

export function map<T, To>(
  future: ReadonlyFuture<T>,
  f: (value: T) => To,
): ReadonlyFuture<To> {
  return new DerivedFailable(future, {
    success: f,
  });
}

export function rescue<T>(
  future: ReadonlyFuture<T>,
  f: (error: Error) => T,
): ReadonlyFuture<T> {
  return new DerivedFailable(future, {
    failure: f,
  });
}
