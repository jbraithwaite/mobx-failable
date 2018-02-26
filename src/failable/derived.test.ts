import {computed, useStrict, when} from 'mobx';

import {Failable} from '.';
import {Future, ReadonlyFuture} from '../future';
import {expose} from '../internal';
import {DerivedFailable} from './derived';

useStrict(true);

const State = Future.State;

const successValue = 3;
const failureValue = new Error('foobar');

type FailableFactory<T> = {[State in Future.State]: () => Failable<T>};

const make: FailableFactory<number> = {
  pending: () => new Failable<number>().pending(),
  success: () => new Failable<number>().success(successValue),
  failure: () => new Failable<number>().failure(failureValue),
};

function derive<T, To>(
  f: ReadonlyFuture<T>,
  options: Future.DeriveOptions<T, To>,
) {
  return expose(new DerivedFailable(f, options));
}

describe('DerivedFailable', () => {
  describe('given a success-only transform', () => {
    const options = {success: v => v.toString()};

    it('performs an initial transform', () => {
      const f = make.success();
      const d = derive(f, options);

      expect(d.data).toBe(successValue.toString());
      expect(d.state).toBe(State.success);
    });

    it('transforms a success', () => {
      const f = make.pending();
      const d = derive(f, options);

      f.success(successValue);
      expect(d.data).toBe(successValue.toString());
      expect(d.state).toBe(State.success);
    });

    it('passes through a failure', () => {
      const f = make.pending();
      const d = derive(f, options);

      f.failure(failureValue);
      expect(d.data).toBe(failureValue);
      expect(d.state).toBe(State.failure);
    });

    it('passes through a pending', () => {
      const f = make.pending();
      const d = derive(f, options);

      f.pending();
      expect(d.data).toBe(undefined);
      expect(d.state).toBe(State.pending);
    });

    it('can transform a success to a failure', () => {
      const f = make.success();
      const e = new Error();
      const d = derive(f, {
        success: () => {
          throw e;
        },
      });

      expect(d.data).toBe(e);
      expect(d.state).toBe(State.failure);
    });
  });

  describe('given a failure-only transform', () => {
    const options = {
      failure: (e: Error) => {
        throw new TypeError(e.message);
      },
    };

    it('performs an initial transform', () => {
      const f = make.failure();
      const d = derive(f, options);

      expect(d.data).toBeInstanceOf(TypeError);
      expect(d.data.message).toBe(failureValue.message);
      expect(d.state).toBe(State.failure);
    });

    it('passes through a success', () => {
      const f = make.pending();
      const d = derive(f, options);

      f.success(successValue);
      expect(d.data).toBe(successValue);
      expect(d.state).toBe(State.success);
    });

    it('transforms a failure', () => {
      const f = make.pending();
      const d = derive(f, options);

      f.failure(failureValue);
      expect(d.data).toBeInstanceOf(TypeError);
      expect(d.data.message).toBe(failureValue.message);
      expect(d.state).toBe(State.failure);
    });

    it('passes through a pending', () => {
      const f = make.pending();
      const d = derive(f, options);

      f.pending();
      expect(d.data).toBe(undefined);
      expect(d.state).toBe(State.pending);
    });

    it('can transform a failure to a success', () => {
      const f = make.failure();
      const d = derive(f, {
        failure: () => successValue,
      });

      expect(d.data).toBe(successValue);
      expect(d.state).toBe(State.success);
    });
  });

  describe('given a pending-only transform', () => {
    const pendingToSuccess = {
      pending: () => successValue,
    };
    const pendingToFailure = {
      pending: () => {
        throw failureValue;
      },
    };

    it('performs an initial transform', () => {
      const f = make.pending();
      const d = derive(f, pendingToFailure);

      expect(d.data).toBeInstanceOf(failureValue.constructor);
      expect(d.data.message).toBe(failureValue.message);
      expect(d.state).toBe(State.failure);
    });

    it('passes through a success', () => {
      const f = make.success();
      const d = derive(f, pendingToFailure);

      f.success(successValue);
      expect(d.data).toBe(successValue);
      expect(d.state).toBe(State.success);
    });

    it('passes through a failure', () => {
      const f = make.failure();
      const d = derive(f, pendingToSuccess);

      f.failure(failureValue);
      expect(d.data).toBeInstanceOf(failureValue.constructor);
      expect((d.data as Error).message).toBe(failureValue.message);
      expect(d.state).toBe(State.failure);
    });

    it('can transform a pending to a success', () => {
      const f = make.failure();
      const d = derive(f, pendingToSuccess);

      f.pending();
      expect(d.data).toBe(successValue);
      expect(d.state).toBe(State.success);
    });

    it('can transform a pending to a failure', () => {
      const f = make.success();
      const d = derive(f, pendingToFailure);

      f.pending();
      expect(d.data).toBeInstanceOf(failureValue.constructor);
      expect(d.data.message).toBe(failureValue.message);
      expect(d.state).toBe(State.failure);
    });
  });

  describe('given a success and failure transform', () => {
    const options = {
      success: v => v.toString(),
      failure: (e: Error) => {
        throw new TypeError(e.message);
      },
    };

    it('performs an initial transform of a failure', () => {
      const f = make.success();
      const d = derive(f, options);

      expect(d.data).toBe(successValue.toString());
      expect(d.state).toBe(State.success);
    });

    it('performs an initial transform of a failure', () => {
      const f = make.failure();
      const d = derive(f, options);

      expect(d.data).toBeInstanceOf(TypeError);
      expect(d.data.message).toBe(failureValue.message);
      expect(d.state).toBe(State.failure);
    });

    it('transforms a success', () => {
      const f = make.pending();
      const d = derive(f, options);

      f.success(successValue);
      expect(d.data).toBe(successValue.toString());
      expect(d.state).toBe(State.success);
    });

    it('transforms a failure', () => {
      const f = make.pending();
      const d = derive(f, options);

      f.failure(failureValue);
      expect(d.data).toBeInstanceOf(TypeError);
      expect(d.data.message).toBe(failureValue.message);
      expect(d.state).toBe(State.failure);
    });

    it('passes through a pending', () => {
      const f = make.pending();
      const d = derive(f, options);

      f.pending();
      expect(d.data).toBe(undefined);
      expect(d.state).toBe(State.pending);
    });

    it('can transform a failure to a success', () => {
      const f = make.failure();
      const d = derive(f, {
        success: v => v.toString(),
        failure: (e: Error) => successValue.toString(),
      });

      expect(d.data).toBe(successValue.toString());
      expect(d.state).toBe(State.success);
    });

    it('can transform a success to a failure', () => {
      const f = make.success();
      const d = derive(f, {
        success: v => {
          throw failureValue;
        },
        failure: (e: Error) => successValue.toString(),
      });

      expect(d.data).toBe(failureValue);
      expect(d.state).toBe(State.failure);
    });
  });
});
