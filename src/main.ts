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

interface Patterns {
  [pattern: string]: string;
}

interface ReplaceParam {
  replace: string
}

interface AttributeReplaceParam extends ReplaceParam {
  value?: Patterns
}

interface PatternParam {
  re?: RegExp;
  substr?: string;
}

class Converter {
  replaceParam: ReplaceParam;
  pattern: PatternParam;
  target: string;

  /**
   * @constructor
   */
  constructor(
    public elm: CwHtmlconvExtended,
    public attr: string,
    public value: string,
    public convertCallback: Function,
    replaceParam: string|ReplaceParam,
    pattern: string
  ) {
    this.replaceParam = this.treatReplaceParam(replaceParam);
    this.pattern = this.treatPatternParam(pattern);

    this.initCache();
  }

  /**
   * @returns {void}
   */
  private initCache() {
    this.elm._cwHtmlconvProcessed                 = this.elm._cwHtmlconvProcessed || {};
    this.elm._cwHtmlconvProcessed.attribs         = this.elm._cwHtmlconvProcessed.attribs || {};
    this.elm._cwHtmlconvProcessed.alreadyReplaced = this.elm._cwHtmlconvProcessed.alreadyReplaced || {};
  }

  /**
   * @param {string|ReplaceParam} rep
   * @returns {ReplaceParam}
   */
  treatReplaceParam(rep: string|ReplaceParam): ReplaceParam {
    if (typeof rep === 'string') {
      return {replace: rep};
    }
    return <ReplaceParam>rep;
  }

  /**
   * @param {string} pattern
   * @returns {{re: RegExp, substr: string}}
   */
  treatPatternParam(pattern: string): PatternParam {
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
   * @returns {boolean}
   */
  private targetToMatchThePattern(): boolean {
    const re = this.pattern.re || new RegExp(this.pattern.substr);
    return re.test(this.target);
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

    const replaced = Converter.replace(this.target, this.pattern, this.replaceParam);
    this.cache(this.attrForCache(replaced), this.valueForCache(replaced));
    this.addReplacedPattern(this.target);

    this.updateProcessedAttribs();

    // Run replacement for value
    this.convertCallback(this.replaceParam, this.attrForCache(replaced));
    return this.elm;
  }

  /**
   * If it has been traversed already using another selector
   * the original attr is deleted after the replacement
   *
   * @returns {void}
   */
  private updateProcessedAttribs() {
    if (this.elm._cwHtmlconvProcessed.attribs[this.target]) {
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
   * @param {string}       original
   * @param {PatternParam} pattern
   * @param {ReplaceParam} rep
   * @returns {string}
   */
  static replace(original: string, pattern: PatternParam, rep: ReplaceParam): string {
    return (pattern.re)
      ? original.replace(pattern.re,     rep.replace)
      : original.replace(pattern.substr, rep.replace);
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
    public convertCallback: Function,
    replace: string|ReplaceParam,
    pattern: string
  ) {
    super(elm, attr, value, convertCallback, replace, pattern);
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
    public convertCallback: Function,
    replace: string|ReplaceParam,
    pattern: string
  ) {
    super(elm, attr, value, convertCallback, replace, pattern);
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
   * @param {*} attrPatterns
   * @returns {CwHtmlconvExtended}
   */
  traverse(attrPatterns: any): CwHtmlconvExtended {
    this.convertAttr(attrPatterns);
    return this.elm;
  }

  /**
   * @param {*} attrPatterns
   * @returns {void}
   */
  private convertAttr(attrPatterns: any) {
    const _Converter = AttributeConverter;
    const patterns   = {attr: attrPatterns};
    const cb = (replaceParam: AttributeReplaceParam, _attr: string) => this.convertValue(replaceParam, _attr);

    this.convert(_Converter, patterns, this.attr, cb);
  }

  /**
   * @param {AttributeReplaceParam} replaceParam
   * @param {string} attr
   * @returns {void}
   */
  private convertValue(replaceParam: AttributeReplaceParam, attr: string) {
    if (!replaceParam.value) {return}

    const _Converter = ValueConverter;
    const patterns   = {value: replaceParam.value};
    const cb = () => {/*noop*/};

    this.convert(_Converter, patterns, attr, cb);
  }

  /**
   * @param {*} patterns
   * @returns {*}
   */
  private pickPatterns(patterns: {attr?: any; value?: any}): any {
    if (patterns.attr) {
      return patterns.attr;
    }
    if (patterns.value) {
      return patterns.value;
    }

    throw new Error('Invalid patterns');
  }

  /**
   * @param {Function} _Converter
   * @param {*}        patterns
   * @param {string}   attr
   * @param {Function} cb
   * @returns {void}
   */
  private convert(_Converter: typeof Converter, patterns: {attr?: any; value?: any}, attr: string, cb?: (rep: AttributeReplaceParam, attr: string) => void) {
    lodash.forEach(this.pickPatterns(patterns), (rawReplace: string|ReplaceParam, rawPattern: string) => {
      const converter = new _Converter(this.elm, attr, this.value, cb, rawReplace, rawPattern);
      this.elm = converter.convert();
    });
  }
}

/**
 * @param {string} selector
 * @param {*} patterns
 * @returns {*}
 */
function pickAttrPatterns(selector: string, patterns: any): any {
  return patterns[selector].attr || {};
}

/**
 * @param {string}          input
 * @param {PatternsForAttr} allPatterns
 * @returns {string}
 */
export default function main(input: string, allPatterns?: any): string {
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

  $('*').each((i: number, elm: CwHtmlconvExtended) => {
    if (!elm._cwHtmlconvProcessed) {return}
    if (elm._cwHtmlconvProcessed.attribs) {
      elm.attribs = elm._cwHtmlconvProcessed.attribs;
    }
  });

  return $.html();
}