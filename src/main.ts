/// <reference path="../typings/es6-promise/es6-promise.d.ts" />
/// <reference path="../typings/htmlparser2/htmlparser2.d.ts" />
'use strict';
import {Promise} from 'es6-promise';
import * as htmlparser from 'htmlparser2';

let output: string;
let convertPatterns: any;

/**
 * @param {string} input
 * @param {*}      pattern
 * @returns {Promise<string>}
 */
export default function main(input: string, pattern: any): Promise<string> {
  convertPatterns = pattern || {};
  output = '';
  return new Promise((resolve, reject) => {
    const parser = new htmlparser.Parser({
      onopentag: onopentag,
      ontext: ontext,
      onclosetag: onclosetag,
      oncomment: oncomment,
      oncommentend: oncommentend,
      onerror: (err) => {throw err},
      onend: () => resolve(output)
    }, {decodeEntities: true});
    parser.write(input);
    parser.end();
  });
}

/**
 * @param {string} tag
 * @param {*} attrs
 * @returns {void}
 */
function onopentag(tag: string, attrs: any) {
  const convertedAttrs = ((attrs_: any) => {
    if (!attrs_) {return ''}

    const regexpsForAttr = Object.keys(convertPatterns);
    let result = '';
    Object.keys(attrs_).forEach((attr: string, i: number) => {
      const value = attrs_[attr];
      const converted = convert(regexpsForAttr, attr, value);
      const outputTemp = `${converted.attr}="${converted.value}"`;
      result += (Object.keys(attrs_).length - 1 === i) ? outputTemp : outputTemp + ' ';
    });
    return result;
  })(attrs);

  output += (convertedAttrs)
    ? `<${tag} ${convertedAttrs}>`
    : `<${tag}>`;
}

function convert(regexpsForAttr: string[], attr: string, value: string) {
  regexpsForAttr.forEach((regexp: string) => {
    const reAttr = new RegExp(regexp);
    const after = convertPatterns[regexp];

    if (typeof after === 'string' && reAttr.test(attr)) {
      // If after is a string, replacing attr only
      let substr = after;
      attr = attr.replace(reAttr, substr);

    } else if (Array.isArray(after) && reAttr.test(attr)) {
      // If after is an array, attr is replaced by after[0]
      // after[1] is used to replace pattern for a value
      const substr = after[0];
      const originalAttr = attr;
      attr = attr.replace(reAttr, substr);

      const convertPatternsForValue: any = after[1];
      value = convertValue(convertPatternsForValue, originalAttr, value, reAttr);
    }
  });

  return {attr: attr, value: value};
}

function convertValue(convertPatternsForValue: any, attr: string, value: string, reAttr: RegExp): string {
  const regexpsForValue = Object.keys(convertPatternsForValue);
  regexpsForValue.forEach((regexp: string) => {
    const reValue = new RegExp(regexp);
    const substr = convertPatternsForValue[regexp];

    if (reValue.test(value)) {
      value = (() => {
        if (!/%\d/g.test(substr)) {
          return value.replace(reValue, substr);
        }
        // It use from attr matches, if the value substr is specified '%\d'
        const matches = attr.match(reAttr);
        value = value.replace(reValue, substr);
        matches.forEach((m, i) => {
          value = value.replace(new RegExp(`%${i}`), m);
        });
        return value;
      })();
    }
  });
  return value;
}

/**
 * @param {string} text
 * @returns {void}
 */
function ontext(text: string) {
  output += text;
}

/**
 * @param {string} tag
 * @returns {void}
 */
function onclosetag(tag: string) {
  const isVoidElements = voidElements().some(v => v === tag);
  if (isVoidElements) {return}
  output += `</${tag}>`;
}

/**
 * @param {string} text
 * @returns {void}
 */
function oncomment(text: string) {
  output += `<!--${text}`;
}

/**
 * @returns {void}
 */
function oncommentend() {
  output += `-->`;
}

/**
 * Return a string array include the void elements in HTML 5
 * @see http://www.w3.org/TR/html-markup/syntax.html#void-element
 * @returns {string[]}
 */
function voidElements() {
  return 'area, base, br, col, command, embed, hr, img, input, keygen, link, meta, param, source, track, wbr'.split(', ');
}