import * as assert_ from 'power-assert';
const assert = assert_.default;
import attrconv_ from '../index';
const attrconv = attrconv_.default; // HACK for default by TypeScript 1.5 Alpha

describe('main', () => {
  function parameterized(input, expected, pattern) {
    it(`${input} to be ${expected}`, (done) => {
      attrconv(input, pattern).then((actual) => {
        assert(actual === expected);
        done();
      });
    });
  }

  parameterized(
    `<p>Text</p>`,
    `<p>Text</p>`
  );

  parameterized(
    `<p><span>Text</span></p>`,
    `<p><span>Text</span></p>`
  );

  parameterized(
    `<a href="./">Text</a>`,
    `<a href="./">Text</a>`
  );

  parameterized(
    `<a href="./">Text</a>`,
    `<a conv="./">Text</a>`,
    {'href': 'conv'}
  );

  parameterized(
    `<a href="foo">Text</a>`,
    `<a conv="bar">Text</a>`,
    {href: ['conv', {foo: 'bar'}]}
  );

  parameterized(
    `<a href="foo">Text</a><a href="baz">Text</a>`,
    `<a conv="bar">Text</a><a conv="qux">Text</a>`,
    {href: ['conv', {foo: 'bar', baz: 'qux'}]}
  );

  parameterized(
    `<input (click)="action()"></input>`,
    `<input ng-click="action()"></input>`,
    {'^\\(([a-zA-Z_][a-zA-Z0-9_]*)\\)$': 'ng-$1'}
  );

  parameterized(
    `<input #name></input>`,
    `<input ng-model="name"></input>`,
    {'^#(.*)$': ['ng-model', {'.*': '$1'}]}
  );
});