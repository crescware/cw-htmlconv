/// <reference path="../es6-promise/es6-promise.d.ts" />

declare module cwHtmlconv {
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

  /**
   * @param {string}          input
   * @param {PatternsForAttr} patterns
   * @returns {Promise<string>}
   */
  export default function main(input: string, patterns?: PatternsForAttr): Promise<string>;
}

declare module 'cw-htmlconv' {
  export = cwHtmlconv;
}
