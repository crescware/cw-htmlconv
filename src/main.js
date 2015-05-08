'use strict';
import {Promise} from 'es6-promise';
import * as cheerio from 'cheerio';
import * as cssSelect from 'css-select';
import * as S from 'string';

let EMPTY_DUMMY = '$cw$htmlconv$empty$dummy';

class Pattern {
  pattern;

  matcher; // compiled selector
  valueEmpty; // convenience

  attrRe;
  valueRe;

  /**
   * @constructor
   * @param {PatternObject} pattern
   */
  constructor(pattern) {
    this.pattern = pattern;
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
  process(element) {
    return void 0;
  }

  /**
   * @param {string} str
   * @returns {Array<string>}
   */
  attrMatch(str) {
    if (!this.pattern.attrPattern) {return null}
    return str.match(this.attrRe);
  }

  /**
   * @param {string} str
   * @returns {Array<string>}
   */
  valueMatch(str) {
    if (!this.pattern.valuePattern) {return null}
    return str.match(this.valueRe);
  }

  /**
   * @param {string} str
   * @returns {string}
   */
  attrReplace(str) {
    return str.replace(this.attrRe, this.pattern.attrReplace);
  }

  /**
   * @param {string} str
   * @returns {string}
   */
  valueReplace(str) {
    return str.replace(this.valueRe, this.pattern.valueReplace);
  }
}

class BasicPattern extends Pattern {
  /**
   * @constructor
   * @param {PatternObject} pattern
   */
  constructor(pattern) {
    super(pattern);
  }

  /**
   * @private
   * @param {CheerioElement} element
   * @returns {boolean}
   */
  match(element) {
    return this.matcher(element);
  }

  /**
   * @param {CheerioElement} element
   * @returns {*} result object
   */
  process(element) {
    if (!this.match(element)) {return {}}

    const result = {attribs: {}};
    for (let attr in element.attribs) {
      const attribs = element.attribs;
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
   * @param {PatternObject} pattern
   */
  constructor(pattern) {
    super(pattern);
  }
}

class Converter {
  patterns;
  subPatterns;

  /**
   * @constructor
   * @param {Array<Pattern>} patterns
   */
  constructor(patterns) {
    this.patterns = patterns;
    this.subPatterns = [];
  }

  /**
   * @param {CheerioStatic} $
   * @returns {void}
   */
  convert($) {
    this.traverse($.root().toArray()[0]);
    if (this.subPatterns.length) {
      const subConverter = new Converter(this.subPatterns);
      subConverter.convert($);
    }
  }

  /**
   * @param {CheerioElement} element
   * @returns {void}
   */
  traverse(element) {
    for (const child of element.children) {
      this.convertElement(child);
      if (child.type === 'tag') {this.traverse(child)}
    }
  }

  /**
   * @private
   * @param {CheerioElement} element
   * @returns {void}
   */
  _convertElement(element) {
    const results = this.patterns.map(pattern => {
      return pattern.process(element);
    });

    results.forEach(result => {
      if (result.attribs) {
        Object.keys(result.attribs).forEach((attr) => {
          const attribs = element.attribs;
          delete attribs[attr];
          result.attribs[attr].forEach((kv) => {
            attribs[kv.key] = kv.value;
          });
        });
      }
    });
  }
}

/**
 * @param {Array<PatternObject>} patterns
 * @returns {Array<Pattern>}
 */
function generatePatterns(patterns) {
  return patterns.map(pattern => {
    if (pattern.method) {
      return new MethodPattern(pattern);
    }
    return new BasicPattern(pattern);
  });
}

/**
 * @param {string} input
 * @param {Array<PatternObject>} [patterns]
 * @returns string
 */
export default function main(input, patterns) {
  const isEmpty = patterns === void 0 || patterns === null || patterns.length < 1;
  if (isEmpty) {return input}

  const $ = cheerio.load(input);

  const converter = new Converter(generatePatterns(patterns));
  converter.convert($);

  const output = $.html();
  return output.replace(`="${EMPTY_DUMMY}"`, '');
}
