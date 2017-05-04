# mobx-failable

A reactive MobX counterpart to a promise, similar to [the `fromPromise`
function from `mobx-utils`](https://github.com/mobxjs/mobx-utils) or
[`failable`](https://www.npmjs.com/package/failable), with various built-in
MobX computed properties and actions. The basic class `Failable` models the
three promise states: pending, success, and failure.

## Installation

This package is [on npm](https://www.npmjs.com/package/mobx-failable): just
run `npm install --save mobx-failable`. TypeScript support works out of the
box.

## API

The API surface is still in flux, but `Failable` is the baseline class to use,
whereas `Loadable` extends the basic semantics of `Failable`. Both of these
classes implement the interface `Future`, which allows you to treat `Failable`
and `Loadable` similarly, barring the small semantic differences.

### `Failable<T>`

The baseline `Failable` consists of three states: pending, success, and
failure. When initialized, it starts out in the pending state:

```ts
const f = new Failable<number>();
f.isPending; // == true
```

Each of the states correspond to a phase in a promise's lifecycle: pending is
analogous to when a promise is just created, success correponds to when a
promise resolves, and failure is akin to when a promise is rejected.

The following computed properties reflect which state the `Failable` is in:

- `isSuccess: boolean`
- `isFailure: boolean`
- `isPending: boolean`

By themselves these properties are not very useful. To retrieve or set the
relevant data, consult these methods:

- `success(value: T): this`, a MobX action that, given the provided value,
  switches the state to success.
- `failure(error: Error): this`, a MobX action that, given the provided error,
  switches the state to failure.
- `pending(): this`, a MobX action that switches the state to pending.
- `accept(p: Promise<T>): this`, a method that "accepts" a promise. First, it
  immediately switches the state to pending. Then, if the promise resolves, it
  switches the state to success. Otherwise, if the promise is rejected, it
  switches the state to failure.
- `match(options): A | B | C`, a method that takes a bag of callback options
  and invokes one of them, depending on the state. The return value of the
  invoked callback is then passed through. The `success` callback takes a
  value, the `failure` callback takes an error, and the `pending` callback
  takes nothing.
- `successOr<U>(defaultValue: Lazy<U>): T | U`, a method that is a shorthand
  for a call to `match` where the success case merely passes through the value
  and the remaining cases fall back to the provided default value. See
  `Lazy<T>` for how the default value is evaluated.
- `failureOr<U>(defaultValue: Lazy<U>): T | U`, a method that is like
  `successOr`, except it is biased towards the failure state.

A typical usage of `Failable` looks like:

```ts
import {Failable} from 'mobx-failable';

function getUser(id: string): Promise<User> {
  return fetch(`/user/${id}`).then(parseUser, parseError);
}

class State {
  userId: string;

  @observable user = new Failable<User>();

  constructor(id: string) {
    this.userId = id;
  }

  fetch(): void {
    this.user.accept(getUser(this.userId));
  }

  @computed get userName(): string {
    return this.user.successOr('Unknown');
  }
}

// Use State class in a React component, for example
```

## `Lazy<T>`

A lazy value is either a function, which should take no arguments and return a
value, or it is a plain value. Note that a function that takes one or more
arguments is not a valid lazy value, but there are no runtime or type system
checks to enforce this. The type definition is `T | (() => T)`.

- `Lazy.force(l: Lazy<T>): T` evaluates the given lazy value. If the given
  value is not a function, it is returned as-is. If it is a function, then it
  is invoked, and its return value is passed through.

## `Loadable<T>`

A `Loadable` recategorizes and extends the three states of `Failable` into six
states. There are now two dimensions: _availability_ (none, value, error) and
_flight_ (busy, idle).

Availability / Flight | Idle | Busy
-- | -- | --
None | Empty | Pending
Value | Success | Reloading
Error | Failure | Retrying

- _Flight_ refers to whether or not a request is in flight. _Busy_ means such a
  request is in progress, whereas _idle_ means nothing is in progress.
- _Availability_ refers to the sort of data possessed. _None_ means there is no
  data, _value_ means the intended data succeeded in loading, and _error_ means
  the intended data failed to load. This is similar in shape to (but not same
  as) the original three states.

### Rationale

The biggest flaw of `Failable` is that it models a single request cycle. By
definition, if it is pending, it cannot have data. This contradicts most user
interfaces, which are driven by multiple request cycles. For example, when
viewing an inbox, initiating a refresh will show an activity indicator, but
existing data does not disappear.

### Accept-oriented workflow

The intended usage for `Loadable` is centered around using `accept`. In fact,
the most material differences between `Loadable` and `Failable` are:

- `match(options): A | B | C`, a method that takes a bag of callback options
  and invokes one of them, depending on the _availability_. The return value of
  the invoked callback is then passed through. The `success` callback, called
  when the availability is _value_, takes `(value, loading?)`. The `failure`
  callback, called when the availability is _error_, takes `(error, loading?)`.
  The `pending` callback, called when the availability is _none_, takes
  `(loading?)`.
- `accept(p: Promise<T>): this`, a method that "accepts" a promise. First, it
  immediately switches the _flight_ to _busy_. Then, if the promise resolves,
  it switches the state to _success_. Otherwise, if the promise is rejected, it
  switches the state to _failure_.

### Sequence

Of the three availabilities, the _none_ availability only occurs once per the
lifetime of a loadable. The sequence of events is as follows:

- The loadable is initialized. It begins in the _empty_ state.
- An operation begins, yielding a promise. This promise is then accepted into
  the loadable, so it enters the _pending_ state.
  - The promise fulfills, so the loadable enters the _success_ state.
  - The promise rejects, so the loadable enters the _failure_ state.
- Another operation begins, yielding a promise of the same type. This promise
  is once again accepted into the loadable.
  - If the loadable was in the _success_ state, it now enters the _reloading_ state.
  - If the loadable was in the _failure_ state, it now enters the _retrying_ state.
  - Once the promise fulfills or rejects, the loadable again enters either the
  _success_ state or _failure_ state.