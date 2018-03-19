import {Enum} from 'typescript-string-enums';

// tslint:disable-next-line:variable-name
export const State = Enum({
  /**
   * Denotes the absence of data and no requests in flight. This state
   * naturally occurs only once in the lifecycle of a Loadable.
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
 * Each of the six Loadable states is composed of two traits: availability and
 * flight. Availability refers to if there is no data, some data, or some
 * error. Flight, also known as "loading", refers to whether there is an
 * ongoing request.
 */
export type State = Enum<typeof State>;
