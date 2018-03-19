import {State} from './state';

/**
 * Denotes if a state means there is no data, some data, or some error.
 */
export enum Availability {
  /**
   * Denotes when there is no data.
   */
  none = 0,

  /**
   * Denotes when there is some data.
   */
  value = 1,

  /**
   * Denotes when there is some error.
   */
  error = 2,
}

/**
 * Denotes if a state means there is an ongoing request. Sometimes known as
 * `loading`.
 */
export enum Flight {
  /**
   * Denotes when there is no ongoing request.
   */
  idle = 0,

  /**
   * Denotes when a request is in flight.
   */
  busy = 1,
}

export const fOffset = 0;
export const fMask = 0b0001;

export const aOffset = 1;
export const aMask = 0b0110;

/**
 * A `TraitSet` is a bitmap representation of a `State`. It can only be
 * constructed from a `State`. The bitmap structure makes it easier to shift
 * between different state traits.
 */
export type TraitSet = number & {
  __0__: Flight;
  __1__: Availability;
  __2__: Availability;
};

/**
 * Constructs a `TraitSet` from the given `state`.
 */
export function TraitSet(state: State): TraitSet {
  // tslint:disable:no-bitwise
  switch (state) {
    case State.empty:
      return ((Availability.none << aOffset) | Flight.idle) as TraitSet;
    case State.pending:
      return ((Availability.none << aOffset) | Flight.busy) as TraitSet;
    case State.success:
      return ((Availability.value << aOffset) | Flight.idle) as TraitSet;
    case State.reloading:
      return ((Availability.value << aOffset) | Flight.busy) as TraitSet;
    case State.failure:
      return ((Availability.error << aOffset) | Flight.idle) as TraitSet;
    case State.retrying:
      return ((Availability.error << aOffset) | Flight.busy) as TraitSet;
  }
  // tslint:enable
}

export function toState(traits: TraitSet): State {
  // tslint:disable:no-bitwise
  switch (traits) {
    case (Availability.none << aOffset) | Flight.idle:
      return State.empty;
    case (Availability.none << aOffset) | Flight.busy:
      return State.pending;
    case (Availability.value << aOffset) | Flight.idle:
      return State.success;
    case (Availability.value << aOffset) | Flight.busy:
      return State.reloading;
    case (Availability.error << aOffset) | Flight.idle:
      return State.failure;
    case (Availability.error << aOffset) | Flight.busy:
      return State.retrying;
  }
  // tslint:enable
  throw new TypeError(`Invalid traits bitset given: ${traits}`);
}

/**
 * Takes a state and a flight and returns the closest state with that
 * flight.
 * @param state The input state
 * @param flight The desired flight trait
 */
export function withFlight(state: State, flight: Flight): State {
  const availability = availabilityOf(state);
  // tslint:disable-next-line:no-bitwise
  const result = (availability << aOffset) | flight;
  return toState(result as TraitSet);
}

/**
 * Returns the flight of the given `state` or `traits`.
 */
export function flightOf(input: State | TraitSet): Flight {
  const traits = typeof input === 'string' ? TraitSet(input) : input;
  // tslint:disable-next-line:no-bitwise
  return ((traits & fMask) >> fOffset) as Flight;
}

/**
 * Takes a state and an availability and returns the closest state with that
 * availability.
 * @param state The input state
 * @param availability The desired availability trait
 */
export function withAvailability(
  state: State,
  availability: Availability,
): State {
  const flight = flightOf(state);
  // tslint:disable-next-line:no-bitwise
  const result = (availability << aOffset) | flight;
  return toState(result as TraitSet);
}

/**
 * Returns the availability of the given `state` or `traits`.
 */
export function availabilityOf(input: State | TraitSet): Availability {
  const traits = typeof input === 'string' ? TraitSet(input) : input;
  // tslint:disable:no-bitwise
  return ((traits & aMask) >> aOffset) as Availability;
}
