/// <reference path="../typings/node/node.d.ts" />
/// <reference path="../typings/commandpost/commandpost.d.ts" />
import * as commandpost from 'commandpost';
const pkg = require('../package.json');

const root = commandpost
  .create('attrconv [input]')
  .version(pkg.version, '-v, --version')
  .option('-o, --out [file]', 'Output to single file')
  .action((opts, args, rest) => {
    console.log(opts);
    console.log(args);
    console.log(rest);
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