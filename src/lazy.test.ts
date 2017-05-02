import {Lazy} from './lazy';

describe('Lazy', () => {
  describe('force', () => {
    it('returns the value as-is when given a non-function', () => {
      const v = 3;
      const l: Lazy<number> = v;

      expect(Lazy.force(l)).toEqual(v);
    });

    it('invokes the function and returns its result when given one', () => {
      const v = 3;
      const l = () => v;

      expect(Lazy.force(l)).toEqual(v);
    });
  });
});
