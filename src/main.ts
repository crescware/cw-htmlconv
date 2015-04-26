/// <reference path="../typings/es6-promise/es6-promise.d.ts" />
/// <reference path="../typings/htmlparser2/htmlparser2.d.ts" />
'use strict';
import {Promise} from 'es6-promise';
import * as htmlparser from 'htmlparser2';

interface ConvertMethodDefinition {
  method: string;
  newAttribute: string;
  open: string;
  close: string;
  separator: string;
  valuePattern: string;
  newValue: string;
}

type PatternsForValue = {[pattern: string]: string};
type PatternsForAttr = {[pattern: string]: string|[string, PatternsForValue]|ConvertMethodDefinition};
type Attrs = {[key: string]: string};

/**
 * @param {string}          input
 * @param {PatternsForAttr} patterns
 * @returns {Promise<string>}
 */
export default function main(input: string, patterns?: PatternsForAttr): Promise<string> {
  const doc = htmlparser.parseDOM(input);
  console.log(doc);
  return Promise.resolve('');
}