/// <reference path="../typings/node/node.d.ts" />
/// <reference path="../typings/commandpost/commandpost.d.ts" />
import * as commandpost from 'commandpost';
import * as fs from 'fs';
import attrconv from './main';

interface RootOptions {
  encoding: string[];
  out: string[];
  patterns: string[];
  patternsText: string[];
  text: string[];
}

interface RootArgs {
  inputFile: string;
}

const pkg = require('../package.json');
const root = commandpost
  .create<RootOptions, RootArgs>('attrconv [inputFile]')
  .version(pkg.version, '-v, --version')
  .option('-o, --out [path]', 'Output to single file')
  .option('-p, --patterns [file]', 'JSON file of Definition for convert patterns')
  .option('-t, --text [html]', 'Raw HTML text that want to convert')
  .option('-v, --version', 'Print version')
  .option('--patterns-text [text]', 'JSON Definition for convert patterns')
  .action((opts, args, rest) => {
    // for Debug
    //console.log(opts, args, rest);

    const textPromise     = text(opts, args);
    const patternsPromise = patterns(opts);

    Promise.all([textPromise, patternsPromise])
      .then((values: any[]) => {
        return attrconv(values[0]/* text */, values[1]/* pattern */);
      })
      .then((out: string) => {
        if (!opts.out[0]) {
          process.stdout.write(out + '\n');
          return;
        }
        outputFile(opts.out[0], out);
      })
      .catch((err: any) => {
        process.stderr.write(err + '\n');
        process.exit(1);
      });
  });

commandpost
  .exec(root, process.argv)
  .catch((err: any) => {
    if (err instanceof Error) {
      console.error(err.stack);
    } else {
      console.error(err);
    }
    process.exit(1);
  });

/**
 * @param {RootOptions} opts
 * @param {RootArgs} args
 * @returns {Promise}
 */
function text(opts: RootOptions, args: RootArgs): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!args.inputFile && opts.text[0]) {
      resolve(opts.text[0]);
      return;
    }
    if (args.inputFile) {
      fs.readFile(args.inputPath, 'utf8', (err: any, data: string) => {
        if (err) {return reject(err)}
        resolve(data);
      });
      return;
    }
    reject(new Error('No input was given'));
  });
}

/**
 * @param {RootOptions} opts
 * @returns {Promise}
 */
function patterns(opts: RootOptions): Promise<any> {
  return new Promise((resolve, reject) => {
    if (opts.patterns && opts.patterns[0]) {
      let patternsPath = opts.patterns[0];
      fs.readFile(patternsPath, 'utf8', (err: any, data: string) => {
        if (err) {return reject(err)}
        resolve(JSON.parse(data));
      });
      return;
    }
    if (opts.patternsText && opts.patternsText[0]) {
      resolve(JSON.parse(opts.patternsText[0]));
      return;
    }
    resolve({});
  });
}

/**
 * @param {string} path
 * @param {string} data
 * @returns {void}
 */
function outputFile(path: string, data: string) {
  fs.writeFile(path, data, (err) => {
    if (err) {
      process.stderr.write(err + '\n');
      process.exit(1);
    }
  });
}