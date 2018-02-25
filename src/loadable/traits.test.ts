import {Enum} from 'typescript-string-enums';

import {State} from './state';

import {
  Availability,
  availabilityOf,
  Flight,
  flightOf,
  toState,
  TraitSet,
  withAvailability,
  withFlight,
} from './traits';

describe('TraitSet', () => {
  const states = Enum.values(State);
  const traitSets: TraitSet[] = states.map(TraitSet);

  const flights = Enum.values(Flight);
  const availabilities = Enum.values(Availability);

  describe('constructor', () => {
    for (const state of states) {
      it(`returns correctly for state ${state}`, () => {
        const result = TraitSet(state);
        expect(result).toMatchSnapshot();
      });
    }
  });

  describe('toState', () => {
    for (const traits of traitSets) {
      it(`returns correctly for TraitSet ${traits}`, () => {
        const result = toState(traits);
        expect(result).toMatchSnapshot();
      });
    }
  });

  describe('withFlight', () => {
    for (const state of states) {
      for (const flight of flights) {
        it(`changes state ${state} to flight ${flight}`, () => {
          const result = withFlight(state, flight);
          expect(result).toMatchSnapshot();
        });
      }
    }
  });

  describe('flightOf', () => {
    describe('given states', () => {
      for (const state of states) {
        it(`returns the correct flight for state ${state}`, () => {
          const result = flightOf(state);
          expect(result).toMatchSnapshot();
        });
      }
    });

    describe('given trait sets', () => {
      for (const traits of traitSets) {
        it(`returns the correct flight for trait set ${traits}`, () => {
          const result = flightOf(traits);
          expect(result).toMatchSnapshot();
        });
      }
    });
  });

  describe('withAvailability', () => {
    for (const state of states) {
      for (const availability of availabilities) {
        it(`changes state ${state} to availability ${availability}`, () => {
          const result = withAvailability(state, availability);
          expect(result).toMatchSnapshot();
        });
      }
    }
  });

  describe('availabilityOf', () => {
    describe('given states', () => {
      for (const state of states) {
        it(`returns the correct flight for state ${state}`, () => {
          const result = availabilityOf(state);
          expect(result).toMatchSnapshot();
        });
      }
    });

    describe('given trait sets', () => {
      for (const traits of traitSets) {
        it(`returns the correct flight for trait set ${traits}`, () => {
          const result = availabilityOf(traits);
          expect(result).toMatchSnapshot();
        });
      }
    });
  });
});
