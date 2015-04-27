/// <reference path="../typings/es6-promise/es6-promise.d.ts" />
/// <reference path="../typings/cheerio/cheerio.d.ts" />
/// <reference path="../typings/htmlparser2/htmlparser2.d.ts" />
/// <reference path="../typings/lodash/lodash.d.ts" />
'use strict';
import {Promise} from 'es6-promise';
import * as htmlparser from 'htmlparser2';
import * as cheerio from 'cheerio';
import * as lodash from 'lodash';

/**
 * @param {string} pattern
 * @returns {{re: RegExp, substr: string}}
 */
function regExpOrSubstr(pattern: string): {re?: RegExp; substr?: string} {
  var re: RegExp;
  var substr = '';
  if (pattern[0] === '/' && pattern[pattern.length - 1] === '/') {
    re = new RegExp(pattern.substring(1, pattern.length - 1));
  } else {
    substr = pattern;
  }

  return {re: re, substr: substr};
}

/**
 * @param {string}          input
 * @param {PatternsForAttr} patterns
 * @returns {string}
 */
export default function main(input: string, patterns?: any): string {
  const isEmpty = patterns === void 0 || patterns === null || !Object.keys(patterns).length;
  if (isEmpty) {return input}

  const $ = cheerio.load(input);
  const selectors = Object.keys(patterns);

  lodash.forEach(selectors, (selector: string) => {
    const attrPatterns = patterns[selector].attr || {};
    const attrPatternsKeys = Object.keys(attrPatterns);

    $(selector).each((i: number, elm: any) => {
      console.log(elm.attribs);
      lodash.forEach(attrPatterns, (replace: string, rawPattern: string) => {
        lodash.forEach(elm.attribs, (value: string, attr: string) => {
          const pattern = regExpOrSubstr(rawPattern);
          const testRegExp = pattern.re || new RegExp(pattern.substr);

          if (testRegExp.test(attr)) {
            const replacedAttr = (pattern.re)
              ? attr.replace(pattern.re,     replace)
              : attr.replace(pattern.substr, replace);
            elm._cwHtmlconvReplaced         = elm._cwHtmlconvReplaced || {};
            elm._cwHtmlconvReplaced.attribs = elm._cwHtmlconvReplaced.attribs || {};
            elm._cwHtmlconvReplaced.attribs[replacedAttr] = elm.attribs[attr];
          }
        });
      });

      console.log('==========================================================================================');
    });
  });

  $('*').each((i: number, elm: any) => {
    if (!elm._cwHtmlconvReplaced) {return}
    if (elm._cwHtmlconvReplaced.attribs) {
      elm.attribs = elm._cwHtmlconvReplaced.attribs;
    }
  });

  return $.html();
}