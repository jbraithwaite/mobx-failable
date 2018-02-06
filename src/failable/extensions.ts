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

export function rescue<T, To>(
  future: ReadonlyFuture<T>,
  f: (error: Error) => To,
): ReadonlyFuture<To> {
  return new DerivedFailable(future, {
    failure: f,
  });
}
