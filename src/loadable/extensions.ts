import {Loadable, ReadonlyLoadable} from '.';
import {DerivedLoadable} from './derived';

export function derive<T, To>(
  future: ReadonlyLoadable<T>,
  options: Loadable.DeriveOptions<T, To>,
): ReadonlyLoadable<To> {
  return new DerivedLoadable(future, options);
}

export function map<T, To>(
  future: ReadonlyLoadable<T>,
  f: (value: T) => To,
): ReadonlyLoadable<To> {
  return new DerivedLoadable(future, {
    success: f,
  });
}

export function rescue<T, To>(
  future: ReadonlyLoadable<T>,
  f: (error: Error) => To,
): ReadonlyLoadable<To> {
  return new DerivedLoadable(future, {
    failure: f,
  });
}
