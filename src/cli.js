'use strict';
import * as commander from 'commander';
import * as fs from 'fs';
import htmlconv from './main';
const pkg = require('../package.json');

const root = commander
  .create('cw-htmlconv [inputPath]')
  .version(pkg.version, '-v, --version')
  .option('-o, --out [path]', 'Output to single file')
  .option('-p, --patterns [path]', 'JSON file of Definition for convert patterns')
  .option('-t, --text [html]', 'Raw HTML text that want to convert')
  .option('-v, --version', 'Print version')
  .option('--patterns-text [text]', 'JSON Definition for convert patterns')
  .action((opts, args, rest) => {
    // for Debug
    //console.log(opts, args, rest);

    const textPromise     = text(opts, args);
    const patternsPromise = patterns(opts);

    Promise.all([textPromise, patternsPromise])
      .then((values) => {
        return htmlconv(values[0]/* text */, values[1]/* pattern */);
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
  .catch((err) => {
    if (err instanceof Error) {
      console.error(err.stack);
    } else {
      console.error(err);
    }
    process.exit(1);
  });

/**
 * @param opts
 * @param args
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
        if (err) {return reject(err)}
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
        if (err) {return reject(err)}
        var json = '';
        try {
          json = JSON.parse(data);
        } catch (e) {
          if (e instanceof SyntaxError) {
            return reject(new SyntaxError(`${patternsPath} is invalid syntax`));
          } else {
            return reject(e);
          }
        }
        resolve(json);
      });
      return;
    }
    if (opts.patternsText && opts.patternsText[0]) {
      var json = '';
      try {
        json = JSON.parse(opts.patternsText[0]);
      } catch (e) {
        if (e instanceof SyntaxError) {
          return reject(new SyntaxError('Unexpected syntax was given to --patterns-text'));
        } else {
          return reject(e);
        }
      }
      return resolve(json);
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
      process.exit(1);
    }
  });
}