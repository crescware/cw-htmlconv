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
  replace: string
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

type ConverterCallback = (rep: AttributeReplaceParam, attr: string, parentMatch: ParentMatch) => void;

class Converter {
  replaceParam: ReplaceParam;
  pattern: PatternParam;

  target: string;
  match: string[];

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
    public parentMatch?: ParentMatch
  ) {
    this.replaceParam = Converter.treatReplaceParam(replaceParam);
    this.pattern = Converter.treatPatternParam(pattern);

    this.initCache();
  }

  /**
   * @returns {void}
   */
  private initCache() {
    this.elm._cwHtmlconvProcessed                 = this.elm._cwHtmlconvProcessed || {};
    this.elm._cwHtmlconvProcessed.attribs         = this.elm._cwHtmlconvProcessed.attribs || {};
    this.elm._cwHtmlconvProcessed.alreadyReplaced = this.elm._cwHtmlconvProcessed.alreadyReplaced || {};
    this.elm._cwHtmlconvProcessed.emptyValueToken = this.elm._cwHtmlconvProcessed.emptyValueToken || {};
  }

  /**
   * @returns {RegExp}
   */
  private pickRegExp(): RegExp {
    return this.pattern.re || new RegExp(this.pattern.substr);
  }

  /**
   * @returns {boolean}
   */
  private targetToMatchThePattern(): boolean {
    const re = this.pickRegExp();
    if (!re.test(this.target)) {return false}

    this.match = this.target.match(re) || [];
    return true;
  }

  /**
   * @returns {CwHtmlconvExtended}
   */
  convert(): CwHtmlconvExtended {
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

    const replaced = Converter.replace(this.target, this.pattern, this.replaceParam, this.parentMatch);
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
    const reAttr = this.pickRegExp();
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
    const parentMatchSyntax = want.match(/%a(\d)/g);
    if (/*has*/parentMatchSyntax) {
      lodash.forEach(parentMatch.a, (match, i) => {
        want = want.replace(new RegExp(`%a${i}`, 'g'), match);
      });
    }

    return (pattern.re)
      ? original.replace(pattern.re,     want)
      : original.replace(pattern.substr, want);
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
    parentMatch?: ParentMatch
  ) {
    super(elm, attr, value, convertCallback, replace, pattern, parentMatch);
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
    parentMatch?: ParentMatch
  ) {
    super(elm, attr, value, convertCallback, replace, pattern, parentMatch);
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
    // noop
  }

  /**
   * @param {Patterns} attrPatterns
   * @returns {CwHtmlconvExtended}
   */
  traverse(attrPatterns: Patterns): CwHtmlconvExtended {
    this.convertAttr(attrPatterns);
    return this.elm;
  }

  /**
   * @param {Patterns} attrPatterns
   * @returns {void}
   */
  private convertAttr(attrPatterns: Patterns) {
    const _Converter = AttributeConverter;
    const cb: ConverterCallback = (replaceParam, _attr, parentMatch) => this.convertValue(replaceParam, _attr, parentMatch);

    this.convert(_Converter, attrPatterns, this.attr, cb);
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

    this.convert(_Converter, replaceParam.value, attr, cb, parentMatch);
  }

  /**
   * @param {Function} _Converter
   * @param {Patterns} patterns
   * @param {string}   attr
   * @param {Function} cb
   * @param {Array<string>} [parentMatch]
   * @returns {void}
   */
  private convert(_Converter: typeof Converter, patterns: Patterns, attr: string, cb: ConverterCallback, parentMatch?: ParentMatch) {
    lodash.forEach(patterns, (rawReplace: string|ReplaceParam, rawPattern: string) => {
      const converter = new _Converter(this.elm, attr, this.value, cb, rawReplace, rawPattern, parentMatch);
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
    $(selector).each((i: number, elm: CwHtmlconvExtended) => {
      if (!Object.keys(elm.attribs).length) {return}
      lodash.forEach(elm.attribs, (value: string, attr: string) => {
        const patterns = pickAttrPatterns(selector, allPatterns);
        const traverser = new Traverser(elm, attr, value);
        elm = traverser.traverse(patterns);
      });
    });
  });

  let forceEmpty: {[attr: string]: string} = {};
  $('*').each((i: number, elm: CwHtmlconvExtended) => {
    if (!elm._cwHtmlconvProcessed) {return}
    if (Object.keys(elm._cwHtmlconvProcessed.emptyValueToken).length) {
      lodash.forEach(elm._cwHtmlconvProcessed.emptyValueToken, (token, attr) => {
        forceEmpty[attr] = token;
      })
    }
    if (elm._cwHtmlconvProcessed.attribs) {
      elm.attribs = elm._cwHtmlconvProcessed.attribs;
    }
  });

  if (Object.keys(forceEmpty).length) {
    let output = $.html();
    lodash.forEach(forceEmpty, (token, attr) => {
      output = output.replace(`${attr}="${token}"`, attr);
    })
    return output;
  }

  return $.html();
}