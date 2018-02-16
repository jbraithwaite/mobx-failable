import {computed, useStrict, when} from 'mobx';

import {Loadable, ReadonlyLoadable} from '.';
import {expose} from '../internal';
import {DerivedLoadable} from './derived';
import {State} from './state';

useStrict(true);

const successValue = 3;
const failureValue = new Error('foobar');

type LoadableFactory<T> = {[_ in State]: () => Loadable<T>};

const make: LoadableFactory<number> = {
  empty: () => new Loadable<number>(),
  pending: () => new Loadable<number>().pending(),
  success: () => new Loadable<number>().success(successValue),
  reloading: () => new Loadable<number>().success(successValue).pending(),
  failure: () => new Loadable<number>().failure(failureValue),
  retrying: () => new Loadable<number>().failure(failureValue).pending(),
};

function derive<T, To>(
  f: ReadonlyLoadable<T>,
  options: Loadable.DeriveOptions<T, To>,
) {
  return expose(new DerivedLoadable(f, options));
}

describe('DerivedLoadable', () => {
  describe('given a success-only transform', () => {
    const options = {success: v => v.toString()};

    describe('receives a loading argument', () => {
      it('when flight is idle', () => {
        const o = {success: jest.fn(options.success)};
        const f = make.success();
        const d = derive(f, o);

        expect(o.success).toBeCalledWith(successValue, false);
      });

      it('when flight is busy', () => {
        const o = {success: jest.fn(options.success)};
        const f = make.reloading();
        const d = derive(f, o);

        expect(o.success).toBeCalledWith(successValue, true);
      });
    });

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

    describe('receives a loading argument', () => {
      it('when flight is idle', () => {
        const o = {failure: jest.fn(options.failure)};
        const f = make.failure();
        const d = derive(f, o);

        expect(o.failure).toBeCalledWith(failureValue, false);
      });

      it('when flight is busy', () => {
        const o = {failure: jest.fn(options.failure)};
        const f = make.retrying();
        const d = derive(f, o);

        expect(o.failure).toBeCalledWith(failureValue, true);
      });
    });

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

    describe('receives a loading argument', () => {
      it('when flight is idle', () => {
        const o = {pending: jest.fn(pendingToSuccess.pending)};
        const f = make.empty();
        const d = derive(f, o);

        expect(o.pending).toBeCalledWith(false);
      });

      it('when flight is busy', () => {
        const o = {pending: jest.fn(pendingToSuccess.pending)};
        const f = make.pending();
        const d = derive(f, o);

        expect(o.pending).toBeCalledWith(true);
      });
    });

    it('performs an initial transform', () => {
      const f = make.pending();
      const d = derive(f, pendingToFailure);

      expect(d.data).toBeInstanceOf(failureValue.constructor);
      expect(d.data.message).toBe(failureValue.message);
      expect(d.state).toBe(State.retrying);
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

    it('can transform an empty to a success', () => {
      const f = make.empty();
      const d = derive(f, pendingToSuccess);

      expect(d.data).toBe(successValue);
      expect(d.state).toBe(State.success);
    });

    it('can transform an empty to a failure', () => {
      const f = make.empty();
      const d = derive(f, pendingToFailure);

      expect(d.data).toBeInstanceOf(failureValue.constructor);
      expect(d.data.message).toBe(failureValue.message);
      expect(d.state).toBe(State.failure);
    });

    it('can transform a pending to a reloading', () => {
      const f = make.pending();
      const d = derive(f, pendingToSuccess);

      expect(d.data).toBe(successValue);
      expect(d.state).toBe(State.reloading);
    });

    it('can transform a pending to a retrying', () => {
      const f = make.pending();
      const d = derive(f, pendingToFailure);

      expect(d.data).toBeInstanceOf(failureValue.constructor);
      expect(d.data.message).toBe(failureValue.message);
      expect(d.state).toBe(State.retrying);
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
