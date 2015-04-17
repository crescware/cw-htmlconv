import * as assert_ from 'power-assert';
const assert = assert_.default;
import main_ from '../src/main'
const main = main_.default; // HACK for default by TypeScript 1.5 Alpha

describe('main', () => {
  it('test', () => {
    const a = 1;
    const b = 2;
    assert(a === b);
  });
});