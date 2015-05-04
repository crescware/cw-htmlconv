/// <reference path="../typings/es6-promise/es6-promise.d.ts" />
/// <reference path="../typings/cheerio/cheerio.d.ts" />
/// <reference path="../typings/css-select/css-select.d.ts" />
/// <reference path="../typings/lodash/lodash.d.ts" />
/// <reference path="../typings/string/string.d.ts" />
'use strict';
import {Promise} from 'es6-promise';
import * as cheerio from 'cheerio';
import * as cssSelect from 'css-select';
import * as S from 'string';

let EMPTY_DUMMY = '$cw$htmlconv$empty$dummy';

interface PatternObject {
  selector:      string;
  attrPattern?:  string;
  attrReplace?:  string;
  attrRemove?:   boolean;
  valuePattern?: string;
  valueReplace?: string;
  textPattern?:  string;
  textReplace?:  string;
  valueEmpty?:   boolean;
  method?: {
    behavior: string;
    open:     string;
    start:    string;
    end:      string;
  };
  manipulation?: Array<{
    type:   string;
    match:  number;
    filter: string;
  }>;
  subPatterns?: PatternObject[];
}

class Pattern {
  protected matcher: Function; // compiled selector
  protected valueEmpty: boolean;
  private attrRe: RegExp;
  private valueRe: RegExp;

  /**
   * @constructor
   */
  constructor(protected pattern: PatternObject) {
    this.valueEmpty = this.pattern.valueEmpty;

    if (this.valueEmpty === void 0 || this.valueEmpty === null) {
      this.valueEmpty = true;
    }
    this.valueEmpty = !!this.valueEmpty;

    this.matcher = cssSelect.compile(this.pattern.selector);
    this.attrRe  = new RegExp(this.pattern.attrPattern);
    this.valueRe = new RegExp(this.pattern.valuePattern);
  }

  /**
   * @abstract
   */
  process(element: CheerioElement): any {
    return void 0;
  }

  protected attrMatch(str: string): string[] {
    if (!this.pattern.attrPattern) {return null}
    return str.match(this.attrRe);
  }

  protected valueMatch(str: string): string[] {
    if (!this.pattern.valuePattern) {return null}
    return str.match(this.valueRe);
  }

  protected attrReplace(str: string): string {
    return str.replace(this.attrRe, this.pattern.attrReplace);
  }

  protected valueReplace(str: string): string {
    return str.replace(this.valueRe, this.pattern.valueReplace);
  }
}

class BasicPattern extends Pattern {
  /**
   * @constructor
   */
  constructor(pattern: PatternObject) {
    super(pattern);
  }

  /**
   * @param {CheerioElement} element
   * @returns {boolean}
   */
  private match(element: CheerioElement): boolean {
    return this.matcher(element);
  }

  /**
   * @param {CheerioElement} element
   * @returns {*}
   */
  process(element: CheerioElement): any {
    if (!this.match(element)) {return {}}

    const result: any = {attribs: {}};
    for (const attr in element.attribs) {
      const attribs: any = element.attribs;
      const value = attribs[attr];

      const attrMatching = this.attrMatch(attr);
      if (attrMatching) {
        const attrReplaced = this.attrReplace(attr);
        result.attribs[attr] = [];
        result.attribs[attr].push({key: attrReplaced});

        const valueMatching = this.valueMatch(value);
        if (valueMatching) {
          const valueReplaced = this.valueReplace(value);
          result.attribs[attr][0].value = valueReplaced;
        } else {
          result.attribs[attr][0].value = value;
        }

        if (result.attribs[attr][0].value === '' && this.valueEmpty) {
          result.attribs[attr][0].value = EMPTY_DUMMY;
        }
      }
    }

    return result;
  }
}

class MethodPattern extends Pattern {
  /**
   * @constructor
   */
  constructor(pattern: PatternObject) {
    super(pattern);
  }
}

class Converter {
  private subPatterns: Pattern[] = [];

  /**
   * @constructor
   */
  constructor(private patterns: Pattern[]) {
    // noop
  }

  /**
   * @param {CheerioStatic} $
   */
  convert($: CheerioStatic) {
    this.traverse($.root().toArray()[0]);
    if (this.subPatterns.length) {
      const subConverter =new Converter(this.subPatterns);
      subConverter.convert($);
    }
  }

  /**
   * @param {CheerioElement} element
   */
  private traverse(element: CheerioElement) {
    for (const child of element.children) {
      this.convertElement(child);
      if (child.type === 'tag') {this.traverse(child)}
    }
  }

  /**
   * @param {CheerioElement} element
   */
  private convertElement(element: CheerioElement) {
    const results = this.patterns.map(pattern => {
      return pattern.process(element);
    });

    results.forEach(result => {
      if (result.attribs) {
        Object.keys(result.attribs).forEach((attr) => {
          const attribs: any = element.attribs;
          delete attribs[attr];
          (<any>result.attribs)[attr].forEach((kv: any) => {
            attribs[kv.key] = kv.value;
          });
        });
      }
    });
  }
}

function generatePatterns(patterns: PatternObject[]) {
  return patterns.map(pattern => {
    if (pattern.method) {
      return new MethodPattern(pattern);
    }
    return new BasicPattern(pattern);
  });
}

export default function main(input: string, patterns?: PatternObject[]): string {
  const isEmpty = patterns === void 0 || patterns === null || !Object.keys(patterns).length;
  if (isEmpty) {return input}

  const $ = cheerio.load(input);

  const converter = new Converter(generatePatterns(patterns));
  converter.convert($);

  const output = $.html();
  return output.replace(`="${EMPTY_DUMMY}"`, '');
}