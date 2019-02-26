export function expectError<E extends Error>(error: unknown, ctor: new () => E, ifTrue: (e: E) => any): void {
  expect(error).toBeInstanceOf(ctor);
  ifTrue(error as E);
}
