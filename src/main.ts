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
  }

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

  test() {
    const testRegExp = this.pattern.re || new RegExp(this.pattern.substr);
    return testRegExp.test(this.target);
  }

  convert(): CwHtmlconvExtended {
    if (this.test()) {
      const replaced = this.replace(this.target, this.pattern, this.replaceParam);
      this.elm = this.cache(this.elm, this.cachingAttr(replaced), this.cachingValue(replaced));
      this.elm = this.addProcessedPattern(this.elm, this.target);

      // If it has been traversed already using another selector
      // the original attr is deleted after the replacement
      if (this.elm._cwHtmlconvProcessed.attribs[this.target]) {
        delete this.elm._cwHtmlconvProcessed.attribs[this.target];
      }

      this.convertCallback(this.replaceParam, this.cachingAttr(replaced));
      return this.elm;
    }
    if (this.elm._cwHtmlconvProcessed && this.elm._cwHtmlconvProcessed.alreadyReplaced) {
      const already = this.elm._cwHtmlconvProcessed.alreadyReplaced[this.target];
      if (already) {return this.elm}
    }
    this.elm = this.cache(this.elm, this.attr, this.value);
    return this.elm;
  }

  private cache(elm: CwHtmlconvExtended, attr: string, value: string) {
    elm._cwHtmlconvProcessed         = elm._cwHtmlconvProcessed || {};
    elm._cwHtmlconvProcessed.attribs = elm._cwHtmlconvProcessed.attribs || {};
    elm._cwHtmlconvProcessed.attribs[attr] = value;
    return elm;
  }

  private addProcessedPattern(elm: CwHtmlconvExtended, target: string) {
    elm._cwHtmlconvProcessed                 = elm._cwHtmlconvProcessed || {};
    elm._cwHtmlconvProcessed.alreadyReplaced = elm._cwHtmlconvProcessed.alreadyReplaced || {};
    elm._cwHtmlconvProcessed.alreadyReplaced[target] = true;
    return elm;
  }

  private replace(original: string, pattern: PatternParam, rep: ReplaceParam) {
    return (pattern.re)
      ? original.replace(pattern.re,     rep.replace)
      : original.replace(pattern.substr, rep.replace);
  }

  /**
   * @abstract
   */
  cachingAttr(_: any): string {
    return '';
  }

  /**
   * @abstract
   */
  cachingValue(_: any): string {
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
    public convertCallback: Function,
    replace: string|ReplaceParam,
    pattern: string
  ) {
    super(elm, attr, value, convertCallback, replace, pattern);
    this.target = this.attr;
  }

  cachingAttr(replaced: string): string {
    return replaced;
  }

  cachingValue(_: any): string {
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

  cachingAttr(_: any): string {
    return this.attr;
  }

  cachingValue(replaced: string): string {
    return replaced;
  }
}

class Traverser {
  /**
   * @constructor
   */
  constructor(
    public elm: CwHtmlconvExtended,
    public attrPatterns: any,
    public attr: string,
    public value: string
  ) {
    // noop
  }

  traverse(): CwHtmlconvExtended {
    this.elm = this.convert(this.elm, AttributeConverter, {attr: this.attrPatterns}, this.attr, (rep: AttributeReplaceParam, _attr: string) => {
      const valuePatterns = rep.value;
      if (valuePatterns) {
        this.elm = this.convert(this.elm, ValueConverter, {value: valuePatterns}, _attr, () => {/*noop*/});
      }
    });

    return this.elm;
  }

  private convert(elm: CwHtmlconvExtended, _Converter: typeof Converter, patterns: {attr?: any; value?: any}, attr: string, cb?: (rep: ReplaceParam, attr: string) => void) {
    var target: string;
    var usePatterns: any;

    if (patterns.attr) {
      usePatterns  = patterns.attr;
    } else if (!patterns.attr && patterns.value) {
      usePatterns  = patterns.value;
    } else {
      throw new Error('Invalid patterns');
    }

    lodash.forEach(usePatterns, (rawReplace: string|ReplaceParam, rawPattern: string) => {
      const converter = new _Converter(elm, attr, this.value, cb, rawReplace, rawPattern);
      elm = converter.convert();
    });

    return elm;
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
        const traverser = new Traverser(elm, patterns, attr, value);
        elm = traverser.traverse();
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