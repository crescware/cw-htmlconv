import assert from 'power-assert';
import htmlconv_ from '../index';
const htmlconv = htmlconv_.default; // HACK for default by TypeScript 1.5 Alpha

describe('main', () => {
  function parameterized(input, expected, pattern) {
    it(`${input} to be ${expected}`, () => {
      const actual = htmlconv(input, pattern);
      assert(actual === expected);
    });
  }

  parameterized(
    `<p>Text</p>`,
    `<p>Text</p>`
  );

  parameterized(
    `<p>漢字</p>`,
    `<p>漢字</p>`
  );

  parameterized(
    `<p>A&B</p>`,
    `<p>A&B</p>`
  );

  parameterized(
    `<p>A&amp;B</p>`,
    `<p>A&amp;B</p>`
  );

  parameterized(
    `<p>Text<br>Text</p>`,
    `<p>Text<br>Text</p>`
  );

  parameterized(
    `<p><span>Text</span></p>`,
    `<p><span>Text</span></p>`
  );

  parameterized(
    `<!DOCTYPE html><html></html>`,
    `<!DOCTYPE html><html></html>`
  );

  parameterized(
    `<!DOCTYPE html>\n<html>\n</html>`,
    `<!DOCTYPE html>\n<html>\n</html>`
  );

  parameterized(
    `<a href="./">Text</a>`,
    `<a href="./">Text</a>`
  );

  parameterized(
    `<body><h1><img src="image.png" alt="Alternative" width="90" height="53"></h1></body>`,
    `<body><h1><img src="image.png" alt="Alternative" width="90" height="53"></h1></body>`
  );

  parameterized(
    `<p><span><!-- comment --></span></p>`,
    `<p><span><!-- comment --></span></p>`
  );

  parameterized(
    `<a href="./">Text</a>`,
    `<a conv="./">Text</a>`,
    {
      '*': {
        attr: {'href': 'conv'}
      }
    }
  );

  parameterized(
    `<a href="./">漢字</a>`,
    `<a conv="./">&#x6F22;&#x5B57;</a>`,
    {
      '*': {
        attr: {'href': 'conv'}
      }
    }
  );

  parameterized(
    `<a href="./">Text</a>`,
    `<a refref="./">Text</a>`,
    {
      '*': {
        attr: {'/h(.*)/': '$1$1'}
      }
    }
  );
});