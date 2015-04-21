/// <reference path="../typings/es6-promise/es6-promise.d.ts" />
/// <reference path="../typings/htmlparser2/htmlparser2.d.ts" />
/// <reference path="../typings/type-name/type-name.d.ts" />
'use strict';
import {Promise} from 'es6-promise';
import * as htmlparser from 'htmlparser2';
import * as typeName from 'type-name';

interface ConvertMethodDefinition {
  method: string;
  newAttribute: string;
  open: string;
  close: string;
  separator: string;
  valuePattern: string;
  newValue: string;
}

class Builder {
  input:    string;
  output:   string;
  patterns: any;

  /**
   * @constructor
   */
  constructor(input: string, patterns?: any) {
    this.input   = input;
    this.output  = '';
    this.patterns = patterns || {};
  }

  /**
   * @returns {Promise<string>}
   */
  result(): Promise<string> {
    return new Promise((resolve, reject) => {
      const parser = new htmlparser.Parser({
        onopentag:    this.onOpenTag   .bind(this),
        ontext:       this.onText      .bind(this),
        onclosetag:   this.onCloseTag  .bind(this),
        oncomment:    this.onComment   .bind(this),
        oncommentend: this.onCommentEnd.bind(this),
        onerror: (err) => reject(err),
        onend:   ()    => resolve(this.output)
      }, {decodeEntities: true});
      parser.write(this.input);
      parser.end();
    });
  }

  /**
   * @param {string} tag
   * @param {*} attrs
   * @returns {void}
   */
  onOpenTag(tag: string, attrs: {[key: string]: string}) {
    const converter = new Converter(tag, attrs, this.patterns);
    const convertedAttrs = converter.allAttributes();

    this.output += (convertedAttrs)
      ? `<${tag} ${convertedAttrs}>`
      : `<${tag}>`;
  }

  /**
   * @param {string} text
   * @returns {void}
   */
  onText(text: string) {
    this.output += text;
  }

  /**
   * @param {string} tag
   * @returns {void}
   */
  onCloseTag(tag: string) {
    const isVoidElements = this.voidElements().some(v => v === tag);
    if (isVoidElements) {return}
    this.output += `</${tag}>`;
  }

  /**
   * @param {string} text
   * @returns {void}
   */
  onComment(text: string) {
    this.output += `<!--${text}`;
  }

  /**
   * @returns {void}
   */
  onCommentEnd() {
    this.output += `-->`;
  }

  /**
   * Return a string array include the void elements in HTML 5
   * @see http://www.w3.org/TR/html-markup/syntax.html#void-element
   * @returns {string[]}
   */
  voidElements() {
    return 'area, base, br, col, command, embed, hr, img, input, keygen, link, meta, param, source, track, wbr'.split(', ');
  }
}

class Converter {
  tag: string;

  /**
   * attrs type example
   * {
   *   src: 'image.jpg',
   *   alt: 'Alternative',
   *   width: '42',
   *   height: '42'
   * }
   */
  attrs: any;

  patterns: any;
  targets: string[];
  applied: string[];

  /**
   * @constructor
   */
  constructor(tag: string, attrs: any, patterns: any) {
    this.tag = tag;
    this.attrs = attrs;
    this.patterns = patterns;
    this.applied = [];

    // Caches
    this.targets = Object.keys(this.patterns);
  }

  /**
   * @param {*} attrs
   * @returns {string}
   */
  allAttributes(): string {
    if (!this.attrs) {return ''}

    let result = '';
    const attrKeys = Object.keys(this.attrs);
    attrKeys.forEach((attr: string, i: number) => {
      const value = this.attrs[attr];
      const converted = this.convert(attr, value);
      const outputTemp = `${converted.attr}="${converted.value}"`;
      result += (attrKeys.length - 1 === i) ? outputTemp : outputTemp + ' ';
    });
    return result;
  }

  /**
   * @param {string}   attr
   * @param {string}   value
   * @returns {{attr: string, value: string}}
   */
  convert(attr: string, value: string) {
    this.targets.forEach((regexp: string) => {
      const reAttr = new RegExp(regexp);
      const after = this.patterns[regexp];

      if (typeName(after) === 'string' && reAttr.test(attr)) {
        // If after is a string, replacing attr only
        const substr = after;
        attr = attr.replace(reAttr, substr);
      }
      if (typeName(after) === 'Object' && reAttr.test(attr)) {
        // If after is the object defined a convert method
        // converter will do the method
        const def: ConvertMethodDefinition = after;

        const alreadyApplied = this.applied.some(v => v === regexp);
        if (alreadyApplied) {return}

        if (def.method !== 'merge' || def.method !== 'split') {
          throw new Error('Invalid method');
        }

        const substr = def.newAttribute;
        attr = attr.replace(reAttr, substr);
        if (def.method === 'merge') {
          value = this.mergeMultipleAttributes();
          this.applied.push(regexp);
        }
        if (def.method === 'split') {
          // noop
        }
      }
      if (typeName(after) === 'Array' && reAttr.test(attr)) {
        // If after is an array, attr is replaced by after[0]
        // after[1] is used to replace pattern for a value
        const substr = after[0];
        const originalAttr = attr;
        attr = attr.replace(reAttr, substr);

        const convertPatternsForValue: any = after[1];
        value = this.convertValue(convertPatternsForValue, originalAttr, value, reAttr);
      }
    });

    return {attr: attr, value: value};
  }

  /**
   * @param {*}      convertPatternsForValue
   * @param {string} attr
   * @param {string} value
   * @param {RegExp} reAttr
   * @returns {string}
   */
  convertValue(convertPatternsForValue: any, attr: string, value: string, reAttr: RegExp): string {
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
   * @returns {string}
   */
  mergeMultipleAttributes(): string {
    return '';
  }
}

/**
 * @param {string} input
 * @param {*}      pattern
 * @returns {Promise<string>}
 */
export default function main(input: string, pattern?: any): Promise<string> {
  const builder = new Builder(input, pattern);
  return builder.result();
}
