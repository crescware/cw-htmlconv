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

type AttributeReplace = {replace: string; value?: {[pattern: string]: string}};
function replaceParam(rep: string|AttributeReplace): AttributeReplace {
  if (typeof rep === 'string') {
    return {replace: rep};
  }
  return <AttributeReplace>rep;
}

function cacheReplaced(elm: any, attr: string, value: string) {
  elm._cwHtmlconvReplaced         = elm._cwHtmlconvReplaced || {};
  elm._cwHtmlconvReplaced.attribs = elm._cwHtmlconvReplaced.attribs || {};
  elm._cwHtmlconvReplaced.attribs[attr] = value;
  return elm;
}

function convert(elm: any, patterns: {attr?: any; value?: any}, attr: string, value: string, cb?: (rep: AttributeReplace, attr: string) => void) {
  var target: string;
  var usePatterns: any;
  var cachingAttr: Function;
  var cachingValue: Function;

  if (patterns.attr) {
    target       = attr;
    usePatterns  = patterns.attr;
    cachingAttr  = (replaced: string) => replaced;
    cachingValue = (_: string) => value;
  } else if (!patterns.attr && patterns.value) {
    target       = value;
    usePatterns  = patterns.value;
    cachingAttr  = (_: string) => attr;
    cachingValue = (replaced: string) => replaced;
  } else {
    throw new Error('Invalid patterns');
  }

  lodash.forEach(usePatterns, (rawReplace: string|AttributeReplace, rawPattern: string) => {
    const rep        = replaceParam(rawReplace);
    const pattern    = regExpOrSubstr(rawPattern);
    const testRegExp = pattern.re || new RegExp(pattern.substr);

    if (testRegExp.test(target)) {
      const replaced = (pattern.re)
        ? target.replace(pattern.re,     rep.replace)
        : target.replace(pattern.substr, rep.replace);
      elm = cacheReplaced(elm, cachingAttr(replaced), cachingValue(replaced));

      cb(rep, cachingAttr(replaced));
    }
  });

  return elm;
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
      lodash.forEach(elm.attribs, (value: string, attr: string) => {
        elm = convert(elm, {attr: attrPatterns}, attr, value, (rep: AttributeReplace, attr: string) => {
          const valuePatterns = rep.value;
          if (valuePatterns) {
            elm = convert(elm, {value: valuePatterns}, attr, value, () => {/*noop*/});
          }
        });
      });
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