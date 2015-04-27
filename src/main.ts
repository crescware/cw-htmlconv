/// <reference path="../typings/es6-promise/es6-promise.d.ts" />
/// <reference path="../typings/cheerio/cheerio.d.ts" />
/// <reference path="../typings/htmlparser2/htmlparser2.d.ts" />
/// <reference path="../typings/lodash/lodash.d.ts" />
/// <reference path="../typings/string/string.d.ts" />
'use strict';
import {Promise} from 'es6-promise';
import * as htmlparser from 'htmlparser2';
import * as cheerio from 'cheerio';
import * as lodash from 'lodash';
import * as S from 'string';

interface CwHtmlconvExtended extends CheerioElement {
  _cwHtmlconvProcessed: {
    attribs?: {[attr: string]: string};
    alreadyReplaced?: {[target: string]: boolean};
    emptyValueToken?: {[attr: string]: string};
  };
}

interface AllPatterns {
  [selector: string]: {
    attr?: Patterns;
  }
}

interface Patterns {
  [pattern: string]: string|ReplaceParam;
}

interface ReplaceParam {
  replace: string;
  remove?: boolean;
  manipulation?: {
    [match: string]: string;
  };
}

interface AttributeReplaceParam extends ReplaceParam {
  value?: Patterns;
  emptyValue?: boolean;
}

interface AttributeReplaceMethodParam extends ReplaceParam {
  method: string;
}

interface AttributeMergeParam extends AttributeReplaceMethodParam {
  open:         string;
  close:        string;
  separator:    string;
  valuePattern: string;
  valueReplace: string;
}

interface PatternParam {
  re?: RegExp;
  substr?: string;
}

interface ParentMatch {
  a?: string[]; // attr match
  v?: string[]; // value match
}

interface ConverterOptions {
  parentMatch?: ParentMatch;
  selectorAttrRegExp?: string;
}

type ConverterCallback = (rep: AttributeReplaceParam, attr: string, parentMatch: ParentMatch) => void;

class Converter {
  replaceParam: ReplaceParam;
  pattern: PatternParam;

  target: string;
  match: string[];
  selectorAttrRegExp: RegExp;

  /**
   * @constructor
   */
  constructor(
    public elm: CwHtmlconvExtended,
    public attr: string,
    public value: string,
    public convertCallback: ConverterCallback,
    replaceParam: string|ReplaceParam,
    pattern: string,
    public options?: ConverterOptions
  ) {
    this.replaceParam = Converter.treatReplaceParam(replaceParam);
    this.pattern = Converter.treatPatternParam(pattern);

    this.initCache();
    this.initSelectorAttrRegExp();
  }

  /**
   * @returns {void}
   */
  private initCache() {
    if (!this.elm) {
      throw new Error('No element was given');
    }
    this.elm._cwHtmlconvProcessed                 = this.elm._cwHtmlconvProcessed || {};
    this.elm._cwHtmlconvProcessed.attribs         = this.elm._cwHtmlconvProcessed.attribs || {};
    this.elm._cwHtmlconvProcessed.alreadyReplaced = this.elm._cwHtmlconvProcessed.alreadyReplaced || {};
    this.elm._cwHtmlconvProcessed.emptyValueToken = this.elm._cwHtmlconvProcessed.emptyValueToken || {};
  }

  /**
   * @returns {void}
   */
  private initSelectorAttrRegExp() {
    if (this.options.selectorAttrRegExp) {
      this.selectorAttrRegExp = Converter.pickRegExp(Converter.treatPatternParam(this.options.selectorAttrRegExp));
      return;
    }
    this.selectorAttrRegExp = void 0;
  }

  /**
   * @returns {boolean}
   */
  private targetToMatchThePattern(): boolean {
    const re = Converter.pickRegExp(this.pattern);
    if (!re.test(this.target)) {return false}

    this.match = this.target.match(re) || [];
    return true;
  }

  /**
   * @returns {CwHtmlconvExtended}
   */
  convert(): CwHtmlconvExtended {
    if (this.selectorAttrRegExp) {
      const matched = lodash.some(Object.keys(this.elm.attribs), (attr: string) => {
        return this.selectorAttrRegExp.test(attr);
      });
      if (!matched) {return}
    }

    if (!this.targetToMatchThePattern()) {
      const already = this.elm._cwHtmlconvProcessed.alreadyReplaced[this.target];
      if (!already) {
        this.cache(this.attr, this.value);
      }
      return this.elm;
    }

    if (this.replaceParam.hasOwnProperty('method')) {
      if ((<AttributeReplaceMethodParam>this.replaceParam).method === 'merge') {
        this.merge();
        return this.elm;
      }
    }

    let replaced = '';
    try {
      replaced = Converter.replace(this.target, this.pattern, this.replaceParam, this.options.parentMatch);
    } catch (e) {
      if (this.replaceParam.remove) {
        // Remove from the already processed
        this.updateProcessedAttribs();
      }
      return;
    }

    this.cache(this.attrForCache(replaced), this.valueForCache(replaced));
    this.addReplacedPattern(this.target);
    this.updateProcessedAttribs();

    // Run replacement for value
    this.convertCallback(this.replaceParam, this.attrForCache(replaced), {a: this.match});
    return this.elm;
  }

  /**
   * @returns {void}
   */
  private merge() {
    const replaceParam = <AttributeMergeParam>this.replaceParam;
    const replacedAttr = Converter.replace(this.target, this.pattern, replaceParam);

    let values: string[] = [];
    const reAttr = Converter.pickRegExp(this.pattern);
    const patternParam = Converter.treatPatternParam(replaceParam.valuePattern);
    const replace = {replace: replaceParam.valueReplace};
    lodash.forEach(this.elm.attribs, (value: string, attr: string) => {
      if (!reAttr.test(attr)) {return}
      const parentMatch: ParentMatch = {a: attr.match(reAttr) || []};
      const replacedValue = Converter.replace(value, patternParam, replace, parentMatch);
      values.push(replacedValue);
    });

    const stringValues = values.join(replaceParam.separator);
    this.cache(this.attrForCache(replacedAttr), replaceParam.open + stringValues + replaceParam.close);
    this.addReplacedPattern(this.target);

    this.updateProcessedAttribs();
  }

  /**
   * If it has been traversed already using another selector
   * the original attr is deleted after the replacement
   *
   * @returns {void}
   */
  private updateProcessedAttribs() {
    const processed = this.elm._cwHtmlconvProcessed.attribs[this.target];
    if (processed !== void 0 && processed !== null) {
      delete this.elm._cwHtmlconvProcessed.attribs[this.target];
    }
  }

  /**
   * @param {string} attr
   * @param {string} value
   * @returns {void}
   */
  private cache(attr: string, value: string) {
    this.elm._cwHtmlconvProcessed.attribs[attr] = value;
  }

  /**
   * @param {string} target
   * @returns {void}
   */
  private addReplacedPattern(target: string) {
    this.elm._cwHtmlconvProcessed.alreadyReplaced[target] = true;
  }

  /**
   * @abstract
   */
  protected attrForCache(_: any): string {
    return '';
  }

  /**
   * @abstract
   */
  protected valueForCache(_: any): string {
    return '';
  }

  /**
   * @param {string|ReplaceParam} rep
   * @returns {ReplaceParam}
   */
  static treatReplaceParam(rep: string|ReplaceParam): ReplaceParam {
    if (typeof rep === 'string') {
      return {replace: rep};
    }
    return <ReplaceParam>rep;
  }

  /**
   * @param {string} pattern
   * @returns {{re: RegExp, substr: string}}
   */
  static treatPatternParam(pattern: string): PatternParam {
    if (!pattern) {
      return {re: void 0, substr: void 0}
    }

    let re: RegExp;
    let substr = '';
    if (pattern[0] === '/' && pattern[pattern.length - 1] === '/') {
      re = new RegExp(pattern.substring(1, pattern.length - 1));
    } else {
      substr = pattern;
    }

    return {re: re, substr: substr};
  }

  /**
   * @param {PatternParam} pattern
   * @returns {RegExp}
   */
  static pickRegExp(pattern: PatternParam): RegExp {
    return pattern.re || new RegExp(pattern.substr);
  }

  /**
   * @param {string}       original
   * @param {PatternParam} pattern
   * @param {ReplaceParam} rep
   * @param {ParentMatch}  [parentMatch]
   * @returns {string}
   */
  static replace(original: string, pattern: PatternParam, rep: ReplaceParam, parentMatch?: ParentMatch): string {
    if (parentMatch && !parentMatch.hasOwnProperty('a') && !parentMatch.hasOwnProperty('v')) {
      throw new Error('invalid parentMatch');
    }

    let want = rep.replace;
    if (!want) {
      throw new Error('rep.replace not defined');
    }

    const parentMatchSyntax = want.match(/%a(\d)/g);
    if (/*has*/parentMatchSyntax) {
      lodash.forEach(parentMatch.a, (match: string, i: number) => {
        if (rep.manipulation && Object.keys(rep.manipulation).length) {
          const behavior = rep.manipulation[`%a${i}`];
          match = Converter.manipulate(behavior, match);
        }
        want = want.replace(new RegExp(`%a${i}`, 'g'), match);
      });
    }

    return (pattern.re)
      ? original.replace(pattern.re,     want)
      : original.replace(pattern.substr, want);
  }

  /**
   * @param {string} behavior
   * @param {string} str
   * @returns {string}
   */
  static manipulate(behavior: string, str: string): string {
    if (behavior === 'camelize') {
      return S(str).camelize().s;
    }
    if (behavior === 'dasherize') {
      return S(str).dasherize().s;
    }
    return '';
  }
}

class AttributeConverter extends Converter {
  /**
   * @constructor
   */
  constructor(
    public elm: CwHtmlconvExtended,
    public attr: string,
    public value: string,
    public convertCallback: ConverterCallback,
    replace: string|ReplaceParam,
    pattern: string,
    options?: ConverterOptions
  ) {
    super(elm, attr, value, convertCallback, replace, pattern, options);
    this.target = this.attr;
  }

  /**
   * @param {string} replaced
   * @returns {string}
   */
  protected attrForCache(replaced: string): string {
    return replaced;
  }

  /**
   * @param {*} _ non-use
   * @returns {string}
   */
  protected valueForCache(_: any): string {
    return this.value;
  }
}

class ValueConverter extends Converter {
  /**
   * @constructor
   */
  constructor(
    public elm: CwHtmlconvExtended,
    public attr: string,
    public value: string,
    public convertCallback: ConverterCallback,
    replace: string|ReplaceParam,
    pattern: string,
    options?: ConverterOptions
  ) {
    super(elm, attr, value, convertCallback, replace, pattern, options);
    this.target = this.value;
  }

  /**
   * @param {*} _ non-use
   * @returns {string}
   */
  protected attrForCache(_: any): string {
    return this.attr;
  }

  /**
   * @param {string} replaced
   * @returns {string}
   */
  protected valueForCache(replaced: string): string {
    return replaced;
  }
}

class Traverser {
  /**
   * @constructor
   */
  constructor(
    public elm: CwHtmlconvExtended,
    public attr: string,
    public value: string
  ) {
    if (!this.elm) {
      throw new Error('element is undefined');
    }
  }

  /**
   * @param {Patterns} attrPatterns
   * @param {string}   selectorAttrRegExp
   * @returns {CwHtmlconvExtended}
   */
  traverse(attrPatterns: Patterns, selectorAttrRegExp: string): CwHtmlconvExtended {
    this.convertAttr(attrPatterns, selectorAttrRegExp);
    return this.elm;
  }

  /**
   * @param {Patterns} attrPatterns
   * @param {string}   selectorAttrRegExp
   * @returns {void}
   */
  private convertAttr(attrPatterns: Patterns, selectorAttrRegExp: string) {
    const _Converter = AttributeConverter;
    const cb: ConverterCallback = (replaceParam, _attr, parentMatch) => this.convertValue(replaceParam, _attr, parentMatch);

    const options = {
      selectorAttrRegExp: selectorAttrRegExp
    };
    this.convert(_Converter, attrPatterns, this.attr, cb, options);
  }

  /**
   * @param {AttributeReplaceParam} replaceParam
   * @param {string}   attr
   * @param {string[]} parentMatch
   * @returns {void}
   */
  private convertValue(replaceParam: AttributeReplaceParam, attr: string, parentMatch: ParentMatch) {
    if (replaceParam.emptyValue) {
      this.elm._cwHtmlconvProcessed.emptyValueToken[attr] = Math.random().toString(36).slice(-8);
      this.elm._cwHtmlconvProcessed.attribs[attr] = this.elm._cwHtmlconvProcessed.emptyValueToken[attr];
      return;
    }
    if (!replaceParam.value) {return}

    const _Converter = ValueConverter;
    const cb = () => {/*noop*/};

    const options = {
      parentMatch: parentMatch
    };
    this.convert(_Converter, replaceParam.value, attr, cb, options);
  }

  /**
   * @param {Function} _Converter
   * @param {Patterns} patterns
   * @param {string}   attr
   * @param {Function} cb
   * @param {*} [options]
   * @returns {void}
   */
  private convert(_Converter: typeof Converter, patterns: Patterns, attr: string, cb: ConverterCallback, options?: ConverterOptions) {
    lodash.forEach(patterns, (rawReplace: string|ReplaceParam, rawPattern: string) => {
      const converter = new _Converter(this.elm, attr, this.value, cb, rawReplace, rawPattern, options);
      this.elm = converter.convert();
    });
  }
}

/**
 * @param {string}      selector
 * @param {AllPatterns} allPatterns
 * @returns {Patterns}
 */
function pickAttrPatterns(selector: string, allPatterns: AllPatterns): Patterns {
  return allPatterns[selector].attr || {};
}

/**
 * @param {string}      input
 * @param {AllPatterns} allPatterns
 * @returns {string}
 */
export default function main(input: string, allPatterns?: AllPatterns): string {
  const isEmpty = allPatterns === void 0 || allPatterns === null || !Object.keys(allPatterns).length;
  if (isEmpty) {return input}

  const $ = cheerio.load(input);
  const selectors = Object.keys(allPatterns);

  lodash.forEach(selectors, (selector: string) => {
    let selectorAttrRegExp = '';
    let originalSelector: string = void 0;
    const selectorPattern = /^.*\[(\/.*\/)]/;
    if (selectorPattern.test(selector)) {
      originalSelector = selector;
      selector = selector.split('[')[0];
      selectorAttrRegExp = originalSelector.match(selectorPattern)[1];
    }

    $(selector).each((i: number, elm: CwHtmlconvExtended) => {
      if (!Object.keys(elm.attribs).length) {return}
      lodash.forEach(elm.attribs, (value: string, attr: string) => {
        const patterns = pickAttrPatterns(originalSelector || selector, allPatterns);
        if (!elm) {return}
        const traverser = new Traverser(elm, attr, value);
        elm = traverser.traverse(patterns, selectorAttrRegExp);
      });
    });
  });

  let forceEmpty: [string, string][] = [];
  $('*').each((i: number, elm: CwHtmlconvExtended) => {
    if (!elm._cwHtmlconvProcessed) {return}
    if (Object.keys(elm._cwHtmlconvProcessed.emptyValueToken).length) {
      lodash.forEach(elm._cwHtmlconvProcessed.emptyValueToken, (token: string, attr: string) => {
        forceEmpty.push([attr, token]);
      })
    }
    if (elm._cwHtmlconvProcessed.attribs) {
      elm.attribs = elm._cwHtmlconvProcessed.attribs;
    }
  });

  if (forceEmpty.length) {
    let output = $.html();
    lodash.forEach(forceEmpty, (v: [string, string]) => {
      output = output.replace(`${v[0]}="${v[1]}"`, v[0]);
    });
    return output;
  }

  return $.html();
}