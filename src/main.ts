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

interface PatternObject {
  selector:      string;
  attrPattern?:  string;
  attrReplace?:  string;
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
  /**
   * @constructor
   */
  constructor(public selector: string, public patterns: any) {
    // noop
  }

  /**
   * @param {CheerioElement} element
   * @returns {boolean}
   */
  private match(element: CheerioElement): boolean {
    return false;
  }

  /**
   * @param {CheerioElement} element
   * @returns {Pattern}
   */
  process(element: CheerioElement): Pattern {
    if (!this.match(element)) {return}
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
    this.patterns.forEach(pattern => {
      const subPattern = pattern.process(element);
      if (subPattern) {this.subPatterns.push(subPattern)}
    });
  }
}

function generatePatterns(allPatterns: any) {
  return Object.keys(allPatterns).map(selector => {
    return new Pattern(selector, allPatterns[selector]);
  });
}

export default function main(input: string, allPatterns?: any): string {
  const isEmpty = allPatterns === void 0 || allPatterns === null || !Object.keys(allPatterns).length;
  if (isEmpty) {return input}

  const $ = cheerio.load(input);

  const converter = new Converter(generatePatterns(allPatterns));
  converter.convert($);

  return $.html();
}