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
    const outputTemp = (convertedAttrs)
      ? `<${tag} ${convertedAttrs}>`
      : `<${tag}>`;

    this.output += outputTemp.replace(/\s{2,}/, ' ').replace(/\s*>/, '>');
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
  attrKeys: string[];

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
    this.attrKeys = Object.keys(this.attrs);
    this.targets  = Object.keys(this.patterns);
  }

  /**
   * @param {*} attrs
   * @returns {string}
   */
  allAttributes(): string {
    if (!this.attrs) {return ''}

    let result = '';
    this.attrKeys.forEach((attr: string, i: number) => {
      const value      = this.attrs[attr];
      const converted  = this.convert(attr, value);
      const outputTemp = (() => {
        if (converted.attr === '')  {return ''}
        if (converted.value === '') {return converted.attr}
        return `${converted.attr}="${converted.value}"`;
      })();

      const isLast = this.attrKeys.length - 1 === i;
      result += (isLast) ? outputTemp : outputTemp + ' ';
    });

    return result;
  }

  /**
   * @param {string} attr
   * @param {string} value
   * @returns {{attr: string, value: string}}
   */
  convert(attr: string, value: string) {
    this.targets.forEach((target: string) => {
      const re = new RegExp(target);
      const want = this.patterns[target];

      if (typeName(want) === 'string' && re.test(attr)) {
        // If a type of the want is a string, only replacing an attribute.
        attr = attr.replace(re, want);
      }
      if (typeName(want) === 'Object' && re.test(attr)) {
        // If a type of the want is the object defined a convert method
        // converter will do the method
        const def: ConvertMethodDefinition = want;

        const alreadyApplied = this.applied.some(v => v === target);
        if (alreadyApplied) {
          // Clear attribute and value if already applied method
          attr = '';
          value = '';
          return;
        }

        if (def.method !== 'merge' && def.method !== 'split') {
          throw new Error('Invalid method');
        }

        if (def.method === 'merge') {
          value = this.mergeMultipleAttributes(def, re);
          this.applied.push(target);
        }
        if (def.method === 'split') {
          // noop
          // @TODO implement split
        }
        attr = attr.replace(re, def.newAttribute);
      }
      if (typeName(want) === 'Array' && re.test(attr)) {
        // If a type of the want is an array, attribute is replaced by the want[0]
        // the want[1] is the patterns used to replace for a value
        const originalAttr = attr;
        const patternsForValue: any = want[1];
        attr  = attr.replace(re, want[0]);
        value = this.convertValue(patternsForValue, originalAttr, value, re);
      }
    });

    return {attr: attr, value: value};
  }

  /**
   * @param {*}      patternsForValue
   * @param {string} attr
   * @param {string} value
   * @param {RegExp} reAttr - RegExp replacing for attribute
   * @returns {string}
   */
  convertValue(patternsForValue: any, attr: string, value: string, reAttr: RegExp): string {
    const targetsForValue = Object.keys(patternsForValue);

    targetsForValue.forEach((target: string) => {
      const re = new RegExp(target);
      if (!re.test(value)) {return value}
      const substr = patternsForValue[target];
      value = this.replaceWithAttributeMatch(attr, value, reAttr, re, substr);
    });
    return value;
  }

  /**
   * @param {string} attr
   * @param {string} value
   * @param {RegExp} reAttr
   * @param {RegExp} reValue
   * @param {string} substr
   * @returns {string}
   */
  replaceWithAttributeMatch(attr: string, value: string, reAttr: RegExp, reValue: RegExp, substr: string) {
    if (!/%\d/g.test(substr)) {
      return value.replace(reValue, substr);
    }
    // It use from attr matches, if the value substr is specified '%\d'
    const matches = attr.match(reAttr);
    value = value.replace(reValue, substr);
    if (typeName(matches) === 'null') {return value}

    matches.forEach((m, i) => {
      value = value.replace(new RegExp(`%${i}`), m);
    });
    return value;
  }

  /**
   * @param {ConvertMethodDefinition} def
   * @param {RegExp} reAttr
   * @returns {string}
   */
  mergeMultipleAttributes(def: ConvertMethodDefinition, reAttr: RegExp): string {
    let values: string[] = [];
    const reValue = new RegExp(def.valuePattern);
    const substr = def.newValue;
    this.attrKeys.forEach((attr: string) => {
      if (!reAttr.test(attr)) {return}
      const value = this.replaceWithAttributeMatch(attr, this.attrs[attr], reAttr, reValue, substr);
      values.push(value);
    });

    const stringValues = values.join(def.separator);
    return def.open + stringValues + def.close;
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
