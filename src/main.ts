/// <reference path="../typings/es6-promise/es6-promise.d.ts" />
/// <reference path="../typings/cheerio/cheerio.d.ts" />
/// <reference path="../typings/htmlparser2/htmlparser2.d.ts" />
/// <reference path="../typings/lodash/lodash.d.ts" />
'use strict';
import {Promise} from 'es6-promise';
import * as htmlparser from 'htmlparser2';
import * as cheerio from 'cheerio';
import * as lodash from 'lodash';

interface CwHtmlconvExtended extends CheerioElement {
  _cwHtmlconvProcessed: {
    attribs?: {[attr: string]: string};
    alreadyReplaced?: {[target: string]: boolean};
  };
}

type Pattern = {re?: RegExp; substr?: string};

/**
 * @param {string} pattern
 * @returns {{re: RegExp, substr: string}}
 */
function regExpOrSubstr(pattern: string): Pattern {
  var re: RegExp;
  var substr = '';
  if (pattern[0] === '/' && pattern[pattern.length - 1] === '/') {
    re = new RegExp(pattern.substring(1, pattern.length - 1));
  } else {
    substr = pattern;
  }

  return {re: re, substr: substr};
}

type Patterns = {[pattern: string]: string};
interface ReplaceParam {
  replace: string
}

interface AttributeReplaceParam extends ReplaceParam {
  value?: Patterns
}

function replaceParam(rep: string|ReplaceParam): ReplaceParam {
  if (typeof rep === 'string') {
    return {replace: rep};
  }
  return <ReplaceParam>rep;
}

function cache(elm: CwHtmlconvExtended, attr: string, value: string) {
  elm._cwHtmlconvProcessed         = elm._cwHtmlconvProcessed || {};
  elm._cwHtmlconvProcessed.attribs = elm._cwHtmlconvProcessed.attribs || {};
  elm._cwHtmlconvProcessed.attribs[attr] = value;
  return elm;
}

function addProcessedPattern(elm: CwHtmlconvExtended, target: string) {
  elm._cwHtmlconvProcessed                 = elm._cwHtmlconvProcessed || {};
  elm._cwHtmlconvProcessed.alreadyReplaced = elm._cwHtmlconvProcessed.alreadyReplaced || {};
  elm._cwHtmlconvProcessed.alreadyReplaced[target] = true;
  return elm;
}

function replace(original: string, pattern: Pattern, rep: ReplaceParam) {
  return (pattern.re)
    ? original.replace(pattern.re,     rep.replace)
    : original.replace(pattern.substr, rep.replace);
}

function test(target: string, pattern: Pattern) {
  const testRegExp = pattern.re || new RegExp(pattern.substr);
  return testRegExp.test(target);
}

function convert(elm: CwHtmlconvExtended, patterns: {attr?: any; value?: any}, attr: string, value: string, cb?: (rep: ReplaceParam, attr: string) => void) {
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

  lodash.forEach(usePatterns, (rawReplace: string|ReplaceParam, rawPattern: string) => {
    const rep        = replaceParam(rawReplace);
    const pattern    = regExpOrSubstr(rawPattern);

    if (test(target, pattern)) {
      const replaced = replace(
        target,
        pattern,
        replaceParam(rawReplace)
      );
      elm = cache(elm, cachingAttr(replaced), cachingValue(replaced));
      elm = addProcessedPattern(elm, target);

      // If it has been traversed already using another selector
      // the original attr is deleted after the replacement
      if (elm._cwHtmlconvProcessed.attribs[target]) {
        delete elm._cwHtmlconvProcessed.attribs[target];
      }

      cb(rep, cachingAttr(replaced));
      return;
    }
    if (elm._cwHtmlconvProcessed && elm._cwHtmlconvProcessed.alreadyReplaced) {
      const already = elm._cwHtmlconvProcessed.alreadyReplaced[target];
      if (already) {return}
    }
    elm = cache(elm, attr, value);
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

    $(selector).each((i: number, elm: CwHtmlconvExtended) => {
      lodash.forEach(elm.attribs, (value: string, attr: string) => {
        elm = convert(elm, {attr: attrPatterns}, attr, value, (rep: AttributeReplaceParam, attr: string) => {
          const valuePatterns = rep.value;
          if (valuePatterns) {
            elm = convert(elm, {value: valuePatterns}, attr, value, () => {/*noop*/});
          }
        });
      });
    });
  });

  $('*').each((i: number, elm: CwHtmlconvExtended) => {
    if (!elm._cwHtmlconvProcessed) {return}
    if (elm._cwHtmlconvProcessed.attribs) {
      elm.attribs = elm._cwHtmlconvProcessed.attribs;
    }
  });

  return $.html();
}