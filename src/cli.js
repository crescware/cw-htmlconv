'use strict';
/*eslint-disable no-console */
import * as commander from 'commander';
import * as fs from 'fs';
import htmlconv from './main';
const pkg = require('../package.json');

/**
 * @param {cli.RootOpts} opts
 * @param {cli.RootArgs} args
 * @returns {Promise}
 */
function text(opts, args) {
  return new Promise((resolve, reject) => {
    if (!args.inputPath && opts.text[0]) {
      resolve(opts.text[0]);
      return;
    }
    if (args.inputPath) {
      fs.readFile(args.inputPath, 'utf8', (err, data) => {
        if (err) { return reject(err); }
        resolve(data);
      });
      return;
    }
    reject(new Error('No input was given'));
  });
}

/**
 * @param opts
 * @returns {Promise}
 */
function patterns(opts) {
  return new Promise((resolve, reject) => {
    if (opts.patterns && opts.patterns[0]) {
      let patternsPath = opts.patterns[0];
      fs.readFile(patternsPath, 'utf8', (err, data) => {
        if (err) { return reject(err); }
        let json = '';
        try {
          json = JSON.parse(data);
        } catch (e) {
          if (e instanceof SyntaxError) {
            return reject(new SyntaxError(`${patternsPath} is invalid syntax`));
          }
          return reject(e);
        }
        resolve(json);
      });
      return;
    }
    if (opts.patternsText && opts.patternsText[0]) {
      let json = '';
      try {
        json = JSON.parse(opts.patternsText[0]);
      } catch (e) {
        if (e instanceof SyntaxError) {
          reject(new SyntaxError('Unexpected syntax was given to --patterns-text'));
          return;
        }
        reject(e);
        return;
      }
      resolve(json);
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
function outputFile(path, data) {
  fs.writeFile(path, data, (err) => {
    if (err) {
      process.stderr.write(err + '\n');
      throw new Error(err);
    }
  });
}

const root = commander
  .create('cw-htmlconv [inputPath]')
  .version(pkg.version, '-v, --version')
  .option('-o, --out [path]', 'Output to single file')
  .option('-p, --patterns [path]', 'JSON file of Definition for convert patterns')
  .option('-t, --text [html]', 'Raw HTML text that want to convert')
  .option('-v, --version', 'Print version')
  .option('--patterns-text [text]', 'JSON Definition for convert patterns')
  .action((opts, args) => {
    // for Debug
    //console.log(opts, args);

    const textPromise     = text(opts, args);
    const patternsPromise = patterns(opts);

    Promise.all([textPromise, patternsPromise])
      .then((values) => {
        return htmlconv(/* text */values[0], /* pattern */values[1]);
      })
      .then((out) => {
        if (!opts.out[0]) {
          process.stdout.write(out + '\n');
          return;
        }
        outputFile(opts.out[0], out);
      })
      .catch((err) => {
        console.error(err.stack);
      });
  });

commander
  .exec(root, process.argv)
  .catch((err)=> {
    if (err instanceof Error) {
      console.error(err.stack);
      throw err;
    }
    console.error(err);
    throw new Error(err);
  });
