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

export default function main(input: string, allPatterns?: any): string {
  const isEmpty = allPatterns === void 0 || allPatterns === null || !Object.keys(allPatterns).length;
  if (isEmpty) {return input}

  const $ = cheerio.load(input);
  
  return $.html();
}