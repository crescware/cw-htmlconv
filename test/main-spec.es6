import assert from 'power-assert';
import htmlconv_ from '../index';
const htmlconv = htmlconv_.default; // HACK for default by TypeScript 1.5 Alpha

describe('main', () => {
  function parameterized(input, expected, pattern) {
    it(`${input} to be ${expected}`, (done) => {
      htmlconv(input, pattern).then((actual) => {
        //console.log(actual);
        assert(actual === expected);
        done();
      });
    });
  }

  parameterized(
    `<p>Text</p>`,
    `<p>Text</p>`
  );
});