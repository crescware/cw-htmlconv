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

function convert(elm: any, patterns: any, attr: string, value: string) {
  lodash.forEach(patterns, (rawReplace: string|AttributeReplace, rawPattern: string) => {
    const valueRep        = replaceParam(rawReplace);
    const valuePattern    = regExpOrSubstr(rawPattern);
    const valueTestRegExp = valuePattern.re || new RegExp(valuePattern.substr);
    if (valueTestRegExp.test(value)) {
      const replacedValue = (valuePattern.re)
        ? value.replace(valuePattern.re,     valueRep.replace)
        : value.replace(valuePattern.substr, valueRep.replace);
      elm = cacheReplaced(elm, attr, replacedValue);
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
      console.log(elm.attribs);
      lodash.forEach(elm.attribs, (value: string, attr: string) => {
        lodash.forEach(attrPatterns, (rawReplace: string|AttributeReplace, rawPattern: string) => {
          const attrRep        = replaceParam(rawReplace);
          const attrPattern    = regExpOrSubstr(rawPattern);
          const attrTestRegExp = attrPattern.re || new RegExp(attrPattern.substr);

          if (attrTestRegExp.test(attr)) {
            const value = elm.attribs[attr];
            const replacedAttr = (attrPattern.re)
              ? attr.replace(attrPattern.re,     attrRep.replace)
              : attr.replace(attrPattern.substr, attrRep.replace);
            elm = cacheReplaced(elm, replacedAttr, value);

            const valuePatterns = attrRep.value;
            if (valuePatterns) {
              elm = convert(elm, valuePatterns, replacedAttr, value);
            }
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

  console.log('return ==========================================================================================');
  return $.html();
}