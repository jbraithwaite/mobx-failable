import {computed, useStrict, when} from 'mobx';

import {Failable as F} from '.';
import {Future} from '../future';
import {expose} from '../internal';

useStrict(true);

describe('Failable (mutable)', () => {
  class Failable<T> extends F<T> {
    calledSuccess = false;
    didBecomeSuccess(_: T) {
      this.calledSuccess = true;
    }

    calledFailure = false;
    didBecomeFailure(_: Error) {
      this.calledFailure = true;
    }

    calledPending = false;
    didBecomePending() {
      this.calledPending = true;
    }
  }

  const successValue = 3;
  const failureValue = new Error();

  type FailableFactory<T> = {[State in Future.State]: () => Failable<T>};

  const make: FailableFactory<number> = {
    pending: () => new Failable<number>().pending(),
    success: () => new Failable<number>().success(successValue),
    failure: () => new Failable<number>().failure(failureValue),
  };

  describe('constructor', () => {
    const f = expose<void, Failable<void>>(new Failable<void>());

    it('initializes the state as pending', () => {
      expect(f.state).toEqual(Future.State.pending);
    });
  });

  describe('success', () => {
    it('sets the internal state to success', () => {
      const f = expose(make.success());

      expect(f.state).toEqual(Future.State.success);
    });

    it('sets the internal data to the given value', () => {
      const f = expose(make.success());

      expect(f.data).toEqual(successValue);
    });

    it('invokes didBecomeSuccess', () => {
      const f = expose(make.success());

      expect(f.calledSuccess).toBe(true);
      expect(f.calledFailure).toBe(false);
      expect(f.calledPending).toBe(false);
    });
  });

  describe('failure', () => {
    it('sets the internal state to failure', () => {
      const f = expose(make.failure());

      expect(f.state).toEqual(Future.State.failure);
    });

    it('sets the internal data to the given value', () => {
      const f = expose(make.failure());

      expect(f.data).toEqual(failureValue);
    });

    it('invokes didBecomeFailure', () => {
      const f = expose(make.failure());

      expect(f.calledSuccess).toBe(false);
      expect(f.calledFailure).toBe(true);
      expect(f.calledPending).toBe(false);
    });
  });

  describe('pending', () => {
    it('sets the internal state to pending', () => {
      const f = expose(make.pending());

      expect(f.state).toEqual(Future.State.pending);
    });

    it('invokes didBecomePending', () => {
      const f = expose(make.pending());

      expect(f.calledSuccess).toBe(false);
      expect(f.calledFailure).toBe(false);
      expect(f.calledPending).toBe(true);
    });
  });

  describe('isSuccess', () => {
    it('is true when success', () => {
      expect(make.success().isSuccess).toBe(true);
    });

    it('is false when failure', () => {
      expect(make.failure().isSuccess).toBe(false);
    });

    it('is false when pending', () => {
      expect(make.pending().isSuccess).toBe(false);
    });
  });

  describe('isFailure', () => {
    it('is false when success', () => {
      expect(make.success().isFailure).toBe(false);
    });

    it('is true when failure', () => {
      expect(make.failure().isFailure).toBe(true);
    });

    it('is false when pending', () => {
      expect(make.pending().isFailure).toBe(false);
    });
  });

  describe('isPending', () => {
    it('is false when success', () => {
      expect(make.success().isPending).toBe(false);
    });

    it('is false when failure', () => {
      expect(make.failure().isPending).toBe(false);
    });

    it('is true when pending', () => {
      expect(make.pending().isPending).toBe(true);
    });
  });

  describe('match', () => {
    let success: jest.Mock<{}>;
    let failure: jest.Mock<{}>;
    let pending: jest.Mock<{}>;
    beforeEach(() => {
      [success, failure, pending] = [jest.fn(), jest.fn(), jest.fn()];
    });

    it('invokes the pending handler', () => {
      make.pending().match({success, failure, pending});

      expect(success).not.toBeCalled();
      expect(failure).not.toBeCalled();
      expect(pending).toBeCalled();
    });

    it('invokes the success handler with the correct value', () => {
      make.success().match({success, failure, pending});

      expect(success).toBeCalledWith(successValue);
      expect(failure).not.toBeCalled();
      expect(pending).not.toBeCalled();
    });

    it('invokes the failure handler with the correct error', () => {
      make.failure().match({success, failure, pending});

      expect(success).not.toBeCalled();
      expect(failure).toBeCalledWith(failureValue);
      expect(pending).not.toBeCalled();
    });
  });

  describe('accept', () => {
    const never = new Promise<never>((_resolve, _reject) => {
      /* */
    });
    const resolved = Promise.resolve(successValue);
    const rejected = Promise.reject(failureValue);
    // Suppress PromiseRejectionHandledWarning in node:
    rejected.catch(() => {
      /* */
    });

    it('first transitions to pending', () => {
      const f = expose(new Failable<number>());
      f.success(successValue);
      f.accept(never);

      expect(f.state).toEqual(Future.State.pending);
      expect(f.data).toBeUndefined();
    });

    it('transitions to success when the promise is fulfilled', done => {
      const f = expose(new Failable<number>());
      f.accept(resolved);

      when(
        () => !f.isPending,
        () => {
          expect(f.state).toEqual(Future.State.success);
          expect(f.data).toEqual(successValue);
          done();
        },
      );
    });

    it('transitions to failure when the promise is rejected', done => {
      const f = expose(new Failable<number>());
      f.accept(rejected);

      when(
        () => !f.isPending,
        () => {
          expect(f.state).toEqual(Future.State.failure);
          expect(f.data).toEqual(failureValue);
          done();
        },
      );
    });
  });

  describe('successOr', () => {
    const fallback = 'foo';

    it('returns the value when success', () => {
      const result = make.success().successOr(fallback);

      expect(result).toEqual(successValue);
      expect(result).not.toEqual(fallback);
    });

    it('returns the fallback when failure', () => {
      const result = make.failure().successOr(fallback);

      expect(result).not.toEqual(successValue);
      expect(result).toEqual(fallback);
    });

    it('returns the fallback when pending', () => {
      const result = make.pending().successOr(fallback);

      expect(result).not.toEqual(successValue);
      expect(result).toEqual(fallback);
    });
  });

  describe('failureOr', () => {
    const fallback = 'foo';

    it('returns the fallback when success', () => {
      const result = make.success().failureOr(fallback);

      expect(result).not.toEqual(failureValue);
      expect(result).toEqual(fallback);
    });

    it('returns the error when failure', () => {
      const result = make.failure().failureOr(fallback);

      expect(result).toEqual(failureValue);
      expect(result).not.toEqual(fallback);
    });

    it('returns the fallback when pending', () => {
      const result = make.pending().failureOr(fallback);

      expect(result).not.toEqual(failureValue);
      expect(result).toEqual(fallback);
    });
  });
});
