import assert from 'power-assert';
import attrconv_ from '../index';
const attrconv = attrconv_.default; // HACK for default by TypeScript 1.5 Alpha

describe('main', () => {
  function parameterized(input, expected, pattern) {
    it(`${input} to be ${expected}`, (done) => {
      attrconv(input, pattern).then((actual) => {
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

  parameterized(
    `<p>漢字</p>`,
    `<p>漢字</p>`
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
    {'href': 'conv'}
  );

  parameterized(
    `<a href="./">漢字</a>`,
    `<a conv="./">漢字</a>`,
    {'href': 'conv'}
  );

  parameterized(
    `<div><img src="./foo.jpg"><img src="./bar.jpg"></div>`,
    `<div><img crs="./foo.png"><img crs="./bar.png"></div>`,
    {'src': ['crs', {'\\.jpg': '.png'}]}
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
    `<input (click)="action()">`,
    `<input ng-click="action()">`,
    {'^\\(([a-zA-Z_][a-zA-Z0-9_]*)\\)$': 'ng-$1'}
  );

  parameterized(
    `<input #name>`,
    `<input ng-model="name">`,
    {'^#(.*)$': ['ng-model', {'.*': '%1'}]}
  );

  parameterized(
    `<input #aaa #bbb>`,
    `<input ng-model="aaa" ng-model="bbb">`,
    {'^#(.*)$': ['ng-model', {'.*': '%1'}]}
  );

  parameterized(
    `<input #abcde>`,
    `<input ng-model="c">`,
    {'^#.(.)(.)(.).*$': ['ng-model', {'.*': '%2'}]}
  );

  parameterized(
    `<input #abcde>`,
    `<input ng-model="d">`,
    {'^#.(.)(.)(.).*$': ['ng-model', {'.*': '%3'}]}
  );

  parameterized(
    `<div [innertext]="textbox.value"></div>`,
    `<div innertext="{{textbox.value}}"></div>`,
    {'^\\[([a-zA-Z_][a-zA-Z0-9_]*)\\]$': ['$1', {'^(.*)$': '{{$1}}'}]}
  );

  parameterized(
    `<li *foreach="#todo of todos"></li>`,
    `<li ng-repeat="todo in todos"></li>`,
    {'^\\*foreach$': ['ng-repeat', {'^#(.*)(\\s+)of(\\s+)(.*)$': '$1$2in$3$4'}]}
  );

  parameterized(
    `<div class="view" [class.hidden]="todoEdit == todo"></div>`,
    `<div class="view" ng-class="{hidden: todoEdit == todo}"></div>`,
    {'^\\[class\\.(.*)\\]$': ['ng-class', {'^(.*)$': '{%1: $1}'}]}
  );

  parameterized(
    `<div class="view" [class.aaa]="true" [class.bbb]="false"></div>`,
    `<div class="view" ng-class="{aaa: true, bbb: false}"></div>`,
    {
      '^\\[class\\.(.+)\\]$': {
        method: 'merge',
        newAttribute: 'ng-class',
        open: '{',
        close: '}',
        separator: ', ',
        valuePattern: '^(.*)$',
        newValue: '%1: $1'
      }
    }
  );

  parameterized(
    `<div foo.a="12345" foo.b="67890"></div><div foo.a="qwert" foo.b="yuiop" bar.a="asdfg" bar.b="hjkl;"></div>`,
    `<div foo-foo="{{a1:234:, b6:789:}}"></div><div foo-foo="{{aq:wer:, by:uio:}}" bar="(a| dfas; b| klhj)"></div>`,
    {
      '^(foo)\\.(.+)$': {
        method: 'merge',
        newAttribute: '$1-$1',
        open: '{{',
        close: '}}',
        separator: ', ',
        valuePattern: '^(.)(.{3}).*$',
        newValue: '%2$1:$2:'
      },
      '^(bar)\\.(.+)$': {
        method: 'merge',
        newAttribute: '$1',
        open: '(',
        close: ')',
        separator: '; ',
        valuePattern: '^(..)(..).*$',
        newValue: '%2| $2$1'
      }
    }
  );

  it(`Long HTML test`, (done) => {
    const input    = `<div [innertext]="textbox.value" (click)="action()" #name [class.aaa]="true" [class.bbb]="false"><!-- comment --></div>`;
    const expected = `<div innertext="{{textbox.value}}" ng-click="action()" ng-model="name" ng-class="{aaa: true, bbb: false}"><!-- comment --></div>`;
    const pattern = {
      '^\\[([a-zA-Z_][a-zA-Z0-9_]*)\\]$': ['$1', {'^(.*)$': '{{$1}}'}],
      '^#(.*)$': ['ng-model', {'.*': '%1'}],
      '^\\(([a-zA-Z_][a-zA-Z0-9_]*)\\)$': 'ng-$1',
      '^\\[class\\.(.+)\\]$': {
        method: 'merge',
        newAttribute: 'ng-class',
        open: '{',
        close: '}',
        separator: ', ',
        valuePattern: '^(.*)$',
        newValue: '%1: $1'
      }
    };
    attrconv(input, pattern).then((actual) => {
      assert(actual === expected);
      done();
    });
  });
});